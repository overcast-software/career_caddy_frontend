import Component from '@glimmer/component';
import { htmlSafe } from '@ember/template';

const MAIN_FLOW = [
  'Unvetted',
  'Vetted Good',
  'Applied',
  'Contact',
  'Interview Scheduled',
  'Interviewed',
  'Technical Test',
  'Awaiting Decision',
  'Offer',
  'Accepted',
];

// Terminal states that trail after Rejected on the no-go rail
const NOGO_RAIL = ['Rejected', 'Expired', 'Archived'];

// Main flow indices
const VG_IDX = 1; // Vetted Good — VB branches here
const C_IDX = 3;  // Contact — first rejection entry
const I_IDX = 5;  // Interviewed — rejection entry
const TT_IDX = 6; // Technical Test — rejection entry
const AD_IDX = 7; // Awaiting Decision — last rejection entry, aligns with Rejected node
const O_IDX = 8;  // Offer — Declined branches here

const X0 = 60;
const DX = 120;
const MAIN_Y = 80;
const NOGO_Y = 195;    // VB + rejection rail depth
const DECLINE_Y = 145; // shorter branch from Offer (you chose this, less severe)
const SVG_HEIGHT = 250;

// Rejection rail: Rej at nodeX(AD_IDX), Exp at nodeX(AD_IDX+1), Arc at nodeX(AD_IDX+2)
// This aligns rail nodes under AD, O, Acc respectively.

const C = {
  done: '#3b82f6',
  active: '#1d4ed8',
  future: '#d1d5db',
  nogoActive: '#dc2626',
  nogoDone: '#f87171',
  nogoFuture: '#fecaca',
  inactive: '#e5e7eb',
  lineDone: '#93c5fd',
  lineNogo: '#fca5a5',
  lineInactive: '#e5e7eb',
};

function nodeX(i) {
  return X0 + i * DX;
}

export default class JobApplicationStatusFlowComponent extends Component {
  get current() {
    return this.args.current ?? '';
  }

  get mainIdx() {
    return MAIN_FLOW.indexOf(this.current);
  }

  get railIdx() {
    return NOGO_RAIL.indexOf(this.current);
  }

  get isOnMain() {
    return this.mainIdx >= 0;
  }

  get isVettedBad() {
    return this.current === 'Vetted Bad';
  }

  get isDeclined() {
    return this.current === 'Declined';
  }

  get isOnRail() {
    return this.railIdx >= 0;
  }

  // Fill color for a main flow node at index i given the current status
  mainFill(i) {
    if (this.isOnMain) {
      if (i < this.mainIdx) return C.done;
      if (i === this.mainIdx) return C.active;
      return C.future;
    }
    if (this.isVettedBad) return i <= VG_IDX ? C.done : C.future;
    // Declined: went through Offer so everything up to O is done
    if (this.isDeclined) return i <= O_IDX ? C.done : C.future;
    // Rejected/Expired/Archived: reached at least Awaiting Decision
    if (this.isOnRail) return i <= AD_IDX ? C.done : C.future;
    return C.future;
  }

  get mainNodes() {
    return MAIN_FLOW.map((label, i) => {
      const x = nodeX(i);
      const fill = this.mainFill(i);
      const isActive = this.isOnMain && i === this.mainIdx;
      return {
        label,
        x,
        y: MAIN_Y,
        fill,
        isActive,
        labelTransform: `translate(${x},${MAIN_Y + 14}) rotate(35)`,
        textFill: isActive ? '#1e3a8a' : '#4b5563',
        fontWeight: isActive ? '600' : '400',
      };
    });
  }

  get mainLineSegments() {
    return Array.from({ length: MAIN_FLOW.length - 1 }, (_, i) => {
      const leftDone = this.mainFill(i) !== C.future;
      const rightDone = this.mainFill(i + 1) !== C.future;
      return {
        x1: nodeX(i),
        x2: nodeX(i + 1),
        y: MAIN_Y,
        stroke: leftDone && rightDone ? C.lineDone : C.lineInactive,
      };
    });
  }

