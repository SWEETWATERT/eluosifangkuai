import { GameScene } from './scenes/GameScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { AdSystem } from './systems/AdSystem.js';
import { StorageSystem } from './systems/StorageSystem.js';
import { AudioSystem } from './systems/AudioSystem.js';
import { getSystemInfo, shareAppMessage } from './utils/wechat.js';

// Main game bootstrap
// Manages scene transitions, global systems, and the main render loop

class Game {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.dpr = 2;
    this.width = 375;
    this.height = 667;

    this.currentScene = null;
    this.nextScene = null;

    // Systems
    this.adSystem = new AdSystem();
    this.storageSystem = new StorageSystem();
    this.audioSystem = new AudioSystem();

    this.rafId = null;
    this.lastTime = 0;

    // Stats from last game (for game over scene)
    this.lastGameStats = null;
  }

  async init() {
    // Get system info for screen size
    const sysInfo = await getSystemInfo();
    this.width = sysInfo.screenWidth || sysInfo.windowWidth || 375;
    this.height = sysInfo.screenHeight || sysInfo.windowHeight || 667;
    this.dpr = sysInfo.pixelRatio || 2;

    // Get canvas — in WeChat mini game it's a global `canvas` variable
    this.canvas = (typeof canvas !== 'undefined' ? canvas : null) || wx.createCanvas();
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.scale(this.dpr, this.dpr);

    // Init systems
    this.adSystem.init();
    await this.storageSystem.init();

    // Touch handler for scene-level touches (menu buttons, game over buttons)
    this._bindGlobalTouch();

    // Show menu first
    this._switchToMenu();

    // Start render loop
    this.lastTime = Date.now();
    this._loop(this.lastTime);
  }

  _bindGlobalTouch() {
    const handleTouch = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      const touch = e.touches[0];
      const x = touch.clientX || touch.x || 0;
      const y = touch.clientY || touch.y || 0;
      if (this.currentScene && this.currentScene.handleTouch) {
        this.currentScene.handleTouch(x, y);
      }
    };

    // WeChat mini game touch API
    if (typeof wx !== 'undefined') {
      wx.onTouchStart(handleTouch);
    }
  }

  _switchToMenu() {
    if (this.currentScene && this.currentScene.destroy) {
      this.currentScene.destroy();
    }

    this.adSystem.hideBanner();

    const menu = new MenuScene(this.canvas, this.ctx, this.dpr);
    menu.init();

    menu.callbacks.onPlay = () => this._startGame();
    menu.callbacks.onDaily = () => this._showDailyReward();
    menu.callbacks.onLeaderboard = () => this._showLeaderboard();

    this.currentScene = menu;
  }

  _startGame() {
    if (this.currentScene && this.currentScene.destroy) {
      this.currentScene.destroy();
    }
    this.adSystem.showBanner();

    const gameScene = new GameScene(this.canvas, this.ctx, this.dpr, (stats) => {
      this.lastGameStats = stats;
      this.storageSystem.setHighScore(stats.score);
      this.storageSystem.addTotalLines(stats.lines);
      this.storageSystem.incrementGamesPlayed();
      this.nextScene = 'gameover';
    });

    gameScene.init();
    this.currentScene = gameScene;
  }

  _switchToGameOver() {
    if (this.currentScene && this.currentScene.destroy) {
      this.currentScene.destroy();
    }
    this.adSystem.hideBanner();

    const gameOver = new GameOverScene(this.canvas, this.ctx, this.dpr);
    gameOver.show(this.lastGameStats);

    gameOver.callbacks.onRevive = async () => {
      const watched = await this.adSystem.showRewarded('revive');
      if (watched) {
        this._startGame();
      }
    };

    gameOver.callbacks.onDouble = async () => {
      const watched = await this.adSystem.showRewarded('double');
      if (watched && this.lastGameStats) {
        this.lastGameStats.score = Math.floor(this.lastGameStats.score * 2);
      }
    };

    gameOver.callbacks.onRetry = () => this._startGame();

    gameOver.callbacks.onShare = () => {
      shareAppMessage({
        title: `我在方块大作战中得了 ${this.lastGameStats?.score?.toLocaleString() || 0} 分！来挑战我吧！`,
        query: 'from=share',
      });
    };

    gameOver.callbacks.onMenu = () => this._switchToMenu();

    this.currentScene = gameOver;
  }

  async _showDailyReward() {
    const claimed = await this.storageSystem.isDailyClaimed();
    if (claimed) return;
    const watched = await this.adSystem.showRewarded('chest');
    if (watched) {
      await this.storageSystem.claimDaily();
    }
  }

  async _showLeaderboard() {
    await this.storageSystem.getLeaderboard();
  }

  _loop(now) {
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Check scene transition
    if (this.nextScene) {
      const scene = this.nextScene;
      this.nextScene = null;
      if (scene === 'gameover') {
        this._switchToGameOver();
      } else if (scene === 'menu') {
        this._switchToMenu();
      }
    }

    // Update current scene
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(dt);
    }

    // Render scenes that use the main loop (Menu, GameOver)
    if (this.currentScene && this.currentScene.render &&
        !this.currentScene._hasOwnLoop) {
      this.currentScene.render();
    }

    this.rafId = requestAnimationFrame(t => this._loop(t));
  }
}

// Bootstrap
const game = new Game();
game.init().catch((err) => {
  console.error('Game init failed:', err);
});
