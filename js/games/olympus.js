class OlympusGame {
  constructor(config) {
    this.config = config;
  }

  getRandomSymbol(weights, isScatterCapped = false) {
    let total = 0;
    let effectiveWeights = { ...weights };
    
    if (isScatterCapped && this.config.bonus.scatterWeightAfterCap !== undefined) {
      effectiveWeights['SCATTER'] = this.config.bonus.scatterWeightAfterCap;
    }

    for (let k in effectiveWeights) total += effectiveWeights[k];
    let r = Math.random() * total;
    for (let k in effectiveWeights) {
      r -= effectiveWeights[k];
      if (r <= 0) return k;
    }
    return Object.keys(effectiveWeights)[0];
  }

  getRandomBombMultiplier() {
    let weights = this.config.bonus.bombMultipliers;
    let total = 0;
    for (let w of weights) total += w.weight;
    let r = Math.random() * total;
    for (let w of weights) {
      r -= w.weight;
      if (r < 0.000001) return w.x;
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
    let isAnte = (mode === 'ANTE');
    let isBuy = (mode === 'BUY');
    
    let totalWin = 0;
    let spinsToPlay = 1;
    let spinsPlayed = 0;
    let currentMode = isBuy ? 'FREE' : mode;
    
    if (isBuy) spinsToPlay = this.config.bonus.spinsOnTrigger;

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

    let globalBonusMultiplier = 0;

    let maxWinX = this.config.bonus.maxWinPerCascadeInX || 5000;

    while (spinsPlayed < Math.min(spinsToPlay, 500)) {
      spinsPlayed++;
      
      let spinResult = this.runSingleCascadeCycle(currentMode, stats.retriggers);
      let spinWin = spinResult.win;
      let spinBombs = spinResult.bombs;
      let cascadeSymWins = spinResult.symbolWins || {}; // Copy over raw wins
      
      let applicableMultiplier = 1;

      // Apply multipliers exactly like Gates of Olympus
      if (spinWin > 0) {
        if (currentMode === 'FREE') {
            if (spinBombs > 0) {
                globalBonusMultiplier += spinBombs;
                applicableMultiplier = globalBonusMultiplier;
            } else {
                // If no new bombs this spin, global multiplier is NOT applied, applicableMultiplier = 1
            }
        } else {
            // Base mode: just apply this spin's local bombs
            if (spinBombs > 0) {
                applicableMultiplier = spinBombs;
            }
        }
      }
      
      spinWin = spinWin * applicableMultiplier;
      
      for (let sym in cascadeSymWins) {
        stats.symbolWins[sym] = (stats.symbolWins[sym] || 0) + (cascadeSymWins[sym] * applicableMultiplier);
      }
      
      if (spinResult.symbolCounts) {
        for (let sym in spinResult.symbolCounts) {
          stats.symbolCounts[sym] = (stats.symbolCounts[sym] || 0) + spinResult.symbolCounts[sym];
        }
      }
      stats.totalSymbolsDropped += (spinResult.totalSymbolsDropped || 0);

      totalWin += spinWin;

      if (currentMode === 'FREE') {
        stats.bonusWin += spinWin;
        stats.freeSpinsPlayed++;
        
        if (spinResult.scatterRetriggered) {
          if (stats.retriggers < this.config.bonus.maxRetriggersPerBonus) {
            stats.retriggers++;
            spinsToPlay += this.config.bonus.spinsOnRetrigger;
          }
        }
      } else {
        stats.baseWin += spinWin;
        if (spinResult.scatterTriggered && !isBuy) {
          stats.isBonusTriggered = true;
          currentMode = 'FREE';
          spinsToPlay += this.config.bonus.spinsOnTrigger;
        }
      }

      if (totalWin >= maxWinX) {
        totalWin = maxWinX; // Capped max win
        stats.maxWinHit = true;
        break; 
      }
    }

    stats.totalWin = totalWin;
    return stats;
  }

  runSingleCascadeCycle(mode, currentRetriggers = 0) {
    let isFree = (mode === 'FREE');
    
    // Choose weights based on mode
    let weights = this.config.weights;
    if (mode === 'ANTE') weights = this.config.ante.weights;
    if (mode === 'FREE') weights = this.config.bonus.weights;
    // Note: BUY mode uses FREE which uses bonus.weights.

    let bombChance = isFree ? this.config.bonus.bombSpawnChanceBonus : this.config.bonus.bombSpawnChanceBase;
    let isScatterCapped = isFree && (currentRetriggers >= this.config.bonus.maxRetriggersPerBonus);

    let gridCells = this.config.grid.cols * this.config.grid.rows;
    let counts = {};
    let spinBombs = 0;
    
    let spinSymbolCounts = {};
    let spinTotalSymbols = 0;
    
    // Initial fill
    for (let i = 0; i < gridCells; i++) {
        if (Math.random() < bombChance) {
            spinBombs += this.getRandomBombMultiplier();
            spinSymbolCounts['BOMB'] = (spinSymbolCounts['BOMB'] || 0) + 1;
        } else {
            let sym = this.getRandomSymbol(weights, isScatterCapped);
            counts[sym] = (counts[sym] || 0) + 1;
            spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
        }
        spinTotalSymbols++;
    }

    let rawSpinWin = 0;
    let cascadeCount = 0;
    let scatterTriggered = false;
    let scatterRetriggered = false;
    let scatterPaidThisCascade = false; // To track if we already paid scatters once
    let spinSymbolWins = {}; // To track raw symbol wins before multipliers

    let scattersCount = counts['SCATTER'] || 0;
    
    // Evaluate scatter trigger only once per spin (initial drop essentially, or total max on screen)
    if (!isFree && scattersCount >= this.config.bonus.scattersToTriggerBase) {
      scatterTriggered = true;
    }
    if (isFree && scattersCount >= this.config.bonus.scattersToRetriggerBonus) {
      scatterRetriggered = true;
    }

    // Payout scatter immediately
    let sPayout = this.getScatterPayout(scattersCount);
    if (sPayout > 0) {
       rawSpinWin += sPayout;
       scatterPaidThisCascade = true;
       spinSymbolWins['SCATTER'] = (spinSymbolWins['SCATTER'] || 0) + sPayout;
       // We remove Scatters
       counts['SCATTER'] = 0; 
    }

    let cellsToRefill = scatterPaidThisCascade ? scattersCount : 0;
    if (cellsToRefill > 0) {
        // refill missing cells from scatter
        for (let i = 0; i < cellsToRefill; i++) {
            if (Math.random() < bombChance) {
                spinBombs += this.getRandomBombMultiplier();
                spinSymbolCounts['BOMB'] = (spinSymbolCounts['BOMB'] || 0) + 1;
            } else {
                let sym = this.getRandomSymbol(weights, isScatterCapped);
                counts[sym] = (counts[sym] || 0) + 1;
                spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
            }
            spinTotalSymbols++;
        }
    }

    while (cascadeCount < this.config.rules.maxCascades) {
      cascadeCount++;
      let cascadeWin = 0;
      let removedCells = 0;
      let symbolsToRemove = [];

      for (let sym in counts) {
        if (sym === 'SCATTER') continue; // Scatters are handled. In Olympus they don't cascade down to pay multiple times.
        if (counts[sym] >= this.config.rules.minSymbolsForPay) {
          let p = this.getSymbolPayout(sym, counts[sym]);
          if (p > 0) {
            cascadeWin += p;
            symbolsToRemove.push(sym);
            spinSymbolWins[sym] = (spinSymbolWins[sym] || 0) + p;
          }
        }
      }

      if (cascadeWin === 0) {
        break; // No more cascades
      }

      rawSpinWin += cascadeWin;

      // Remove symbols
      for (let sym of symbolsToRemove) {
        removedCells += counts[sym];
        counts[sym] = 0;
      }

      // Refill
      for (let i = 0; i < removedCells; i++) {
        if (Math.random() < bombChance) {
            spinBombs += this.getRandomBombMultiplier();
            spinSymbolCounts['BOMB'] = (spinSymbolCounts['BOMB'] || 0) + 1;
        } else {
            let sym = this.getRandomSymbol(weights, isScatterCapped);
            counts[sym] = (counts[sym] || 0) + 1;
            spinSymbolCounts[sym] = (spinSymbolCounts[sym] || 0) + 1;
        }
        spinTotalSymbols++;
      }
    }

    return {
      win: rawSpinWin,
      bombs: spinBombs,
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
  window.OlympusGame = OlympusGame;
}
