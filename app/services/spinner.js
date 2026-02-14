import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';

export default class SpinnerService extends Service {
  @tracked isShowing = false;
  @tracked label = null;
  
  _count = 0;

  begin(options = {}) {
    const { label = null } = options;
    
    this._count++;
    
    if (this._count === 1) {
      this.label = label;
      this.isShowing = true;
    }
    
    return this._count;
  }

  end() {
    if (this._count <= 0) return;
    
    this._count--;
    
    if (this._count === 0) {
      this.isShowing = false;
      this.label = null;
    }
  }

  async wrap(taskOrPromise, options = {}) {
    this.begin(options);
    
    try {
      let result;
      if (typeof taskOrPromise === 'function') {
        result = await taskOrPromise();
      } else {
        result = await taskOrPromise;
      }
      return result;
    } finally {
      this.end();
    }
  }

  clear() {
    this._count = 0;
    this.isShowing = false;
    this.label = null;
  }
}
