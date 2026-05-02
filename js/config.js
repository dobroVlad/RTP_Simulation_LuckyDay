const BONANZA_CONFIG = {
  grid: { cols: 6, rows: 5 },
  rules: {
    maxCascades: 12,
    scatterPayThreshold: 8,
    removeScattersOnPay: true,
    removeScattersAlwaysInBonus: false,
  },
  payouts: {
    HEART: [
      { min: 8, max: 9, x: 10 },
      { min: 10, max: 11, x: 25 },
      { min: 12, max: 99, x: 50 },
    ],
    PURPLE: [
      { min: 8, max: 9, x: 2.5 },
      { min: 10, max: 11, x: 10 },
      { min: 12, max: 99, x: 25 },
    ],
    GREEN: [
      { min: 8, max: 9, x: 2 },
      { min: 10, max: 11, x: 5 },
      { min: 12, max: 99, x: 15 },
    ],
    BLUE: [
      { min: 8, max: 9, x: 1.5 },
      { min: 10, max: 11, x: 2 },
      { min: 12, max: 99, x: 12 },
    ],
    APPLE: [
      { min: 8, max: 9, x: 1 },
      { min: 10, max: 11, x: 1.5 },
      { min: 12, max: 99, x: 10 },
    ],
    PLUM: [
      { min: 8, max: 9, x: 0.8 },
      { min: 10, max: 11, x: 1.2 },
      { min: 12, max: 99, x: 8 },
    ],
    WATERM: [
      { min: 8, max: 9, x: 0.5 },
      { min: 10, max: 11, x: 1 },
      { min: 12, max: 99, x: 5 },
    ],
    GRAPE: [
      { min: 8, max: 9, x: 0.4 },
      { min: 10, max: 11, x: 0.9 },
      { min: 12, max: 99, x: 4 },
    ],
    BANANA: [
      { min: 8, max: 9, x: 0.25 },
      { min: 10, max: 11, x: 0.75 },
      { min: 12, max: 99, x: 2 },
    ],
    SCATTER_PAY: [
      { n: 4, x: 3 },
      { n: 5, x: 5 },
      { n: 6, x: 100 },
    ],
  },
  bonus: {
    buyCost: 200,
    buyBetMultiplier: 100,
    spinsOnTrigger: 10,
    bombMultipliers: [
      { weight: 10, x: 2 },
      { weight: 4, x: 3 },
      { weight: 3.5, x: 4 },
      { weight: 3, x: 5 },
      { weight: 2.5, x: 6 },
      { weight: 2, x: 8 },
      { weight: 0, x: 9 },
      { weight: 1.5, x: 10 },
      { weight: 0, x: 11 },
      { weight: 1, x: 12 },
      { weight: 1.5, x: 13 },
      { weight: 1, x: 15 },
      { weight: 1, x: 20 },
      { weight: 0.5, x: 25 },
      { weight: 0.25, x: 50 },
      { weight: 0.11, x: 100 },
    ],
    weights: {
      HEART: 2,
      PURPLE: 4.25,
      GREEN: 6,
      BLUE: 6.5,
      APPLE: 7,
      PLUM: 8,
      WATERM: 15,
      GRAPE: 16,
      BANANA: 20,
      SCATTER: 1,
      BOMB: 5,
    },
    scattersToTriggerBase: 4,
    scattersToRetriggerBonus: 3,
    spinsOnRetrigger: 10,
    maxWinPerCascadeInX: 21100, 
    maxRetriggersPerBonus: 4,
    scatterWeightAfterCap: 0, 
  },
  ante: {
    betMultiplier: 1.25,
    scatterChanceMultiplier: 1.47,
    weights: {
      HEART: 1.5,
      PURPLE: 3,
      GREEN: 3.5,
      BLUE: 7,
      APPLE: 8,
      PLUM: 9,
      WATERM: 10,
      GRAPE: 12,
      BANANA: 15,
      SCATTER: 1.316,
      BOMB: 0,
    },
  },
  weights: {
    HEART: 1.5,
    PURPLE: 3,
    GREEN: 3.5,
    BLUE: 7,
    APPLE: 8,
    PLUM: 9,
    WATERM: 10,
    GRAPE: 12,
    BANANA: 15,
    SCATTER: 1.316,
    BOMB: 0,
  }
};

