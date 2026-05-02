let currentConfig = JSON.parse(JSON.stringify(BONANZA_CONFIG));
let gameEngine = new window.BonanzaGame(currentConfig);
let simulator = new window.SimulatorCore(gameEngine);
let winChart = null;
let expChart = null;
let lastRunStats = null;
let baselineStats = null;
let simulationHistory = [];
let testCounter = 1;

function renderAllConfigs() {
  renderWeightsGrid();
  renderPayoutsGrid();
  renderBombsGrid();
  renderTheoreticalProbabilities();
}

function initUI() {
  const engineSelect = document.getElementById('sim-engine');
  engineSelect.addEventListener('change', () => {
    let eng = engineSelect.value;
    if (eng === 'olympus') {
      currentConfig = JSON.parse(JSON.stringify(OLYMPUS_CONFIG));
      gameEngine = new window.OlympusGame(currentConfig);
    } else if (eng === 'doghouse') {
      currentConfig = JSON.parse(JSON.stringify(DOG_HOUSE_CONFIG));
      gameEngine = new window.DogHouseGame(currentConfig);
    } else {
      currentConfig = JSON.parse(JSON.stringify(BONANZA_CONFIG));
      gameEngine = new window.BonanzaGame(currentConfig);
    }
    simulator = new window.SimulatorCore(gameEngine);
    lastRunStats = null;
    baselineStats = null;
    simulationHistory = [];
    testCounter = 1;
    renderHistory();
    renderAllConfigs();
  });

  const modeSelect = document.getElementById('sim-mode');
  modeSelect.addEventListener('change', () => {
    renderWeightsGrid();
    renderTheoreticalProbabilities();
  });
  
  document.getElementById('reel-mode-select').addEventListener('change', () => {
    renderWeightsGrid();
    renderTheoreticalProbabilities();
  });
  
  document.getElementById('reel-index-select').addEventListener('change', () => {
    renderWeightsGrid();
    renderTheoreticalProbabilities();
  });
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
      e.target.classList.add('active');
      const tabId = 'tab-' + e.target.getAttribute('data-tab');
      document.getElementById(tabId).style.display = 'block';
    });
  });

  document.getElementById('btn-start').addEventListener('click', () => {
    if (simulator.isRunning) {
      simulator.stop();
      setButtonState(false);
    } else {
      startSimulation();
    }
  });

  // Export Logic
  document.getElementById('btn-export-config').addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(currentConfig, null, 2));
    const engine = document.getElementById('sim-engine').value;
    
    let rtpSuffix = '';
    const currentConfigStr = JSON.stringify(currentConfig);
    
    for (let i = simulationHistory.length - 1; i >= 0; i--) {
       if (JSON.stringify(simulationHistory[i].config) === currentConfigStr) {
           let entryStats = simulationHistory[i].stats;
           if (entryStats && entryStats.totalBet > 0) {
               let rtp = (entryStats.totalWin / entryStats.totalBet) * 100;
               rtpSuffix = `_RTP_${rtp.toFixed(2)}`;
           }
           break;
       }
    }
    
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `${engine}_config${rtpSuffix}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  });

  // Import Logic
  const fileInput = document.getElementById('file-import-config');
  document.getElementById('btn-import-config').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed) {
            currentConfig = parsed;
            gameEngine.config = currentConfig;
            renderAllConfigs();
        }
      } catch (err) {
        alert('Invalid JSON configuration file.');
      }
      fileInput.value = '';
    };
    reader.readAsText(file);
  });

  renderAllConfigs();
  initChart();
}

function renderHistory() {
  const hContainer = document.getElementById('history-container');
  const hList = document.getElementById('history-list');
  if (!hContainer || !hList) return;
  
  if (simulationHistory.length > 0) {
    hContainer.style.display = 'block';
  } else {
    hContainer.style.display = 'none';
  }

  hList.innerHTML = '';

  simulationHistory.forEach((entry) => {
    const item = document.createElement('div');
    item.className = 'history-item';
    
    if (baselineStats && JSON.stringify(baselineStats) === JSON.stringify(entry.stats)) {
        item.classList.add('active-baseline');
    }

    let rtp = 0;
    if (entry.stats.totalBet > 0) {
        rtp = (entry.stats.totalWin / entry.stats.totalBet) * 100;
    }
    
    const info = document.createElement('div');
    info.className = 'history-item-info';
    info.innerText = `Тест ${entry.id} - RTP ${rtp.toFixed(2)}%`;

    const actions = document.createElement('div');
    actions.className = 'history-actions';

    const btnCompare = document.createElement('button');
    btnCompare.className = 'hist-btn';
    btnCompare.title = 'Порівняти (Встановити як базу)';
    btnCompare.innerText = '⚖️';
    btnCompare.addEventListener('click', () => {
        baselineStats = JSON.parse(JSON.stringify(entry.stats));
        renderHistory();
        if (lastRunStats) {
            updateSymbolRTP(lastRunStats);
            updateSymbolFreq(lastRunStats);
            if (winChart) winChart.update();
            if (expChart) expChart.update();
        }
    });

    const btnApply = document.createElement('button');
    btnApply.className = 'hist-btn';
    btnApply.title = 'Застосувати налаштування';
    btnApply.innerText = '⟲';
    btnApply.addEventListener('click', () => {
        currentConfig = JSON.parse(JSON.stringify(entry.config));
        gameEngine.config = currentConfig;
        renderAllConfigs();
    });

    actions.appendChild(btnCompare);
    actions.appendChild(btnApply);
    
    item.appendChild(info);
    item.appendChild(actions);
    hList.appendChild(item);
  });
}

function renderWeightsGrid() {
  const container = document.getElementById('weights-container');
  container.innerHTML = '';
  
  const simMode = document.getElementById('sim-mode').value;
  const multiSelectors = document.getElementById('multi-reel-selectors');
  
  if (currentConfig.reels) {
    multiSelectors.style.display = 'block';
    const reelMode = document.getElementById('reel-mode-select').value;
    const reelIdx = parseInt(document.getElementById('reel-index-select').value);
    
    let activeWeights = currentConfig.reels[reelMode][reelIdx];
    
    for (let sym in activeWeights) {
      createWeightInput(container, sym, activeWeights[sym], (val) => {
        currentConfig.reels[reelMode][reelIdx][sym] = val;
        gameEngine.config = currentConfig;
        renderTheoreticalProbabilities();
      });
    }
  } else {
    multiSelectors.style.display = 'none';
    let activeWeights = currentConfig.weights;
    if (simMode === 'ANTE' && currentConfig.ante) activeWeights = currentConfig.ante.weights;
    if (simMode === 'BUY' && currentConfig.bonus) activeWeights = currentConfig.bonus.weights;

    for (let sym in activeWeights) {
      createWeightInput(container, sym, activeWeights[sym], (val) => {
        if (simMode === 'ANTE' && currentConfig.ante) currentConfig.ante.weights[sym] = val;
        else if (simMode === 'BUY') currentConfig.bonus.weights[sym] = val;
        else currentConfig.weights[sym] = val;
        gameEngine.config = currentConfig;
        renderTheoreticalProbabilities();
      });
    }
  }
}

function createWeightInput(container, sym, initialValue, onChange) {
  const div = document.createElement('div');
  div.className = 'weight-item';
  const label = document.createElement('label');
  label.innerText = sym;
  const input = document.createElement('input');
  input.type = 'number';
  input.step = '0.01';
  input.value = initialValue;
  input.addEventListener('change', (e) => {
    onChange(parseFloat(e.target.value) || 0);
  });
  div.appendChild(label);
  div.appendChild(input);
  container.appendChild(div);
}

function renderPayoutsGrid() {
  const container = document.getElementById('payouts-container');
  container.innerHTML = '';
  
  for (let sym in currentConfig.payouts) {
    const div = document.createElement('div');
    div.className = 'payout-item';
    
    const title = document.createElement('div');
    title.className = 'payout-item-title';
    title.innerText = sym;
    div.appendChild(title);
    
    let payoutsObj = currentConfig.payouts[sym];
    
    if (Array.isArray(payoutsObj)) {
      payoutsObj.forEach((p, index) => {
        const row = document.createElement('div');
        row.className = 'payout-row';
        row.innerHTML = `
          <input type="number" step="1" style="width: 50px" value="${p.min}">
          <span style="color: var(--text-muted)">-</span>
          <input type="number" step="1" style="width: 50px" value="${p.max}">
          <span style="color: var(--text-muted); margin-left: 5px;">=</span>
          <input type="number" step="0.1" style="width: 70px" value="${p.x}">
          <span style="color: var(--text-muted)">x</span>
        `;
        const inputs = row.querySelectorAll('input');
        inputs[0].addEventListener('change', e => { p.min = parseInt(e.target.value) || 0; gameEngine.config = currentConfig; });
        inputs[1].addEventListener('change', e => { p.max = parseInt(e.target.value) || 0; gameEngine.config = currentConfig; });
        inputs[2].addEventListener('change', e => { p.x = parseFloat(e.target.value) || 0; gameEngine.config = currentConfig; });
        div.appendChild(row);
      });
    } else {
      for (let count in payoutsObj) {
        const row = document.createElement('div');
        row.className = 'payout-row';
        row.innerHTML = `
          <label>${count}</label>
          <input type="number" step="0.1" value="${payoutsObj[count]}">
        `;
        const ipt = row.querySelector('input');
        ipt.addEventListener('change', e => {
            payoutsObj[count] = parseFloat(e.target.value) || 0;
            gameEngine.config = currentConfig;
        });
        div.appendChild(row);
      }
    }
    container.appendChild(div);
  }
}

function renderBombsGrid() {
  const container = document.getElementById('bombs-container');
  const btnBombs = document.getElementById('tab-btn-bombs');
  container.innerHTML = '';
  
  if (!currentConfig.bonus || !currentConfig.bonus.bombMultipliers) {
    btnBombs.style.display = 'none';
    if(btnBombs.classList.contains('active')) document.querySelector('.tab-btn[data-tab="weights"]').click();
    return;
  }
  btnBombs.style.display = 'inline-block';
  
  currentConfig.bonus.bombMultipliers.forEach((bomb, index) => {
    createWeightInput(container, bomb.x + 'x Bomb (Weight)', bomb.weight, (val) => {
      bomb.weight = val;
      gameEngine.config = currentConfig;
    });
  });
}

function renderTheoreticalProbabilities() {
  const container = document.getElementById('theory-prob-list');
  if (!container || !currentConfig.grid) return;
  
  let expectedCounts = {};
  let totalExpected = 0;
  
  const cols = currentConfig.grid.cols || 6;
  const rows = currentConfig.grid.rows || 5;
  
  const mode = document.getElementById('sim-mode') ? document.getElementById('sim-mode').value : 'BASE';
  const isFree = mode === 'BUY';
  const isAnte = mode === 'ANTE';
  
  if (currentConfig.reels) {
      const reelMode = document.getElementById('reel-mode-select') ? document.getElementById('reel-mode-select').value : 'base';
      const reels = currentConfig.reels[reelMode] || currentConfig.reels['base'];
      
      reels.forEach((reelWeights) => {
          let reelTotal = 0;
          for (let sym in reelWeights) reelTotal += reelWeights[sym];
          
          for (let sym in reelWeights) {
              let prob = reelTotal > 0 ? (reelWeights[sym] / reelTotal) : 0;
              let expectedInReel = prob * rows;
              expectedCounts[sym] = (expectedCounts[sym] || 0) + expectedInReel;
              totalExpected += expectedInReel;
          }
      });
  } else {
      let weights = currentConfig.weights;
      if (isAnte && currentConfig.ante) weights = currentConfig.ante.weights;
      if (isFree && currentConfig.bonus) weights = currentConfig.bonus.weights;
      
      let totalWeight = 0;
      for (let sym in weights) totalWeight += weights[sym];
      
      for (let sym in weights) {
          let prob = totalWeight > 0 ? (weights[sym] / totalWeight) : 0;
          let expected = prob * (cols * rows);
          expectedCounts[sym] = expected;
          totalExpected += expected;
      }
  }
  
  let sortedSymbols = Object.keys(expectedCounts).map(sym => {
      return {
          sym: sym,
          expected: expectedCounts[sym],
          percentage: totalExpected > 0 ? (expectedCounts[sym] / totalExpected) * 100 : 0
      };
  }).sort((a, b) => b.expected - a.expected);
  
  container.innerHTML = '';
  
  let maxExpected = sortedSymbols.length > 0 ? sortedSymbols[0].expected : 1;
  if (maxExpected <= 0) maxExpected = 1;
  
  sortedSymbols.forEach(item => {
      let fillWidth = (item.expected / maxExpected) * 100;
      fillWidth = Math.min(fillWidth, 100);
      
      const row = document.createElement('div');
      row.className = 'symbol-rtp-row';
      row.innerHTML = `
          <div class="symbol-rtp-label" title="${item.sym}">${item.sym}</div>
          <div class="theory-bar-bg">
              <div class="theory-fill" style="width: ${fillWidth}%"></div>
              <div class="theory-text">
                  <span>${item.percentage.toFixed(2)}%</span>
                  <span style="opacity: 0.8; font-weight: 600;">(x${item.expected.toFixed(2)})</span>
              </div>
          </div>
      `;
      container.appendChild(row);
  });
}

function initChart() {
  const ctx = document.getElementById('win-chart').getContext('2d');
  
  if (typeof ChartDataLabels !== 'undefined') {
    Chart.register(ChartDataLabels);
  }
  
  // Dark theme chart configuration
  Chart.defaults.color = '#9ba1b0';
  Chart.defaults.font.family = "'Inter', sans-serif";
  
  winChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['0x', '0-1x', '1-5x', '5-15x', '15-50x', '50-100x', '100-500x', '500x+'],
      datasets: [{
        label: 'Win Frequency',
        data: [0, 0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',   // 0x (reddish)
          'rgba(155, 161, 176, 0.5)', // 0-1x
          'rgba(59, 130, 246, 0.6)',  // 1-5x
          'rgba(16, 185, 129, 0.7)',  // 5-15x (green)
          'rgba(124, 58, 237, 0.8)',  // 15-50x (purple)
          'rgba(236, 72, 153, 0.8)',  // 50-100x (pinkish)
          'rgba(245, 158, 11, 0.9)',  // 100-500x (orange)
          'rgba(252, 211, 77, 1)'     // 500x+ (gold)
        ],
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 20 }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#f0f2f5',
          anchor: 'end',
          align: 'end',
          formatter: (value, context) => {
            if (!baselineStats && value === 0) return '';
            
            let currentProb = (lastRunStats && lastRunStats.spinsPlayed) 
                ? (value / lastRunStats.spinsPlayed) * 100 
                : 0;
                
            let currentStr = currentProb.toFixed(3) + '%';
            
            if (baselineStats && baselineStats.winDistribution && lastRunStats) {
                let keys = ['0x', '0-1x', '1-5x', '5-15x', '15-50x', '50-100x', '100-500x', '500x+'];
                let key = keys[context.dataIndex];
                
                let baselineCount = baselineStats.winDistribution[key] || 0;
                let baselineProb = (baselineCount / baselineStats.spinsPlayed) * 100;
                
                let delta = currentProb - baselineProb;
                if (Math.abs(delta) > 0.005) {
                    let sign = delta > 0 ? '+' : '';
                    return [currentStr, `(${sign}${delta.toFixed(2)}%)`];
                }
            }
            return value > 0 ? currentStr : '';
          },
          font: {
            family: "'Inter', sans-serif",
            weight: 'bold',
            size: 11
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          grace: '15%',
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });

  const ctxExp = document.getElementById('exp-chart').getContext('2d');
  
  expChart = new Chart(ctxExp, {
    type: 'bar',
    data: {
      labels: ['0', '>0-0.5', '0.5-1', '1-2', '2-5', '5-10', '10+'],
      datasets: [{
        label: 'EXP Frequency',
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          'rgba(239, 68, 68, 0.5)',   // 0
          'rgba(155, 161, 176, 0.5)', // >0-0.5
          'rgba(59, 130, 246, 0.6)',  // 0.5-1
          'rgba(16, 185, 129, 0.7)',  // 1-2
          'rgba(124, 58, 237, 0.8)',  // 2-5
          'rgba(236, 72, 153, 0.8)',  // 5-10
          'rgba(252, 211, 77, 1)'     // 10+
        ],
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { top: 20 }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          color: '#f0f2f5',
          anchor: 'end',
          align: 'end',
          formatter: (value, context) => {
            if (!baselineStats && value === 0) return '';
            
            let currentProb = (lastRunStats && lastRunStats.spinsPlayed) 
                ? (value / lastRunStats.spinsPlayed) * 100 
                : 0;
                
            let currentStr = currentProb.toFixed(3) + '%';
            
            if (baselineStats && baselineStats.expDistribution && lastRunStats) {
                let keys = ['0', '>0-0.5', '0.5-1', '1-2', '2-5', '5-10', '10+'];
                let key = keys[context.dataIndex];
                
                let baselineCount = baselineStats.expDistribution[key] || 0;
                let baselineProb = (baselineCount / baselineStats.spinsPlayed) * 100;
                
                let delta = currentProb - baselineProb;
                if (Math.abs(delta) > 0.005) {
                    let sign = delta > 0 ? '+' : '';
                    return [currentStr, `(${sign}${delta.toFixed(2)}%)`];
                }
            }
            return value > 0 ? currentStr : '';
          },
          font: {
            family: "'Inter', sans-serif",
            weight: 'bold',
            size: 11
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          grace: '15%',
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function setButtonState(isSimulating) {
  const btn = document.getElementById('btn-start');
  const span = btn.querySelector('.btn-text');
  if (isSimulating) {
    btn.style.background = 'linear-gradient(135deg, #ef4444, #b91c1c)';
    span.innerText = 'Stop Simulation';
    document.getElementById('progress-container').style.display = 'block';
  } else {
    btn.style.background = '';
    span.innerText = 'Start Simulation';
    document.getElementById('progress-container').style.display = 'none';
  }
}

function formatRTP(rtp) {
  return (rtp * 100).toFixed(2) + '%';
}

function startSimulation() {
  // Sync inputs
  const mode = document.getElementById('sim-mode').value;
  let spins = parseInt(document.getElementById('sim-spins').value) || 100000;
  
  let expSettings = {
    min: parseFloat(document.getElementById('sim-exp-min').value) || 0.5,
    max: parseFloat(document.getElementById('sim-exp-max').value) || 10
  };
  
  setButtonState(true);

  // Update GameEngine config reference in case it was somehow unlinked
  gameEngine.config = currentConfig;

  simulator.start(
    spins, 
    mode, 
    expSettings,
    (progress, stats) => { // onProgress
      document.getElementById('progress-val').innerText = progress;
      document.getElementById('progress-fill').style.width = progress + '%';
      updateDashboard(stats);
    },
    (stats) => { // onComplete
      setButtonState(false);
      
      let newRunConfig = JSON.stringify(currentConfig);
      let isNewConfig = true;
      if (simulationHistory.length > 0) {
          let lastConfig = JSON.stringify(simulationHistory[simulationHistory.length - 1].config);
          if (newRunConfig === lastConfig) {
              isNewConfig = false;
          }
      }

      if (isNewConfig) {
          let entry = {
              id: testCounter++,
              config: JSON.parse(newRunConfig),
              stats: JSON.parse(JSON.stringify(stats))
          };
          simulationHistory.push(entry);
          
          if (simulationHistory.length > 1) {
              baselineStats = JSON.parse(JSON.stringify(simulationHistory[simulationHistory.length - 2].stats));
          }
      } else {
          if (simulationHistory.length > 0) {
              simulationHistory[simulationHistory.length - 1].stats = JSON.parse(JSON.stringify(stats));
          }
      }

      lastRunStats = JSON.parse(JSON.stringify(stats));
      renderHistory();
      updateDashboard(stats);
    }
  );
}

function updateDashboard(stats) {
  const totalRtp = (stats.totalWin / stats.totalBet) || 0;
  const baseRtp = (stats.totalBaseWin / stats.totalBet) || 0;
  const bonusRtp = (stats.totalBonusWin / stats.totalBet) || 0;
  
  document.getElementById('hdr-rtp').innerText = formatRtpWithColor(totalRtp);
  document.getElementById('val-total-rtp').innerText = formatRtpWithColor(totalRtp);
  document.getElementById('val-base-rtp').innerText = formatRtpWithColor(baseRtp);
  document.getElementById('val-bonus-rtp').innerText = formatRtpWithColor(bonusRtp);
  
  document.getElementById('val-max-win').innerText = stats.maxWin.toFixed(2) + 'x';
  
  // Hit frequency
  let freq = stats.bonusHits > 0 ? Math.round(stats.totalSpins / stats.bonusHits) : 0;
  document.getElementById('val-hit-freq').innerText = freq > 0 ? `1 in ${freq}` : '0';
  
  // Avg Bonus Win
  let avgBonus = stats.bonusHits > 0 ? (stats.totalBonusWin / stats.bonusHits) : 0;
  document.getElementById('val-avg-bonus').innerText = avgBonus.toFixed(2) + 'x';

  // Avg EXP/Spin
  let avgExp = stats.spinsPlayed > 0 ? (stats.totalExp / stats.spinsPlayed) : 0;
  document.getElementById('val-avg-exp').innerText = avgExp.toFixed(3);

  // Update chart
  if (winChart) {
    winChart.data.datasets[0].data = [
      stats.winDistribution['0x'],
      stats.winDistribution['0-1x'],
      stats.winDistribution['1-5x'],
      stats.winDistribution['5-15x'],
      stats.winDistribution['15-50x'],
      stats.winDistribution['50-100x'],
      stats.winDistribution['100-500x'],
      stats.winDistribution['500x+']
    ];
    winChart.update();
  }
  
  if (expChart) {
    expChart.data.datasets[0].data = [
      stats.expDistribution['0'],
      stats.expDistribution['>0-0.5'],
      stats.expDistribution['0.5-1'],
      stats.expDistribution['1-2'],
      stats.expDistribution['2-5'],
      stats.expDistribution['5-10'],
      stats.expDistribution['10+']
    ];
    expChart.update();
  }
  
  updateSymbolRTP(stats);
  updateSymbolFreq(stats);
}

function updateSymbolFreq(stats) {
  const container = document.getElementById('symbol-freq-list');
  if (!container) return;
  
  if (!stats.totalSymbolsDropped) {
    container.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 1rem;">N/A</div>';
    return;
  }

  let symbolFreqs = [];
  for (let sym in stats.symbolCounts) {
    let freq = (stats.symbolCounts[sym] / stats.totalSymbolsDropped) * 100;
    if (freq > 0) {
      symbolFreqs.push({ sym: sym, freq: freq });
    }
  }

  symbolFreqs.sort((a, b) => b.freq - a.freq);

  let maxFreq = symbolFreqs.length > 0 ? symbolFreqs[0].freq : 1;

  container.innerHTML = '';
  
  symbolFreqs.forEach(item => {
    let fillWidth = (item.freq / maxFreq) * 100;
    fillWidth = Math.min(fillWidth, 100);

    let deltaHtml = '';
    if (baselineStats && baselineStats.symbolCounts && baselineStats.totalSymbolsDropped) {
      let baselineFreq = (baselineStats.symbolCounts[item.sym] || 0) / baselineStats.totalSymbolsDropped * 100;
      let delta = item.freq - baselineFreq;
      if (Math.abs(delta) > 0.005) {
        let sign = delta > 0 ? '+' : '';
        let deltaClass = delta > 0 ? 'delta-positive' : 'delta-negative';
        deltaHtml = `<span class="delta-badge ${deltaClass}">(${sign}${delta.toFixed(2)}%)</span>`;
      }
    }

    const row = document.createElement('div');
    row.className = 'symbol-rtp-row';
    
    row.innerHTML = `
      <div class="symbol-rtp-label" title="${item.sym}">${item.sym}</div>
      <div class="symbol-rtp-bar-bg">
        <div class="symbol-rtp-bar-fill freq-fill" style="width: ${fillWidth}%"></div>
      </div>
      <div class="symbol-rtp-value">
        <span class="val-txt">${item.freq.toFixed(2)}%</span>
        ${deltaHtml}
      </div>
    `;
    
    container.appendChild(row);
  });
}

function updateSymbolRTP(stats) {
  const container = document.getElementById('symbol-rtp-list');
  if (!container) return;
  
  if (!stats.totalBet) {
    container.innerHTML = '<div style="color: var(--text-muted); text-align: center; margin-top: 1rem;">N/A</div>';
    return;
  }

  let symbolRTPs = [];
  for (let sym in stats.symbolWins) {
    let rtp = (stats.symbolWins[sym] / stats.totalBet) * 100;
    if (rtp > 0) {
      symbolRTPs.push({ sym: sym, rtp: rtp });
    }
  }

  symbolRTPs.sort((a, b) => b.rtp - a.rtp);

  let maxRTP = symbolRTPs.length > 0 ? symbolRTPs[0].rtp : 1;

  container.innerHTML = '';
  
  symbolRTPs.forEach(item => {
    let fillWidth = (item.rtp / maxRTP) * 100;
    fillWidth = Math.min(fillWidth, 100);

    let deltaHtml = '';
    if (baselineStats && baselineStats.symbolWins && baselineStats.totalBet) {
      let baselineRtp = (baselineStats.symbolWins[item.sym] || 0) / baselineStats.totalBet * 100;
      let delta = item.rtp - baselineRtp;
      if (Math.abs(delta) > 0.005) {
        let sign = delta > 0 ? '+' : '';
        let deltaClass = delta > 0 ? 'delta-positive' : 'delta-negative';
        deltaHtml = `<span class="delta-badge ${deltaClass}">(${sign}${delta.toFixed(2)}%)</span>`;
      }
    }

    const row = document.createElement('div');
    row.className = 'symbol-rtp-row';
    
    row.innerHTML = `
      <div class="symbol-rtp-label" title="${item.sym}">${item.sym}</div>
      <div class="symbol-rtp-bar-bg">
        <div class="symbol-rtp-bar-fill" style="width: ${fillWidth}%"></div>
      </div>
      <div class="symbol-rtp-value">
        <span class="val-txt">${item.rtp.toFixed(2)}%</span>
        ${deltaHtml}
      </div>
    `;
    
    container.appendChild(row);
  });
}

function formatRtpWithColor(rtpVal) {
  return (rtpVal * 100).toFixed(2) + '%';
}

document.addEventListener('DOMContentLoaded', initUI);
