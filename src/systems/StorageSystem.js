import { STORAGE_KEYS, CLOUD_KV } from '../utils/constants.js';
import { getStorage, setStorage, setUserCloudStorage, getFriendCloudStorage } from '../utils/wechat.js';

// Local & cloud storage manager
// Handles high score persistence, daily challenges, coins

export class StorageSystem {
  constructor() {
    this.cache = {};
  }

  async init() {
    // Load all local data
    for (const key of Object.values(STORAGE_KEYS)) {
      this.cache[key] = await getStorage(key);
    }
  }

  // --- High Score ---
  async getHighScore() {
    return this.cache[STORAGE_KEYS.HIGH_SCORE] || 0;
  }

  async setHighScore(score) {
    const current = await this.getHighScore();
    if (score > current) {
      this.cache[STORAGE_KEYS.HIGH_SCORE] = score;
      await setStorage(STORAGE_KEYS.HIGH_SCORE, score);

      // Sync to cloud for leaderboard
      try {
        await setUserCloudStorage({
          [CLOUD_KV.HIGH_SCORE]: score,
        });
      } catch (e) {
        // Cloud sync failure is not critical
      }
    }
    return this.cache[STORAGE_KEYS.HIGH_SCORE];
  }

  // --- Total Lines ---
  async getTotalLines() {
    return this.cache[STORAGE_KEYS.TOTAL_LINES] || 0;
  }

  async addTotalLines(count) {
    const current = await this.getTotalLines();
    const newTotal = current + count;
    this.cache[STORAGE_KEYS.TOTAL_LINES] = newTotal;
    await setStorage(STORAGE_KEYS.TOTAL_LINES, newTotal);

    try {
      await setUserCloudStorage({ [CLOUD_KV.LINES]: newTotal });
    } catch (e) { /* ignore */ }
    return newTotal;
  }

  // --- Games Played ---
  async getGamesPlayed() {
    return this.cache[STORAGE_KEYS.GAMES_PLAYED] || 0;
  }

  async incrementGamesPlayed() {
    const count = (await this.getGamesPlayed()) + 1;
    this.cache[STORAGE_KEYS.GAMES_PLAYED] = count;
    await setStorage(STORAGE_KEYS.GAMES_PLAYED, count);
    return count;
  }

  // --- Coins (virtual currency) ---
  async getCoins() {
    return this.cache[STORAGE_KEYS.COINS] || 0;
  }

  async addCoins(amount) {
    const coins = (await this.getCoins()) + amount;
    this.cache[STORAGE_KEYS.COINS] = coins;
    await setStorage(STORAGE_KEYS.COINS, coins);
    return coins;
  }

  async spendCoins(amount) {
    const coins = await this.getCoins();
    if (coins < amount) return false;
    this.cache[STORAGE_KEYS.COINS] = coins - amount;
    await setStorage(STORAGE_KEYS.COINS, coins - amount);
    return true;
  }

  // --- Daily Challenge ---
  async isDailyClaimed() {
    const date = this.cache[STORAGE_KEYS.DAILY_DATE];
    const today = new Date().toDateString();
    return date === today && this.cache[STORAGE_KEYS.DAILY_CLAIMED];
  }

  async claimDaily() {
    const today = new Date().toDateString();
    this.cache[STORAGE_KEYS.DAILY_DATE] = today;
    this.cache[STORAGE_KEYS.DAILY_CLAIMED] = true;
    await setStorage(STORAGE_KEYS.DAILY_DATE, today);
    await setStorage(STORAGE_KEYS.DAILY_CLAIMED, true);
    await this.addCoins(100);
    return 100;
  }

  // --- Leaderboard ---
  async getLeaderboard() {
    try {
      const data = await getFriendCloudStorage([
        CLOUD_KV.HIGH_SCORE,
        CLOUD_KV.LINES,
        CLOUD_KV.LEVEL,
      ]);
      return data.map(entry => ({
        nickname: entry.nickname || '玩家',
        avatarUrl: entry.avatarUrl || '',
        score: parseInt(entry.KVDataList?.find(kv => kv.key === CLOUD_KV.HIGH_SCORE)?.value || '0', 10),
        lines: parseInt(entry.KVDataList?.find(kv => kv.key === CLOUD_KV.LINES)?.value || '0', 10),
        level: parseInt(entry.KVDataList?.find(kv => kv.key === CLOUD_KV.LEVEL)?.value || '0', 10),
        isMe: entry.isMe || false,
      })).sort((a, b) => b.score - a.score);
    } catch (e) {
      return [];
    }
  }
}