const OLYMPUS_CONFIG = {
  grid: { cols: 6, rows: 5 },

  rules: {
    maxCascades: 12,
    minSymbolsForPay: 8,
  },

  payouts: {
    crown: [
      { min: 8, max: 9, x: 10 },
      { min: 10, max: 11, x: 25 },
      { min: 12, max: 99, x: 50 },
    ],
    sandglass: [
      { min: 8, max: 9, x: 2.5 },
      { min: 10, max: 11, x: 10 },
      { min: 12, max: 99, x: 25 },
    ],
    ring: [
      { min: 8, max: 9, x: 2 },
      { min: 10, max: 11, x: 5 },
      { min: 12, max: 99, x: 15 },
    ],
    cup: [
      { min: 8, max: 9, x: 1.5 },
      { min: 10, max: 11, x: 2 },
      { min: 12, max: 99, x: 12 },
    ],
    red: [
      { min: 8, max: 9, x: 1 },
      { min: 10, max: 11, x: 1.5 },
      { min: 12, max: 99, x: 10 },
    ],
    purple: [
      { min: 8, max: 9, x: 0.8 },
      { min: 10, max: 11, x: 1.2 },
      { min: 12, max: 99, x: 8 },
    ],
    yellow: [
      { min: 8, max: 9, x: 0.5 },
      { min: 10, max: 11, x: 1 },
      { min: 12, max: 99, x: 5 },
    ],
    green: [
      { min: 8, max: 9, x: 0.4 },
      { min: 10, max: 11, x: 0.9 },
      { min: 12, max: 99, x: 4 },
    ],
    blue: [
      { min: 8, max: 9, x: 0.25 },
      { min: 10, max: 11, x: 0.75 },
      { min: 12, max: 99, x: 2 },
    ],

    SCATTER_PAY: [
      { n: 4, x: 3 },
      { n: 5, x: 5 },
      { n: 6, x: 100 },
    ],
  },

  bonus: {
    buyCost: 200,
    buyBetMultiplier: 100,
    spinsOnTrigger: 15,
    spinsOnRetrigger: 5,
    scattersToTriggerBase: 4,
    scattersToRetriggerBonus: 3,
    maxRetriggersPerBonus: 4,
    scatterWeightAfterCap: 0,
    maxWinPerCascadeInX: 5000,

    weights: {
      crown: 1.5,
      sandglass: 3,
      ring: 5,
      cup: 6,
      red: 7,
      purple: 8,
      yellow: 14,
      green: 16,
      blue: 18,
      SCATTER: 0.93,
    },

    bombMultipliers: [
      { weight: 50, x: 2 },
      { weight: 40, x: 3 },
      { weight: 30, x: 4 },
      { weight: 20, x: 5 },
      { weight: 10, x: 6 },
      { weight: 8, x: 8 },
      { weight: 6, x: 10 },
      { weight: 4, x: 15 },
      { weight: 2, x: 20 },
      { weight: 1, x: 25 },
      { weight: 0.5, x: 50 },
      { weight: 0.25, x: 100 },
      { weight: 0.15, x: 500 },
    ],
    bombSpawnChanceBase: 0.005,
    bombSpawnChanceBonus: 0.02,
  },

  ante: {
    betMultiplier: 1.25,
    scatterChanceMultiplier: 1.47,
    weights: {
      crown: 1,
      sandglass: 2,
      ring: 3.5,
      cup: 5,
      red: 6,
      purple: 7,
      yellow: 12,
      green: 13,
      blue: 14,
      SCATTER: 1.316,
    },
  },

  weights: {
    crown: 1,
    sandglass: 2,
    ring: 3.5,
    cup: 5,
    red: 6,
    purple: 7,
    yellow: 12,
    green: 13,
    blue: 14,
    SCATTER: 1.316,
  },
};

const makeBaseReel = (reelIndex) => ({
  DOG1: 2.1,
  DOG2: 3.2,
  DOG3: 4.5,
  DOG4: 5.5,
  COLLAR: 6.5,
  BONE: 8.0,
  A: 10,
  K: 11,
  Q: 13,
  J: 14,
  TEN: 15,
  WILD: [1, 2, 3].includes(reelIndex) ? 5.5 : 0,
  BONUS: [0, 2, 4].includes(reelIndex) ? 6.2 : 0,
});

const makeFreeReel = (reelIndex) => ({
  DOG1: 2.5,
  DOG2: 4.0,
  DOG3: 5.5,
  DOG4: 7.0,
  COLLAR: 9.0,
  BONE: 11.0,
  A: 13,
  K: 15,
  Q: 18,
  J: 18,
  TEN: 18,
  WILD: [1, 2, 3].includes(reelIndex) ? 9.5 : 0,
  BONUS: 0,
});

const DOG_HOUSE_CONFIG = {
  grid: { rows: 3, cols: 5 },
  paylines: [
    [1, 1, 1, 1, 1], //1
    [0, 0, 0, 0, 0], //2
    [2, 2, 2, 2, 2], //3
    [0, 1, 2, 1, 0], //4
    [2, 1, 0, 1, 2], //5
    [1, 0, 0, 0, 1], //6
    [1, 2, 2, 2, 1], //7
    [0, 0, 1, 2, 2], //8
    [2, 2, 1, 0, 0], //9
    [1, 2, 1, 0, 1], //10
    [1, 0, 1, 2, 1], //11
    [0, 1, 1, 1, 0], //12
    [2, 1, 1, 1, 2], //13
    [0, 1, 0, 1, 0], //14
    [2, 1, 2, 1, 2], //15
    [1, 1, 0, 1, 1], //16
    [1, 1, 2, 1, 1], //17
    [0, 0, 2, 0, 0], //18
    [2, 2, 0, 2, 2], //19
    [0, 2, 2, 2, 0], //20
  ],
  paySymbols: ['DOG1', 'DOG2', 'DOG3', 'DOG4', 'COLLAR', 'BONE', 'A', 'K', 'Q', 'J', 'TEN'],
  payouts: {
    DOG1: { 3: 50, 4: 150, 5: 750 },
    DOG2: { 3: 35, 4: 100, 5: 500 },
    DOG3: { 3: 25, 4: 60, 5: 300 },
    DOG4: { 3: 20, 4: 40, 5: 200 },
    COLLAR: { 3: 12, 4: 25, 5: 150 },
    BONE: { 3: 8, 4: 20, 5: 100 },
    A: { 3: 5, 4: 10, 5: 50 },
    K: { 3: 5, 4: 10, 5: 50 },
    Q: { 3: 2, 4: 5, 5: 25 },
    J: { 3: 2, 4: 5, 5: 25 },
    TEN: { 3: 2, 4: 5, 5: 25 },
  },
  reels: {
    base: [0, 1, 2, 3, 4].map(makeBaseReel),
    free: [0, 1, 2, 3, 4].map(makeFreeReel),
  },
  wildReels: [1, 2, 3],
  bonusReels: [0, 2, 4],
  bonusTriggerReels: [0, 2, 4],
  bonusTriggerPayoutX: 5,
  wildMultipliers: [2, 3],
  freeSpinsBoard: {
    rows: 3,
    cols: 3,
    weights: { 1: 1, 2: 1, 3: 1 },
  },
};
