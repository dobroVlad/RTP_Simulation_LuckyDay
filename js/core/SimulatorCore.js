class SimulatorCore {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.isRunning = false;
    this.shouldStop = false;
  }

  start(totalSpins, mode, expSettings, onProgress, onComplete) {
    this.isRunning = true;
    this.shouldStop = false;
    
    let betMultiplier = 1;
    if (mode === 'ANTE') betMultiplier = this.game.config.ante.betMultiplier;
    if (mode === 'BUY') betMultiplier = this.game.config.bonus.buyBetMultiplier;

    let stats = {
      totalSpins: totalSpins,
      spinsPlayed: 0,
      totalBet: 0,
      totalBaseWin: 0,
      totalBonusWin: 0,
      totalWin: 0,
      bonusHits: 0,
      maxWin: 0,
      winDistribution: {
        '0x': 0,
        '0-1x': 0,
        '1-5x': 0,
        '5-15x': 0,
        '15-50x': 0,
        '50-100x': 0,
        '100-500x': 0,
        '500x+': 0
      },
      totalExp: 0,
      expDistribution: {
        '0': 0,
        '>0-0.5': 0,
        '0.5-1': 0,
        '1-2': 0,
        '2-5': 0,
        '5-10': 0,
        '10+': 0
      },
      symbolWins: {},
      symbolCounts: {},
      totalSymbolsDropped: 0
    };

    const CHUNK_SIZE = 5000;
    
    const runChunk = () => {
      if (this.shouldStop) {
        this.isRunning = false;
        return;
      }

      let endTarget = Math.min(stats.spinsPlayed + CHUNK_SIZE, totalSpins);
      
      for (let i = stats.spinsPlayed; i < endTarget; i++) {
        stats.totalBet += betMultiplier;
        
        // Single spin
        let result = this.game.playSpin(mode);
        
        stats.totalBaseWin += result.baseWin;
        stats.totalBonusWin += result.bonusWin;
        stats.totalWin += result.totalWin;
        
        if (result.symbolWins) {
          for (let sym in result.symbolWins) {
            stats.symbolWins[sym] = (stats.symbolWins[sym] || 0) + result.symbolWins[sym];
          }
        }
        
        if (result.symbolCounts) {
          for (let sym in result.symbolCounts) {
            stats.symbolCounts[sym] = (stats.symbolCounts[sym] || 0) + result.symbolCounts[sym];
          }
        }
        
        if (result.totalSymbolsDropped) {
          stats.totalSymbolsDropped += result.totalSymbolsDropped;
        }
        
        if (result.isBonusTriggered) {
          stats.bonusHits++;
        }
        
        let winX = result.totalWin / 1; // Since base bet is 1
        
        if (winX > stats.maxWin) {
          stats.maxWin = winX;
        }

        // Distribution buckets
        if (winX === 0) stats.winDistribution['0x']++;
        else if (winX <= 1) stats.winDistribution['0-1x']++;
        else if (winX <= 5) stats.winDistribution['1-5x']++;
        else if (winX <= 15) stats.winDistribution['5-15x']++;
        else if (winX <= 50) stats.winDistribution['15-50x']++;
        else if (winX <= 100) stats.winDistribution['50-100x']++;
        else if (winX <= 500) stats.winDistribution['100-500x']++;
        else stats.winDistribution['500x+']++;
        
        let exp = 0;
        if (winX >= expSettings.min) {
            exp = Math.min(winX, expSettings.max);
        }
        stats.totalExp += exp;
        
        if (exp === 0) stats.expDistribution['0']++;
        else if (exp <= 0.5) stats.expDistribution['>0-0.5']++;
        else if (exp <= 1) stats.expDistribution['0.5-1']++;
        else if (exp <= 2) stats.expDistribution['1-2']++;
        else if (exp <= 5) stats.expDistribution['2-5']++;
        else if (exp <= 10) stats.expDistribution['5-10']++;
        else stats.expDistribution['10+']++;
      }
      
      stats.spinsPlayed = endTarget;
      
      let percentage = (stats.spinsPlayed / totalSpins) * 100;
      onProgress(percentage.toFixed(1), stats);

      if (stats.spinsPlayed < totalSpins) {
        // Yield to browser rendering
        setTimeout(runChunk, 0);
      } else {
        this.isRunning = false;
        onComplete(stats);
      }
    };

    runChunk();
  }

  stop() {
    this.shouldStop = true;
  }
}

if (typeof window !== 'undefined') {
  window.SimulatorCore = SimulatorCore;
}
