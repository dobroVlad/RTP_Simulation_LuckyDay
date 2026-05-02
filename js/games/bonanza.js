class BonanzaGame {
  constructor(config) {
    this.config = config;
  }

  // Helper to choose random from weights
  getRandomSymbol(weights, isScatterCapped = false) {
    let total = 0;
    let effectiveWeights = { ...weights };
    
    // Handle scatter cap logic
    if (isScatterCapped && this.config.bonus.scatterWeightAfterCap !== undefined) {
      effectiveWeights['SCATTER'] = this.config.bonus.scatterWeightAfterCap;
    }

    for (let k in effectiveWeights) total += effectiveWeights[k];
    let r = Math.random() * total;
    for (let k in effectiveWeights) {
      r -= effectiveWeights[k];
      if (r <= 0) return k;
    }
    // Fallback
    return Object.keys(effectiveWeights)[0];
  }

  getRandomBombMultiplier() {
    let weights = this.config.bonus.bombMultipliers;
    let total = 0;
    for (let w of weights) total += w.weight;
    let r = Math.random() * total;
    for (let w of weights) {
      if (w.weight === 0) continue;
      r -= w.weight;
      if (r <= 0) return w.x;
    }
    // Fallback: return last entry with non-zero weight
    for (let i = weights.length - 1; i >= 0; i--) {
      if (weights[i].weight > 0) return weights[i].x;
    }
    return weights[weights.length - 1].x;
  }

  getSymbolPayout(symbol, count) {
    let payTable = this.config.payouts[symbol];
    if (!payTable) return 0;
    for (let tier of payTable) {
      if (count >= tier.min && count <= tier.max) return tier.x;
    }
    return 0;
  }

  getScatterPayout(count) {
    let payTable = this.config.payouts['SCATTER_PAY'];
    if (!payTable) return 0;
    let highestPay = 0;
    for (let tier of payTable) {
      if (count >= tier.n && tier.x > highestPay) highestPay = tier.x;
    }
    return highestPay;
  }

  playSpin(mode = 'BASE') {
    let initialMode = mode;
    let isAnte = (mode === 'ANTE');
    let isBuy = (mode === 'BUY');
    
    let totalWin = 0;
    let spinsToPlay = 1;
    let spinsPlayed = 0;
    let currentMode = isBuy ? 'FREE' : (isAnte ? 'ANTE' : 'BASE');
    
    if (isBuy) spinsToPlay = this.config.bonus.spinsOnTrigger; // Assume buy instantly starts free spins

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

    while (spinsPlayed < Math.min(spinsToPlay, 500)) { // sanity cap
      spinsPlayed++;
      
      let spinResult = this.runSingleCascadeCycle(currentMode, stats.retriggers);
      totalWin += spinResult.win;
      
      if (spinResult.symbolWins) {
        for (let sym in spinResult.symbolWins) {
          stats.symbolWins[sym] = (stats.symbolWins[sym] || 0) + spinResult.symbolWins[sym];
        }
      }
      
      if (spinResult.symbolCounts) {
        for (let sym in spinResult.symbolCounts) {
          stats.symbolCounts[sym] = (stats.symbolCounts[sym] || 0) + spinResult.symbolCounts[sym];
        }
      }
      stats.totalSymbolsDropped += (spinResult.totalSymbolsDropped || 0);

      if (currentMode === 'FREE') {
        stats.bonusWin += spinResult.win;
        stats.freeSpinsPlayed++;
        
        // Handle Retriggers
        if (spinResult.scatterRetriggered) {
          if (stats.retriggers < this.config.bonus.maxRetriggersPerBonus) {
            stats.retriggers++;
            spinsToPlay += this.config.bonus.spinsOnRetrigger;
          }
        }
      } else {
        stats.baseWin += spinResult.win;
        // Trigger Free Spins from Base?
        if (spinResult.scatterTriggered && !isBuy) {
          stats.isBonusTriggered = true;
          // After this spin, switch to FREE mode and add free spins
          currentMode = 'FREE';
          spinsToPlay += this.config.bonus.spinsOnTrigger; // Spins left will increase, loop will continue
        }
      }

      // Check max win cap
      if (totalWin >= this.config.bonus.maxWinPerCascadeInX) {
        totalWin = this.config.bonus.maxWinPerCascadeInX;
        stats.maxWinHit = true;
        break; // Free game is over
      }
    }

    stats.totalWin = totalWin;
    return stats;
  }

  runSingleCascadeCycle(mode, currentRetriggers = 0) {
    let isFree = (mode === 'FREE');
    let weights = this.config.weights;
    if (mode === 'ANTE') weights = this.config.ante.weights;
    if (mode === 'FREE') weights = this.config.bonus.weights;

    let isScatterCapped = isFree && (currentRetriggers >= this.config.bonus.maxRetriggersPerBonus);

    let gridCells = this.config.grid.cols * this.config.grid.rows;
    let counts = {};
    let bombSum = 0;
    
    let spinSymbolCounts = {};
    let spinTotalSymbols = 0;
    
    // Initial fill
    for (let i = 0; i < gridCells; i++) {
      let sym = this.getRandomSymbol(weights, isScatterCapped);
      if (sym === 'BOMB' && isFree) {
        bombSum += this.getRandomBombMultiplier();
        spinSymbolCounts['BOMB'] = (spinSymbolCounts['BOMB'] || 0) + 1;
      } else {
        counts[sym] = (counts[sym] || 0) + 1;
        spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
      }
      spinTotalSymbols++;
    }

    let spinWin = 0;
    let cascadeCount = 0;
    let scatterTriggered = false;
    let scatterRetriggered = false;
    let spinSymbolWins = {};

    // Track scatters that pay in this entire cascade cycle (for Sweet Bonanza like games)
    // Actually, in config it says `removeScattersOnPay`. So we check them every cascade.
    
    while (cascadeCount < this.config.rules.maxCascades) {
      cascadeCount++;
      let cascadeWin = 0;
      let removedCells = 0;

      // Check Scatters first (they trigger and might pay)
      let scattersCount = counts['SCATTER'] || 0;
      let scatterPaidThisCascade = false;

      if (!isFree && scattersCount >= this.config.bonus.scattersToTriggerBase) {
        scatterTriggered = true;
      }
      if (isFree && scattersCount >= this.config.bonus.scattersToRetriggerBonus) {
        scatterRetriggered = true;
      }

      // Scatter payout
      let sPayout = this.getScatterPayout(scattersCount);
      if (sPayout > 0) {
        cascadeWin += sPayout;
        scatterPaidThisCascade = true;
        spinSymbolWins['SCATTER'] = (spinSymbolWins['SCATTER'] || 0) + sPayout;
      }

      // Normal symbols payout
      let symbolsToRemove = [];
      for (let sym in counts) {
        if (sym === 'SCATTER' || sym === 'BOMB') continue;
        if (counts[sym] >= this.config.rules.scatterPayThreshold) {
          let p = this.getSymbolPayout(sym, counts[sym]);
          if (p > 0) {
            cascadeWin += p;
            symbolsToRemove.push(sym);
            spinSymbolWins[sym] = (spinSymbolWins[sym] || 0) + p;
          }
        }
      }

      if (cascadeWin === 0 && !scatterPaidThisCascade) {
        // No pays this cascade, we are done.
        break;
      }

      spinWin += cascadeWin;

      // Remove symbols
      for (let sym of symbolsToRemove) {
        removedCells += counts[sym];
        counts[sym] = 0;
      }

      if (scatterPaidThisCascade) {
        if (this.config.rules.removeScattersOnPay) {
          if (!isFree || (isFree && !this.config.rules.removeScattersAlwaysInBonus)) {
             // wait, if "removeScattersAlwaysInBonus: false", it means in bonus we maybe DO NOT remove?
             // Let's implement it carefully:
             if (!(isFree && this.config.rules.removeScattersAlwaysInBonus === false)) {
                removedCells += counts['SCATTER'];
                counts['SCATTER'] = 0;
             }
          } else {
             removedCells += counts['SCATTER'];
             counts['SCATTER'] = 0;
          }
        }
      }

      // If nothing removed, stop cascade
      if (removedCells === 0) {
         break;
      }

      // Refill
      for (let i = 0; i < removedCells; i++) {
        let sym = this.getRandomSymbol(weights, isScatterCapped);
        if (sym === 'BOMB' && isFree) {
          bombSum += this.getRandomBombMultiplier();
          spinSymbolCounts['BOMB'] = (spinSymbolCounts['BOMB'] || 0) + 1;
        } else {
          counts[sym] = (counts[sym] || 0) + 1;
          spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
        }
        spinTotalSymbols++;
      }
    }

    // Apply bomb multipliers at the end of the cascade sequence
    if (isFree && spinWin > 0 && bombSum > 0) {
      spinWin = spinWin * bombSum;
      for (let sym in spinSymbolWins) {
        spinSymbolWins[sym] *= bombSum;
      }
    }

    return {
      win: spinWin,
      scatterTriggered,
      scatterRetriggered,
      symbolWins: spinSymbolWins,
      symbolCounts: spinSymbolCounts,
      totalSymbolsDropped: spinTotalSymbols
    };
  }
}

// Export for browser
if (typeof window !== 'undefined') {
  window.BonanzaGame = BonanzaGame;
}
