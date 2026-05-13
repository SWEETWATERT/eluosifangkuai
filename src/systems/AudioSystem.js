// Audio system using WeChat inner audio context
// Falls back gracefully when audio is unavailable

const _wx = typeof wx !== 'undefined' ? wx : null;

export class AudioSystem {
  constructor() {
    this.enabled = true;
    this.sounds = {};
    this.musicPlaying = false;
    this.innerAudioContext = null;

    if (_wx) {
      this.innerAudioContext = _wx.createInnerAudioContext();
    }
  }

  // Play a short sound effect
  playSound(name) {
    if (!this.enabled) return;
    // WeChat doesn't have a great built-in SFX system,
    // so we simulate with vibration as "haptic audio"
    if (_wx && _wx.vibrateShort) {
      switch (name) {
        case 'move':
          _wx.vibrateShort({ type: 'light' });
          break;
        case 'rotate':
          _wx.vibrateShort({ type: 'light' });
          break;
        case 'drop':
          _wx.vibrateShort({ type: 'medium' });
          break;
        case 'clear':
          _wx.vibrateLong();
          break;
        case 'tetris':
          _wx.vibrateLong();
          break;
        case 'combo':
          _wx.vibrateLong();
          break;
        case 'fever':
          _wx.vibrateLong();
          break;
        case 'gameover':
          _wx.vibrateLong();
          break;
        default:
          _wx.vibrateShort({ type: 'light' });
      }
    }
  }

  // Play background music
  playMusic(src) {
    if (!this.enabled || !this.innerAudioContext) return;
    this.innerAudioContext.src = src;
    this.innerAudioContext.loop = true;
    this.innerAudioContext.play();
    this.musicPlaying = true;
  }

  stopMusic() {
    if (this.innerAudioContext) {
      this.innerAudioContext.stop();
      this.musicPlaying = false;
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) {
      this.stopMusic();
    }
    return this.enabled;
  }

  destroy() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy();
    }
  }
}