  // Vetted Bad — isolated dead-end below Vetted Good
  get vbBranchLine() {
    const stroke = this.isVettedBad ? C.lineNogo : C.lineInactive;
    return { x: nodeX(VG_IDX), y1: MAIN_Y, y2: NOGO_Y, stroke };
  }

  get vbNode() {
    const isActive = this.isVettedBad;
    return {
      label: 'Vetted Bad',
      x: nodeX(VG_IDX),
      y: NOGO_Y,
      fill: isActive ? C.nogoActive : C.inactive,
      isActive,
      labelY: NOGO_Y + 18,
      textFill: isActive ? '#7f1d1d' : '#9ca3af',
      fontWeight: isActive ? '600' : '400',
    };
  }

  // Declined — short branch from Offer (applicant chose to decline)
  get decBranchLine() {
    const stroke = this.isDeclined ? C.lineNogo : C.lineInactive;
    return { x: nodeX(O_IDX), y1: MAIN_Y, y2: DECLINE_Y, stroke };
  }

  get decNode() {
    const isActive = this.isDeclined;
    return {
      label: 'Declined',
      x: nodeX(O_IDX),
      y: DECLINE_Y,
      fill: isActive ? C.nogoActive : C.inactive,
      isActive,
      labelY: DECLINE_Y + 18,
      textFill: isActive ? '#7f1d1d' : '#9ca3af',
      fontWeight: isActive ? '600' : '400',
    };
  }

  // Rejection entry vertical lines: C, Interviewed, TT, AD → NOGO_Y
  // All four sources converge on the same rail leading to Rejected.
  get rejectionEntries() {
    const stroke = this.isOnRail ? C.lineNogo : C.lineInactive;
    return [C_IDX, I_IDX, TT_IDX, AD_IDX].map((idx) => ({
      x: nodeX(idx),
      y1: MAIN_Y,
      y2: NOGO_Y,
      stroke,
    }));
  }

  // Rejection rail horizontal: from Contact's x to Archived's x
  get nogoRailSegments() {
    const xStart = nodeX(C_IDX);
    const xEnd = nodeX(AD_IDX + NOGO_RAIL.length - 1);

    if (!this.isOnRail) {
      return [{ x1: xStart, x2: xEnd, y: NOGO_Y, stroke: C.lineInactive }];
    }

    // Highlight up to the current rail node, gray the rest
    const xActive = nodeX(AD_IDX + this.railIdx);
    const segs = [];
    if (xActive > xStart) {
      segs.push({ x1: xStart, x2: xActive, y: NOGO_Y, stroke: C.lineNogo });
    }
    if (xActive < xEnd) {
      segs.push({ x1: xActive, x2: xEnd, y: NOGO_Y, stroke: C.lineInactive });
    }
    if (segs.length === 0) {
      segs.push({ x1: xStart, x2: xEnd, y: NOGO_Y, stroke: C.lineNogo });
    }
    return segs;
  }

  // Rail terminal nodes: Rejected, Expired, Archived (aligned under AD, O, Acc)
  get railNodes() {
    return NOGO_RAIL.map((label, i) => {
      let fill;
      if (this.isOnRail) {
        const ri = this.railIdx;
        if (i < ri) fill = C.nogoDone;
        else if (i === ri) fill = C.nogoActive;
        else fill = C.nogoFuture;
      } else {
        fill = C.inactive;
      }
      const isActive = this.isOnRail && i === this.railIdx;
      return {
        label,
        x: nodeX(AD_IDX + i),
        y: NOGO_Y,
        fill,
        isActive,
        labelY: NOGO_Y + 18,
        textFill: isActive ? '#7f1d1d' : '#9ca3af',
        fontWeight: isActive ? '600' : '400',
      };
    });
  }

  get svgWidth() {
    return nodeX(AD_IDX + NOGO_RAIL.length - 1) + 80;
  }

  get viewBox() {
    return `0 0 ${this.svgWidth} ${SVG_HEIGHT}`;
  }

  get svgStyle() {
    return htmlSafe(`width: ${this.svgWidth}px; display: block;`);
  }
}
