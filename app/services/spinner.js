import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { later, cancel } from '@ember/runloop';

export default class SpinnerService extends Service {
  @tracked isShowing = false;
  @tracked label = null;
  
  _count = 0;
  _delayTimer = null;
  _minDurationTimer = null;
  _showStartTime = null;
  _tokenCounter = 0;

  begin(options = {}) {
    const { label = null, delayMs = 200, minDurationMs = 300 } = options;
    const token = ++this._tokenCounter;
    
    this._count++;
    
    if (this._count === 1) {
      this.label = label;
      
      // Cancel any existing delay timer
      if (this._delayTimer) {
        cancel(this._delayTimer);
      }
      
      // Show spinner after delay to avoid flicker
      this._delayTimer = later(() => {
        this.isShowing = true;
        this._showStartTime = Date.now();
        this._delayTimer = null;
      }, delayMs);
    }
    
    return token;
  }

  end(token = null) {
    if (this._count <= 0) return;
    
    this._count--;
    
    if (this._count === 0) {
      const hideSpinner = () => {
        this.isShowing = false;
        this.label = null;
        this._showStartTime = null;
      };
      
      // If delay timer is still running, cancel it and hide immediately
      if (this._delayTimer) {
        cancel(this._delayTimer);
        this._delayTimer = null;
        hideSpinner();
        return;
      }
      
      // If spinner is showing, respect minimum duration
      if (this.isShowing && this._showStartTime) {
        const elapsed = Date.now() - this._showStartTime;
        const minDurationMs = 300;
        
        if (elapsed < minDurationMs) {
          this._minDurationTimer = later(() => {
            hideSpinner();
            this._minDurationTimer = null;
          }, minDurationMs - elapsed);
        } else {
          hideSpinner();
        }
      } else {
        hideSpinner();
      }
    }
  }

  async wrap(taskOrPromise, options = {}) {
    const token = this.begin(options);
    
    try {
      let result;
      if (typeof taskOrPromise === 'function') {
        result = await taskOrPromise();
      } else {
        result = await taskOrPromise;
      }
      return result;
    } finally {
      this.end(token);
    }
  }

  clear() {
    this._count = 0;
    this.isShowing = false;
    this.label = null;
    this._showStartTime = null;
    
    if (this._delayTimer) {
      cancel(this._delayTimer);
      this._delayTimer = null;
    }
    
    if (this._minDurationTimer) {
      cancel(this._minDurationTimer);
      this._minDurationTimer = null;
    }
  }
}
