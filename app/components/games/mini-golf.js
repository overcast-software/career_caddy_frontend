import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';

const W = 256;
const H = 192;
const BALL_R = 2.5;
const HOLE_R = 5;
const MAX_POWER = 6.5;
const CHARGE_MS = 900;
const FRICTION_FAIRWAY = 0.965;
const FRICTION_ROUGH = 0.9;
const FRICTION_SAND = 0.8;
const REST_V = 0.06;
const WALL_BOUNCE = 0.55;
const TOTAL_HOLES = 3;

const COLORS = {
  rough: '#1a3a24',
  fairway: '#2e7a3f',
  fairwayDark: '#276835',
  sand: '#d9b26b',
  sandDark: '#b89355',
  wall: '#3a2818',
  wallTop: '#5a3d26',
  ball: '#f5f5f0',
  ballShadow: '#888',
  hole: '#050505',
  pole: '#c8c8c8',
  flag: '#e54b3b',
  aim: 'rgba(255,255,255,0.55)',
  powerFill: '#ffd24a',
  powerBack: 'rgba(0,0,0,0.5)',
};

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function rectsOverlap(a, b, pad = 0) {
  return (
    a.x < b.x + b.w + pad &&
    a.x + a.w + pad > b.x &&
    a.y < b.y + b.h + pad &&
    a.y + a.h + pad > b.y
  );
}

function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function generateHole(seed) {
  const fairway = { x: 18, y: 28, w: W - 36, h: H - 56 };
  const ball = {
    x: fairway.x + 18,
    y: rand(fairway.y + 16, fairway.y + fairway.h - 16),
  };
  const hole = {
    x: fairway.x + fairway.w - 16,
    y: rand(fairway.y + 16, fairway.y + fairway.h - 16),
  };
  const walls = [];
  const wallCount = Math.min(1 + seed, 3);
  let attempts = 0;
  while (walls.length < wallCount && attempts < 40) {
    attempts += 1;
    const horizontal = Math.random() < 0.5;
    const w = horizontal ? randInt(28, 60) : randInt(6, 10);
    const h = horizontal ? randInt(6, 10) : randInt(28, 60);
    const candidate = {
      x: randInt(fairway.x + 28, fairway.x + fairway.w - w - 28),
      y: randInt(fairway.y + 10, fairway.y + fairway.h - h - 10),
      w,
      h,
    };
    if (
      rectsOverlap(
        candidate,
        { x: ball.x - 10, y: ball.y - 10, w: 20, h: 20 },
        2,
      ) ||
      rectsOverlap(
        candidate,
        { x: hole.x - 10, y: hole.y - 10, w: 20, h: 20 },
        2,
      ) ||
      walls.some((w2) => rectsOverlap(candidate, w2, 4))
    ) {
      continue;
    }
    walls.push(candidate);
  }
  const sands = [];
  const sandCount = randInt(0, 2);
  attempts = 0;
  while (sands.length < sandCount && attempts < 20) {
    attempts += 1;
    const candidate = {
      x: randInt(fairway.x + 20, fairway.x + fairway.w - 36),
      y: randInt(fairway.y + 12, fairway.y + fairway.h - 20),
      w: randInt(18, 32),
      h: randInt(12, 20),
    };
    if (
      pointInRect(ball.x, ball.y, candidate) ||
      pointInRect(hole.x, hole.y, candidate) ||
      walls.some((w2) => rectsOverlap(candidate, w2, 2))
    ) {
      continue;
    }
    sands.push(candidate);
  }
  return { fairway, ball, hole, walls, sands };
}

export default class MiniGolfComponent extends Component {
  @tracked holeIndex = 0;
  @tracked strokes = 0;
  @tracked totalStrokes = 0;
  @tracked sunk = false;
  @tracked gameComplete = false;
  @tracked scoreHistory = [];

  canvas = null;
  ctx = null;
  mouse = { x: W / 2, y: H / 2 };
  charging = false;
  chargeStart = 0;
  power = 0;
  rafId = null;
  ball = null;
  state = null;

  @action
  setupCanvas(el) {
    this.canvas = el;
    this.ctx = el.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this._loadHole(0);
    el.addEventListener('mousemove', this._onMove);
    el.addEventListener('mousedown', this._onDown);
    window.addEventListener('mouseup', this._onUp);
    el.addEventListener('touchstart', this._onTouchDown, { passive: false });
    el.addEventListener('touchmove', this._onTouchMove, { passive: false });
    window.addEventListener('touchend', this._onUp);
    this._loop();
  }

