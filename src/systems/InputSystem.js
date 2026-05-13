// Touch gesture recognition for Tetris
// Uses WeChat mini game touch API (wx.onTouchStart/Move/End)
// Falls back to browser touch API for dev testing

const _wx = typeof wx !== 'undefined' ? wx : null;

export class InputSystem {
  constructor(canvas, screenWidth) {
    this.canvas = canvas;
    this.screenWidth = screenWidth || 375;
    this.callbacks = {};

    // Touch tracking
    this.touchStart = null;
    this.touchCurrent = null;
    this.touchActive = false;
    this.longPressTimer = null;
    this.isLongPress = false;
    this.swipeHandled = false;

    // Config
    this.swipeThreshold = 30;
    this.longPressTime = 200;
    this.tapThreshold = 10;

    this._bindEvents();
  }

  on(event, callback) {
    this.callbacks[event] = callback;
    return this;
  }

  _bindEvents() {
    if (_wx) {
      // WeChat mini game touch API
      this._touchStartHandler = this._handleTouchStart.bind(this);
      this._touchMoveHandler = this._handleTouchMove.bind(this);
      this._touchEndHandler = this._handleTouchEnd.bind(this);

      _wx.onTouchStart(this._touchStartHandler);
      _wx.onTouchMove(this._touchMoveHandler);
      _wx.onTouchEnd(this._touchEndHandler);

      // Keyboard for devtools
      if (_wx.onKeyDown) {
        this._keyDownHandler = this._handleKeyDown.bind(this);
        this._keyUpHandler = this._handleKeyUp.bind(this);
        _wx.onKeyDown(this._keyDownHandler);
        _wx.onKeyUp(this._keyUpHandler);
      }
    }
  }

  _emit(event, data) {
    if (this.callbacks[event]) this.callbacks[event](data);
  }

  _handleTouchStart(e) {
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    this.touchStart = {
      x: touch.clientX || touch.x || 0,
      y: touch.clientY || touch.y || 0,
      time: Date.now(),
    };
    this.touchCurrent = { ...this.touchStart };
    this.touchActive = true;
    this.isLongPress = false;
    this.swipeHandled = false;

    this.longPressTimer = setTimeout(() => {
      this.isLongPress = true;
      this._emit('softDrop', { active: true });
    }, this.longPressTime);
  }

  _handleTouchMove(e) {
    if (!this.touchActive) return;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    this.touchCurrent = {
      x: touch.clientX || touch.x || 0,
      y: touch.clientY || touch.y || 0,
    };

    const dx = this.touchCurrent.x - this.touchStart.x;
    const dy = this.touchCurrent.y - this.touchStart.y;

    if (Math.abs(dx) > this.tapThreshold || Math.abs(dy) > this.tapThreshold) {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }

    // Horizontal swipe
    if (Math.abs(dx) > this.swipeThreshold && !this.swipeHandled) {
      this.swipeHandled = true;
      if (dx > 0) {
        this._emit('moveRight');
      } else {
        this._emit('moveLeft');
      }
    }

    // Downward swipe (hard drop)
    if (dy > this.swipeThreshold * 2 && !this.swipeHandled) {
      this.swipeHandled = true;
      this._emit('hardDrop');
    }
  }

  _handleTouchEnd(e) {
    if (!this.touchActive) return;
    this.touchActive = false;

    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }

    if (this.isLongPress) {
      this._emit('softDrop', { active: false });
      this.isLongPress = false;
      return;
    }

    if (!this.touchCurrent || !this.touchStart) return;

    const dx = Math.abs(this.touchCurrent.x - this.touchStart.x);
    const dy = Math.abs(this.touchCurrent.y - this.touchStart.y);
    const dt = Date.now() - this.touchStart.time;

    if (dx < this.tapThreshold && dy < this.tapThreshold && dt < 300) {
      // Tap — left half = CCW, right half = CW
      const midX = this.screenWidth / 2;
      if (this.touchStart.x < midX) {
        this._emit('rotateCCW');
      } else {
        this._emit('rotateCW');
      }
    } else if (dy < -this.swipeThreshold && !this.swipeHandled) {
      // Swipe up = hold
      this._emit('hold');
    }
  }

  _handleKeyDown(e) {
    switch (e.key || e.keyCode) {
      case 'ArrowLeft': case 37: this._emit('moveLeft'); break;
      case 'ArrowRight': case 39: this._emit('moveRight'); break;
      case 'ArrowDown': case 40: this._emit('softDrop', { active: true }); break;
      case 'ArrowUp': case 38: this._emit('rotateCW'); break;
      case 'z': case 90: this._emit('rotateCCW'); break;
      case ' ': case 32: this._emit('hardDrop'); break;
      case 'c': case 67: this._emit('hold'); break;
      case 'Escape': case 27: this._emit('pause'); break;
      case 'p': case 80: this._emit('pause'); break;
    }
  }

  _handleKeyUp(e) {
    const key = e.key || e.keyCode;
    if (key === 'ArrowDown' || key === 40 || key === 's' || key === 83) {
      this._emit('softDrop', { active: false });
    }
  }

  // Browser fallback for desktop dev
  enableKeyboard() {
    if (_wx) return; // already handled via _wx.onKeyDown
    this._keyDownHandler = this._handleKeyDown.bind(this);
    this._keyUpHandler = this._handleKeyUp.bind(this);
    document.addEventListener('keydown', this._keyDownHandler);
    document.addEventListener('keyup', this._keyUpHandler);
  }

  destroy() {
    if (_wx) {
      if (this._touchStartHandler) _wx.offTouchStart(this._touchStartHandler);
      if (this._touchMoveHandler) _wx.offTouchMove(this._touchMoveHandler);
      if (this._touchEndHandler) _wx.offTouchEnd(this._touchEndHandler);
      if (_wx.onKeyDown && this._keyDownHandler) _wx.offKeyDown(this._keyDownHandler);
      if (_wx.onKeyUp && this._keyUpHandler) _wx.offKeyUp(this._keyUpHandler);
    } else {
      if (this._keyDownHandler) document.removeEventListener('keydown', this._keyDownHandler);
      if (this._keyUpHandler) document.removeEventListener('keyup', this._keyUpHandler);
    }
  }
}
