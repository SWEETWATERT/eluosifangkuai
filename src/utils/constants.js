// Board dimensions
export const COLS = 10;
export const ROWS = 20;
export const CELL = 28; // px per cell — scales with device

// Piece spawn position (centered, top)
export const SPAWN_X = 3;
export const SPAWN_Y = -1; // one row above visible (piece is 4x4 matrix, spawn row 1)

// Timing (ms)
export const BASE_DROP_INTERVAL = 800;
export const LEVEL_SPEED_DECREASE = 50;
export const MIN_DROP_INTERVAL = 50;
export const LOCK_DELAY = 500; // ms before piece locks after landing
export const LOCK_DELAY_MAX_MOVES = 15; // max moves before forced lock
export const DAS_DELAY = 100; // delayed auto shift (initial hold)
export const DAS_REPEAT = 50; // auto repeat rate

// Level progression
export const LINES_PER_LEVEL_EARLY = 10; // level 1-10
export const LINES_PER_LEVEL_LATE = 15; // level 10+
export const MAX_LEVEL = 30;

// Scoring
export const SCORE = {
  SINGLE: 100,
  DOUBLE: 300,
  TRIPLE: 500,
  TETRIS: 800,
  T_SPIN: 400, // bonus on top of line clear
  T_SPIN_SINGLE: 800,
  T_SPIN_DOUBLE: 1200,
  T_SPIN_TRIPLE: 1600,
  COMBO: 50, // × combo_count
  SOFT_DROP: 1,
  HARD_DROP: 2,
};

// Fever system
export const FEVER_CHARGE_PER_LINE = 20; // % per line clear
export const FEVER_DURATION = 10000; // 10 seconds
export const FEVER_COOLDOWN = 5000;
export const FEVER_SCORE_MULTIPLIER = 2;

// Piece colors (neon theme)
export const PIECE_COLORS = {
  I: { fill: '#22dfff', glow: '#7cf6ff', name: 'cyan' },
  O: { fill: '#ffe45e', glow: '#fff2a8', name: 'yellow' },
  T: { fill: '#b767ff', glow: '#e2b5ff', name: 'purple' },
  S: { fill: '#34f389', glow: '#a5ffc7', name: 'green' },
  Z: { fill: '#ff5b7d', glow: '#ffa3b5', name: 'red' },
  J: { fill: '#4d7dff', glow: '#a9c0ff', name: 'blue' },
  L: { fill: '#ffab45', glow: '#ffd39a', name: 'orange' },
};

// Ad unit IDs (placeholders — replace with real IDs from WeChat MP platform)
export const AD_UNIT_IDS = {
  REWARDED_REVIVE: 'adunit-xxxxxxxxxxxxx1',
  REWARDED_DOUBLE: 'adunit-xxxxxxxxxxxxx2',
  REWARDED_CHEST: 'adunit-xxxxxxxxxxxxx3',
  BANNER: 'adunit-xxxxxxxxxxxxx4',
  INTERSTITIAL: 'adunit-xxxxxxxxxxxxx5',
};

// Storage keys
export const STORAGE_KEYS = {
  HIGH_SCORE: 'tt_high_score',
  TOTAL_LINES: 'tt_total_lines',
  GAMES_PLAYED: 'tt_games_played',
  COINS: 'tt_coins',
  DAILY_CLAIMED: 'tt_daily_claimed',
  DAILY_DATE: 'tt_daily_date',
  SKIN: 'tt_skin',
};

// Cloud KV keys (for leaderboard)
export const CLOUD_KV = {
  HIGH_SCORE: 'high_score',
  LEVEL: 'max_level',
  LINES: 'total_lines',
};