  willDestroy() {
    super.willDestroy();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    if (!this.canvas) return;
    this.canvas.removeEventListener('mousemove', this._onMove);
    this.canvas.removeEventListener('mousedown', this._onDown);
    window.removeEventListener('mouseup', this._onUp);
    this.canvas.removeEventListener('touchstart', this._onTouchDown);
    this.canvas.removeEventListener('touchmove', this._onTouchMove);
    window.removeEventListener('touchend', this._onUp);
  }

  _loadHole(i) {
    this.state = generateHole(i);
    this.ball = { x: this.state.ball.x, y: this.state.ball.y, vx: 0, vy: 0 };
    this.strokes = 0;
    this.sunk = false;
    this.charging = false;
    this.power = 0;
  }

  _canvasPoint(evt) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * W;
    const y = ((evt.clientY - rect.top) / rect.height) * H;
    return { x, y };
  }

  _onMove = (evt) => {
    this.mouse = this._canvasPoint(evt);
  };

  _onTouchMove = (evt) => {
    if (!evt.touches[0]) return;
    evt.preventDefault();
    this.mouse = this._canvasPoint(evt.touches[0]);
  };

  _onTouchDown = (evt) => {
    if (!evt.touches[0]) return;
    evt.preventDefault();
    this.mouse = this._canvasPoint(evt.touches[0]);
    this._onDown();
  };

  _onDown = () => {
    if (this.sunk || this.gameComplete) return;
    if (Math.hypot(this.ball.vx, this.ball.vy) > REST_V) return;
    this.charging = true;
    this.chargeStart = performance.now();
  };

  _onUp = () => {
    if (!this.charging) return;
    this.charging = false;
    const dx = this.mouse.x - this.ball.x;
    const dy = this.mouse.y - this.ball.y;
    const mag = Math.hypot(dx, dy) || 1;
    const speed = this.power * MAX_POWER;
    this.ball.vx = (dx / mag) * speed;
    this.ball.vy = (dy / mag) * speed;
    this.power = 0;
    this.strokes += 1;
  };

  _step() {
    const b = this.ball;
    if (this.charging) {
      const elapsed = performance.now() - this.chargeStart;
      this.power = Math.min(1, elapsed / CHARGE_MS);
    }

    let friction = FRICTION_ROUGH;
    if (pointInRect(b.x, b.y, this.state.fairway)) friction = FRICTION_FAIRWAY;
    if (this.state.sands.some((s) => pointInRect(b.x, b.y, s)))
      friction = FRICTION_SAND;

    b.vx *= friction;
    b.vy *= friction;

    if (Math.hypot(b.vx, b.vy) < REST_V) {
      b.vx = 0;
      b.vy = 0;
    }

    b.x += b.vx;
    b.y += b.vy;

    // Edge bounds
    if (b.x < BALL_R) {
      b.x = BALL_R;
      b.vx = -b.vx * WALL_BOUNCE;
    }
    if (b.x > W - BALL_R) {
      b.x = W - BALL_R;
      b.vx = -b.vx * WALL_BOUNCE;
    }
    if (b.y < BALL_R) {
      b.y = BALL_R;
      b.vy = -b.vy * WALL_BOUNCE;
    }
    if (b.y > H - BALL_R) {
      b.y = H - BALL_R;
      b.vy = -b.vy * WALL_BOUNCE;
    }

    // Wall collisions (AABB vs circle, axis of minimum penetration)
    for (const w of this.state.walls) {
      const nx = Math.max(w.x, Math.min(b.x, w.x + w.w));
      const ny = Math.max(w.y, Math.min(b.y, w.y + w.h));
      const dx = b.x - nx;
      const dy = b.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 < BALL_R * BALL_R) {
        const d = Math.sqrt(d2) || 0.0001;
        const ox = dx / d;
        const oy = dy / d;
        b.x = nx + ox * BALL_R;
        b.y = ny + oy * BALL_R;
        const dot = b.vx * ox + b.vy * oy;
        b.vx = (b.vx - 2 * dot * ox) * WALL_BOUNCE;
        b.vy = (b.vy - 2 * dot * oy) * WALL_BOUNCE;
      }
    }

    // Sink check
    const hd = Math.hypot(b.x - this.state.hole.x, b.y - this.state.hole.y);
    const speed = Math.hypot(b.vx, b.vy);
    if (!this.sunk && hd < HOLE_R - 0.5 && speed < 2.8) {
      b.vx = 0;
      b.vy = 0;
      b.x = this.state.hole.x;
      b.y = this.state.hole.y;
      this.sunk = true;
      this.totalStrokes += this.strokes;
      this.scoreHistory = [...this.scoreHistory, this.strokes];
      if (this.holeIndex >= TOTAL_HOLES - 1) {
        this.gameComplete = true;
      }
    }
  }

  _draw() {
    const ctx = this.ctx;
    const { fairway, hole, walls, sands } = this.state;
    ctx.fillStyle = COLORS.rough;
    ctx.fillRect(0, 0, W, H);

    // Fairway with dithered border
    ctx.fillStyle = COLORS.fairway;
    ctx.fillRect(fairway.x, fairway.y, fairway.w, fairway.h);
    ctx.fillStyle = COLORS.fairwayDark;
    for (let x = fairway.x; x < fairway.x + fairway.w; x += 2) {
      ctx.fillRect(x, fairway.y + fairway.h - 1, 1, 1);
      ctx.fillRect(x + 1, fairway.y, 1, 1);
    }

    // Sand
    for (const s of sands) {
      ctx.fillStyle = COLORS.sand;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = COLORS.sandDark;
      for (let i = 0; i < 6; i += 1) {
        ctx.fillRect(s.x + ((i * 5) % s.w), s.y + ((i * 7) % s.h), 1, 1);
      }
    }

    // Hole
    ctx.fillStyle = COLORS.hole;
    ctx.beginPath();
    ctx.arc(hole.x, hole.y, HOLE_R, 0, Math.PI * 2);
    ctx.fill();

    // Flag
    ctx.fillStyle = COLORS.pole;
    ctx.fillRect(hole.x, hole.y - 14, 1, 14);
    ctx.fillStyle = COLORS.flag;
    ctx.fillRect(hole.x + 1, hole.y - 14, 7, 5);
    ctx.fillRect(hole.x + 8, hole.y - 13, 1, 3);

    // Walls
    for (const w of walls) {
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(w.x, w.y, w.w, 1);
      ctx.fillRect(w.x, w.y, 1, w.h);
    }

    // Aim line (only when ball at rest)
    const speed = Math.hypot(this.ball.vx, this.ball.vy);
    if (!this.sunk && !this.gameComplete && speed < REST_V) {
      const dx = this.mouse.x - this.ball.x;
      const dy = this.mouse.y - this.ball.y;
      const mag = Math.hypot(dx, dy) || 1;
      const len = Math.min(mag, 48);
      const ex = this.ball.x + (dx / mag) * len;
      const ey = this.ball.y + (dy / mag) * len;
      ctx.strokeStyle = COLORS.aim;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(this.ball.x, this.ball.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Ball
    ctx.fillStyle = COLORS.ballShadow;
    ctx.beginPath();
    ctx.arc(this.ball.x + 0.5, this.ball.y + 1, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();

    // Power meter (bottom-left)
    if (this.charging) {
      ctx.fillStyle = COLORS.powerBack;
      ctx.fillRect(4, H - 10, 60, 6);
      ctx.fillStyle = COLORS.powerFill;
      ctx.fillRect(5, H - 9, Math.max(0, 58 * this.power), 4);
    }
  }

  _loop = () => {
    this._step();
    this._draw();
    this.rafId = requestAnimationFrame(this._loop);
  };

  @action
  nextHole() {
    if (this.holeIndex >= TOTAL_HOLES - 1) return;
    this.holeIndex += 1;
    this._loadHole(this.holeIndex);
  }

  @action
  restart() {
    this.holeIndex = 0;
    this.totalStrokes = 0;
    this.scoreHistory = [];
    this.gameComplete = false;
    this._loadHole(0);
  }

  get holeLabel() {
    return `Hole ${this.holeIndex + 1} of ${TOTAL_HOLES}`;
  }

  get strokeLabel() {
    if (this.strokes === 0) return 'Take your shot';
    if (this.strokes === 1) return '1 stroke';
    return `${this.strokes} strokes`;
  }

  get lastHoleScore() {
    return this.scoreHistory[this.scoreHistory.length - 1] ?? 0;
  }

  get scoreComment() {
    const s = this.lastHoleScore;
    if (s === 1) return 'Hole in one!';
    if (s === 2) return 'Eagle';
    if (s === 3) return 'Birdie';
    if (s === 4) return 'Par';
    return 'Bogey or worse';
  }

  get sunkLabel() {
    const n = this.lastHoleScore;
    const word = n === 1 ? 'stroke' : 'strokes';
    return `Hole ${this.holeIndex + 1} in ${n} ${word}`;
  }

  get scorecardLabel() {
    return this.scoreHistory.map((s, i) => `H${i + 1}:${s}`).join(' · ');
  }
}
