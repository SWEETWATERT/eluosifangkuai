import {
  createRewardedVideoAd,
  createBannerAd,
  isWeChat,
} from '../utils/wechat.js';
import { AD_UNIT_IDS } from '../utils/constants.js';

// Ad system — manages rewarded video and banner ads
// Gracefully handles missing ad units (dev mode / no network)

export class AdSystem {
  constructor() {
    this.rewardedAds = {};
    this.bannerAd = null;
    this.isWeChat = isWeChat();
    this.bannerVisible = false;
  }

  init() {
    if (!this.isWeChat) return;

    // Create rewarded video ad instances
    this.rewardedAds.revive = createRewardedVideoAd(AD_UNIT_IDS.REWARDED_REVIVE);
    this.rewardedAds.double = createRewardedVideoAd(AD_UNIT_IDS.REWARDED_DOUBLE);
    this.rewardedAds.chest = createRewardedVideoAd(AD_UNIT_IDS.REWARDED_CHEST);

    // Preload ads
    this._preloadAll();
  }

  async _preloadAll() {
    for (const ad of Object.values(this.rewardedAds)) {
      if (ad && ad.load) {
        try { await ad.load(); } catch (e) { /* ignore */ }
      }
    }
  }

  // Show rewarded video ad
  // type: 'revive' | 'double' | 'chest'
  // Returns: true if user watched full ad, false if cancelled, null if ad unavailable
  async showRewarded(type) {
    if (!this.isWeChat) {
      // In dev mode, simulate ad completion for testing
      console.log(`[Ad] Simulating rewarded ad: ${type}`);
      return true;
    }

    const ad = this.rewardedAds[type];
    if (!ad) return null;

    try {
      const result = await ad.show();
      // Reload for next time
      if (ad.load) ad.load().catch(() => {});
      return result;
    } catch (e) {
      console.warn(`[Ad] Rewarded ad failed (${type}):`, e);
      return null;
    }
  }

  showBanner() {
    if (!this.isWeChat) return;
    if (!this.bannerAd) {
      this.bannerAd = createBannerAd(AD_UNIT_IDS.BANNER);
    }
    if (this.bannerAd && !this.bannerVisible) {
      this.bannerAd.show();
      this.bannerVisible = true;
    }
  }

  hideBanner() {
    if (this.bannerAd && this.bannerVisible) {
      this.bannerAd.hide();
      this.bannerVisible = false;
    }
  }

  destroy() {
    for (const ad of Object.values(this.rewardedAds)) {
      if (ad && ad.destroy) ad.destroy();
    }
    if (this.bannerAd && this.bannerAd.destroy) {
      this.bannerAd.destroy();
    }
    this.bannerVisible = false;
  }
}
