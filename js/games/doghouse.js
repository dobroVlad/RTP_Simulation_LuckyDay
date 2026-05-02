class DogHouseGame {
  constructor(config) {
    this.config = config;
  }

  getRandomSymbol(weights) {
    let total = 0;
    for (let k in weights) total += weights[k];
    let r = Math.random() * total;
    for (let k in weights) {
      r -= weights[k];
      if (r <= 0) return k;
    }
    return Object.keys(weights)[0];
  }

  getRandomWildMultiplier() {
    let opts = this.config.wildMultipliers;
    return opts[Math.floor(Math.random() * opts.length)];
  }

  playSpin(mode = 'BASE') {
    let isBuy = (mode === 'BUY');
    
    let totalWin = 0;
    let stats = {
      baseWin: 0,
      bonusWin: 0,
      totalWin: 0,
      isBonusTriggered: isBuy,
      freeSpinsPlayed: 0,
      retriggers: 0,
      maxWinHit: false,
      symbolWins: {},
      symbolCounts: {},
      totalSymbolsDropped: 0
    };

    // Free spins board calculation
    let freeSpinsCount = 0;
    if (isBuy) {
      freeSpinsCount = this.calculateFreeSpinsFromBoard();
    }

    let stickyWilds = Array.from({ length: this.config.grid.cols }, () => 
      Array(this.config.grid.rows).fill(null)
    );

    // Play BASE spin
    if (!isBuy) {
      let baseRes = this.runSingleSpin('BASE', stickyWilds);
      stats.baseWin += baseRes.win;
      totalWin += baseRes.win;
      
      if (baseRes.symbolWins) {
        for (let sym in baseRes.symbolWins) {
          stats.symbolWins[sym] = (stats.symbolWins[sym] || 0) + baseRes.symbolWins[sym];
        }
      }
      
      if (baseRes.symbolCounts) {
        for (let sym in baseRes.symbolCounts) {
          stats.symbolCounts[sym] = (stats.symbolCounts[sym] || 0) + baseRes.symbolCounts[sym];
        }
      }
      stats.totalSymbolsDropped += (baseRes.totalSymbolsDropped || 0);

      if (baseRes.bonusTriggered) {
        stats.isBonusTriggered = true;
        stats.baseWin += this.config.bonusTriggerPayoutX;
        totalWin += this.config.bonusTriggerPayoutX;
        stats.symbolWins['BONUS'] = (stats.symbolWins['BONUS'] || 0) + this.config.bonusTriggerPayoutX;
        freeSpinsCount = this.calculateFreeSpinsFromBoard();
      }
    }

    // Play FREE spins
    if (freeSpinsCount > 0) {
      for (let s = 0; s < freeSpinsCount; s++) {
        stats.freeSpinsPlayed++;
        let freeRes = this.runSingleSpin('FREE', stickyWilds);
        stats.bonusWin += freeRes.win;
        totalWin += freeRes.win;
        
        if (freeRes.symbolWins) {
          for (let sym in freeRes.symbolWins) {
            stats.symbolWins[sym] = (stats.symbolWins[sym] || 0) + freeRes.symbolWins[sym];
          }
        }
        
        if (freeRes.symbolCounts) {
          for (let sym in freeRes.symbolCounts) {
            stats.symbolCounts[sym] = (stats.symbolCounts[sym] || 0) + freeRes.symbolCounts[sym];
          }
        }
        stats.totalSymbolsDropped += (freeRes.totalSymbolsDropped || 0);
      }
    }

    stats.totalWin = totalWin;
    return stats;
  }

  calculateFreeSpinsFromBoard() {
    let board = this.config.freeSpinsBoard;
    let cells = board.rows * board.cols;
    let totalSpins = 0;
    for (let i = 0; i < cells; i++) {
        totalSpins += parseInt(this.getRandomSymbol(board.weights));
    }
    return totalSpins;
  }

  runSingleSpin(mode, stickyWilds) {
    let isFree = (mode === 'FREE');
    let reelsConfig = isFree ? this.config.reels.free : this.config.reels.base;
    let cols = this.config.grid.cols;
    let rows = this.config.grid.rows;

    let grid = Array.from({ length: cols }, () => Array(rows).fill(null));
    let wildMults = Array.from({ length: cols }, () => Array(rows).fill(1));
    let bonusCount = 0;
    
    let spinSymbolCounts = {};
    let spinTotalSymbols = 0;

    // Generate grid
    for (let c = 0; c < cols; c++) {
      let reelWeights = reelsConfig[c];
      let hasBonusOnReel = false;

      for (let r = 0; r < rows; r++) {
        // Enforce sticky wilds in free mode
        if (isFree && stickyWilds[c][r] !== null) {
          grid[c][r] = 'WILD';
          wildMults[c][r] = stickyWilds[c][r];
          continue;
        }

        let sym = this.getRandomSymbol(reelWeights);
        grid[c][r] = sym;
        spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
        spinTotalSymbols++;

        if (sym === 'WILD') {
            let m = this.getRandomWildMultiplier();
            wildMults[c][r] = m;
            if (isFree) {
                stickyWilds[c][r] = m;
            }
        } else if (sym === 'BONUS') {
            hasBonusOnReel = true;
        }
      }
      
      if (hasBonusOnReel) bonusCount++;
    }

    let spinWinCoins = 0;
    let spinSymbolWins = {};

    // Evaluate paylines
    for (let line of this.config.paylines) {
      let firstSym = null;
      let count = 0;
      let lineWildM = 0; // Dog House adds wild multipliers

      for (let c = 0; c < cols; c++) {
        let r = line[c];
        let sym = grid[c][r];

        if (sym === 'BONUS') {
            break; // Bonus symbol does not pay on lines
        }

        if (c === 0) {
            if (sym === 'WILD') {
                firstSym = 'WILD'; // Actually, wild is not on reel 0 in Dog House! But logically handling it.
                count++;
                lineWildM += wildMults[c][r];
            } else {
                firstSym = sym;
                count++;
            }
        } else {
            if (firstSym === 'WILD' && sym !== 'WILD') {
                // Wild on first reel matched with a normal symbol
                firstSym = sym;
                count++;
            } else if (sym === firstSym || sym === 'WILD') {
                count++;
                if (sym === 'WILD') {
                    lineWildM += wildMults[c][r];
                }
            } else {
                break;
            }
        }
      }

      if (count >= 3 && firstSym !== 'WILD') {
        let payObj = this.config.payouts[firstSym];
        if (payObj && payObj[count]) {
            let linePayout = payObj[count];
            let multiplier = lineWildM > 0 ? lineWildM : 1;
            let winCoins = (linePayout * multiplier);
            spinWinCoins += winCoins;
            spinSymbolWins[firstSym] = (spinSymbolWins[firstSym] || 0) + (winCoins / this.config.paylines.length);
        }
      }
    }

    // Convert coins to X bet
    let spinWinX = spinWinCoins / this.config.paylines.length;
    let bonusTriggered = (!isFree && bonusCount >= this.config.bonusTriggerReels.length);

    return {
      win: spinWinX,
      bonusTriggered,
      symbolWins: spinSymbolWins,
      symbolCounts: spinSymbolCounts,
      totalSymbolsDropped: spinTotalSymbols
    };
  }
}

if (typeof window !== 'undefined') {
  window.DogHouseGame = DogHouseGame;
}
