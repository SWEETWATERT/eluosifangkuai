// WeChat API promise wrappers
// In WeChat mini games, `wx` is a global variable (not window.wx)

const _wx = typeof wx !== 'undefined' ? wx : null;

// Check if running in WeChat environment
export function isWeChat() {
  return _wx !== null;
}

// Share to chat
export function shareAppMessage(config) {
  if (!_wx) return;
  _wx.shareAppMessage({
    title: config.title || '方块大作战',
    imageUrl: config.imageUrl || '',
    query: config.query || '',
    success: config.onSuccess,
    fail: config.onFail,
  });
}

// Show share menu (passive share)
export function showShareMenu() {
  if (!_wx) return;
  _wx.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline'],
  });
}

// Get friend cloud storage (leaderboard)
export function getFriendCloudStorage(keyList) {
  return new Promise((resolve, reject) => {
    if (!_wx) { resolve([]); return; }
    _wx.getFriendCloudStorage({
      keyList,
      success: (res) => resolve(res.data || []),
      fail: reject,
    });
  });
}

// Set user cloud storage (update own score)
export function setUserCloudStorage(kvData) {
  return new Promise((resolve, reject) => {
    if (!_wx) { resolve(); return; }
    _wx.setUserCloudStorage({
      KVDataList: Object.entries(kvData).map(([key, value]) => ({
        key,
        value: String(value),
      })),
      success: resolve,
      fail: reject,
    });
  });
}

// Get local storage
export function getStorage(key) {
  return new Promise((resolve) => {
    if (!_wx) {
      try {
        const val = localStorage.getItem(key);
        resolve(val ? JSON.parse(val) : null);
      } catch (e) { resolve(null); }
      return;
    }
    _wx.getStorage({
      key,
      success: (res) => resolve(res.data),
      fail: () => resolve(null),
    });
  });
}

// Set local storage
export function setStorage(key, value) {
  return new Promise((resolve) => {
    if (!_wx) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) { /* ignore */ }
      resolve();
      return;
    }
    _wx.setStorage({ key, data: value, success: resolve, fail: resolve });
  });
}

// Get system info
export function getSystemInfo() {
  return new Promise((resolve) => {
    if (!_wx) {
      resolve({
        screenWidth: 375,
        screenHeight: 667,
        pixelRatio: 2,
        platform: 'web',
      });
      return;
    }
    _wx.getSystemInfo({
      success: resolve,
      fail: () => resolve({ screenWidth: 375, screenHeight: 667, pixelRatio: 2 }),
    });
  });
}

// Create rewarded video ad
export function createRewardedVideoAd(adUnitId) {
  if (!_wx) return null;
  const ad = _wx.createRewardedVideoAd({ adUnitId });
  return {
    show() {
      return new Promise((resolve, reject) => {
        ad.show().catch(() => {
          ad.load().then(() => ad.show()).then(resolve).catch(reject);
        });
        ad.onClose((res) => {
          if (res && res.isEnded) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
        ad.onError(reject);
      });
    },
    load() {
      return ad.load();
    },
    destroy() {
      ad.destroy();
    },
  };
}

// Create banner ad
export function createBannerAd(adUnitId, width) {
  if (!_wx) return null;
  const sysInfo = _wx.getSystemInfoSync();
  const banner = _wx.createBannerAd({
    adUnitId,
    adIntervals: 30,
    style: {
      left: 0,
      top: sysInfo.windowHeight - 60,
      width: width || sysInfo.windowWidth,
    },
  });
  return {
    show() { banner.show(); },
    hide() { banner.hide(); },
    destroy() { banner.destroy(); },
  };
}

// Vibrate
export function vibrateShort() {
  if (_wx) _wx.vibrateShort({ type: 'light' });
}

export function vibrateLong() {
  if (_wx) _wx.vibrateLong();
}
