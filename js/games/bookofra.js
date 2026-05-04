class BookOfRaGame {
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

    let freeSpinsCount = 0;
    let expandingSymbol = null;

    if (isBuy) {
        freeSpinsCount = this.config.freeSpinsAwarded;
        expandingSymbol = this.getRandomSymbol(this.config.expandingSymbolWeights);
    }

    // Play BASE spin
    if (!isBuy) {
      let baseRes = this.runSingleSpin('BASE', null);
      stats.baseWin += baseRes.win;
      totalWin += baseRes.win;
      
      this.mergeStats(stats, baseRes);

      if (baseRes.bonusTriggered) {
        stats.isBonusTriggered = true;
        freeSpinsCount = this.config.freeSpinsAwarded;
        expandingSymbol = this.getRandomSymbol(this.config.expandingSymbolWeights);
      }
    }

    // Play FREE spins
    if (freeSpinsCount > 0) {
      let spinsRemaining = freeSpinsCount;
      while (spinsRemaining > 0) {
        stats.freeSpinsPlayed++;
        spinsRemaining--;
        
        let freeRes = this.runSingleSpin('FREE', expandingSymbol);
        stats.bonusWin += freeRes.win;
        totalWin += freeRes.win;
        
        this.mergeStats(stats, freeRes);

        if (freeRes.bonusTriggered) {
          stats.retriggers++;
          spinsRemaining += this.config.freeSpinsAwarded;
        }
      }
    }

    stats.totalWin = totalWin;
    return stats;
  }

  mergeStats(stats, spinRes) {
      if (spinRes.symbolWins) {
        for (let sym in spinRes.symbolWins) {
          stats.symbolWins[sym] = (stats.symbolWins[sym] || 0) + spinRes.symbolWins[sym];
        }
      }
      if (spinRes.symbolCounts) {
        for (let sym in spinRes.symbolCounts) {
          stats.symbolCounts[sym] = (stats.symbolCounts[sym] || 0) + spinRes.symbolCounts[sym];
        }
      }
      stats.totalSymbolsDropped += (spinRes.totalSymbolsDropped || 0);
  }

  runSingleSpin(mode, expandingSymbol) {
    let isFree = (mode === 'FREE');
    let weights = isFree ? this.config.freeWeights : this.config.weights;
    let cols = this.config.grid.cols;
    let rows = this.config.grid.rows;

    let grid = Array.from({ length: cols }, () => Array(rows).fill(null));
    
    let spinSymbolCounts = {};
    let spinTotalSymbols = 0;
    let scatterCount = 0;

    // Generate grid
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        let sym = this.getRandomSymbol(weights);
        grid[c][r] = sym;
        spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
        spinTotalSymbols++;

        if (sym === 'BOOK') {
            scatterCount++;
        }
      }
    }

    let spinWinX = 0;
    let spinSymbolWins = {};

    // 1. Evaluate normal paylines
    for (let line of this.config.paylines) {
      let firstSym = null;
      let count = 0;

      for (let c = 0; c < cols; c++) {
        let r = line[c];
        let sym = grid[c][r];

        if (c === 0) {
            if (sym === 'BOOK') {
                firstSym = 'BOOK'; // Will change to the next symbol if any
                count++;
            } else {
                firstSym = sym;
                count++;
            }
        } else {
            if (firstSym === 'BOOK' && sym !== 'BOOK') {
                firstSym = sym;
                count++;
            } else if (sym === firstSym || sym === 'BOOK') {
                count++;
            } else {
                break;
            }
        }
      }

      if (count >= 2) {
        let symToPay = firstSym === 'BOOK' ? this.getHighestPayingSymbolForCount(count) : firstSym;
        if (symToPay && symToPay !== 'BOOK') {
            let payObj = this.config.payouts[symToPay];
            if (payObj && payObj[count]) {
                let winX = payObj[count];
                spinWinX += winX;
                spinSymbolWins[symToPay] = (spinSymbolWins[symToPay] || 0) + winX;
            }
        } else if (symToPay === 'BOOK') {
            // Unlikely case where the line is ONLY books.
            let highest = this.getHighestPayingSymbolForCount(count);
            if (highest && highest !== 'BOOK') {
                let winX = this.config.payouts[highest][count];
                spinWinX += winX;
                spinSymbolWins[highest] = (spinSymbolWins[highest] || 0) + winX;
            }
        }
      }
    }

    // 2. Evaluate Scatter (BOOK) wins
    if (scatterCount >= 3) {
        let sPay = this.config.scatterPayouts[scatterCount] || 0;
        if (sPay) {
            let winX = sPay;
            spinWinX += winX;
            spinSymbolWins['BOOK'] = (spinSymbolWins['BOOK'] || 0) + winX;
        }
    }

    let bonusTriggered = (scatterCount >= this.config.scatterTriggerCount);

    // 3. Evaluate Expanding Symbol
    if (isFree && expandingSymbol && expandingSymbol !== 'BOOK') {
        let reelsWithSymbol = 0;
        for (let c = 0; c < cols; c++) {
            let hasSymbol = false;
            for (let r = 0; r < rows; r++) {
                if (grid[c][r] === expandingSymbol) {
                    hasSymbol = true;
                    break;
                }
            }
            if (hasSymbol) reelsWithSymbol++;
        }

        let payObj = this.config.payouts[expandingSymbol];
        if (payObj && payObj[reelsWithSymbol]) {
            // Expands and pays on all 10 lines
            let winX = payObj[reelsWithSymbol] * this.config.paylines.length;
            spinWinX += winX;
            spinSymbolWins[expandingSymbol] = (spinSymbolWins[expandingSymbol] || 0) + winX;
        }
    }

    return {
      win: spinWinX,
      bonusTriggered,
      symbolWins: spinSymbolWins,
      symbolCounts: spinSymbolCounts,
      totalSymbolsDropped: spinTotalSymbols
    };
  }

  getHighestPayingSymbolForCount(count) {
      let highestSym = null;
      let highestPay = 0;
      for (let sym in this.config.payouts) {
          if (this.config.payouts[sym][count] && this.config.payouts[sym][count] > highestPay) {
              highestPay = this.config.payouts[sym][count];
              highestSym = sym;
          }
      }
      return highestSym;
  }
}

if (typeof window !== 'undefined') {
  window.BookOfRaGame = BookOfRaGame;
}
