import {
  simulateBondingCurve,
  simulateSwapQuoteIn,
  generateTypeScriptCode,
  generateStudioJsonc,
  DEFAULT_CONFIG
} from './src/engine/bondingCurve.js';
import { HALAL_PRESETS } from './src/presets.js';

let currentConfig = { ...DEFAULT_CONFIG };
let currentSim = null;
let activeTab = 'ts';

// DOM Elements
const canvas = document.getElementById('curveCanvas');
const ctx = canvas.getContext('2d');
const tooltip = document.getElementById('chartTooltip');

const presetsContainer = document.getElementById('presetsContainer');
const inputCurveShape = document.getElementById('inputCurveShape');
const inputSupply = document.getElementById('inputSupply');
const inputInitialMC = document.getElementById('inputInitialMC');
const inputGradMC = document.getElementById('inputGradMC');
const inputFeeBps = document.getElementById('inputFeeBps');
const inputCreatorFee = document.getElementById('inputCreatorFee');
const inputMigratePct = document.getElementById('inputMigratePct');

const labelSupply = document.getElementById('labelSupply');
const labelFee = document.getElementById('labelFee');
const labelCreatorFee = document.getElementById('labelCreatorFee');
const labelMigratePct = document.getElementById('labelMigratePct');

const dispInitialMC = document.getElementById('dispInitialMC');
const dispInitialPrice = document.getElementById('dispInitialPrice');
const dispGradMC = document.getElementById('dispGradMC');
const dispGradPrice = document.getElementById('dispGradPrice');
const dispThreshold = document.getElementById('dispThreshold');
const dispLockedPct = document.getElementById('dispLockedPct');

const swapAmountIn = document.getElementById('swapAmountIn');
const swapProgressSlider = document.getElementById('swapProgressSlider');
const swapProgressLabel = document.getElementById('swapProgressLabel');
const resTokensOut = document.getElementById('resTokensOut');
const resPriceImpact = document.getElementById('resPriceImpact');
const resFee = document.getElementById('resFee');
const resCreatorFee = document.getElementById('resCreatorFee');
const resGradStatus = document.getElementById('resGradStatus');

const codeDisplay = document.getElementById('codeDisplay');
const btnCopyCode = document.getElementById('btnCopyCode');
const tabButtons = document.querySelectorAll('.tab-btn');

/**
 * Initialize Application
 */
function init() {
  renderPresets();
  setupEventListeners();
  resizeCanvas();
  window.addEventListener('resize', () => {
    resizeCanvas();
    drawCurve();
  });
  updateSimulation();
}

/**
 * Resize Canvas for Retina/HiDPI display
 */
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
}

/**
 * Render Preset Cards
 */
function renderPresets() {
  presetsContainer.innerHTML = '';
  HALAL_PRESETS.forEach((preset, idx) => {
    const card = document.createElement('div');
    card.className = `preset-card ${idx === 0 ? 'active' : ''}`;
    card.innerHTML = `
      <div class="preset-badge">${preset.badge}</div>
      <div class="preset-name">${preset.title}</div>
      <div class="preset-desc">${preset.description}</div>
    `;
    card.addEventListener('click', () => {
      document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      loadPreset(preset);
    });
    presetsContainer.appendChild(card);
  });
}

/**
 * Load a Preset into Form Controls
 */
function loadPreset(preset) {
  currentConfig = { ...currentConfig, ...preset.config };
  inputCurveShape.value = preset.config.curveShape;
  inputSupply.value = preset.config.totalSupply;
  inputInitialMC.value = preset.config.initialMarketCap;
  inputGradMC.value = preset.config.migrationMarketCap;
  inputFeeBps.value = preset.config.baseFeeBps;
  inputCreatorFee.value = preset.config.creatorTradingFeePercentage;
  inputMigratePct.value = preset.config.percentageSupplyOnMigration;

  updateSimulation();
}

/**
 * Update Simulation State & All Views
 */
function updateSimulation() {
  currentConfig.curveShape = inputCurveShape.value;
  currentConfig.totalSupply = parseFloat(inputSupply.value) || 1_000_000_000;
  currentConfig.initialMarketCap = parseFloat(inputInitialMC.value) || 20;
  currentConfig.migrationMarketCap = parseFloat(inputGradMC.value) || 600;
  currentConfig.baseFeeBps = parseInt(inputFeeBps.value, 10) || 100;
  currentConfig.creatorTradingFeePercentage = parseInt(inputCreatorFee.value, 10) || 50;
  currentConfig.percentageSupplyOnMigration = parseInt(inputMigratePct.value, 10) || 20;

  // Labels
  labelSupply.textContent = currentConfig.totalSupply.toLocaleString();
  labelFee.textContent = `${currentConfig.baseFeeBps} (${(currentConfig.baseFeeBps / 100).toFixed(2)}%)`;
  labelCreatorFee.textContent = `${currentConfig.creatorTradingFeePercentage}%`;
  labelMigratePct.textContent = `${currentConfig.percentageSupplyOnMigration}%`;

  try {
    currentSim = simulateBondingCurve(currentConfig);

    // Update Gauges
    dispInitialMC.textContent = `${currentSim.config.initialMarketCap} SOL`;
    dispInitialPrice.textContent = `$${currentSim.initialPrice.toFixed(8)} SOL`;
    dispGradMC.textContent = `${currentSim.config.migrationMarketCap} SOL`;
    dispGradPrice.textContent = `$${currentSim.migrationPrice.toFixed(8)} SOL`;
    dispThreshold.textContent = `${currentSim.migrationQuoteThreshold.toFixed(2)} SOL`;
    
    const lockedTotal = currentConfig.liquidityDistribution.partnerPermanentLockedLiquidityPercentage +
                        currentConfig.liquidityDistribution.creatorPermanentLockedLiquidityPercentage;
    dispLockedPct.textContent = `${lockedTotal}% Locked`;

    // Redraw Canvas
    drawCurve();

    // Update Swap Simulation
    updateSwapQuote();

    // Update Code Display
    updateCodeDisplay();

  } catch (err) {
    console.error('Simulation calculation error:', err);
  }
}

/**
 * Draw Interactive Canvas Bonding Curve
 */
function drawCurve() {
  if (!currentSim) return;

  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const padding = { top: 30, right: 30, bottom: 45, left: 65 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  const points = currentSim.samplePoints;
  const maxPrice = currentSim.migrationPrice * 1.05;
  const maxSupply = currentSim.curveTokensSupply;

  // Draw Grid Lines
  ctx.strokeStyle = '#1a1f2c';
  ctx.lineWidth = 1;
  const gridRows = 5;
  for (let i = 0; i <= gridRows; i++) {
    const y = padding.top + (graphH / gridRows) * i;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + graphW, y);
    ctx.stroke();

    // Price labels on Y axis
    const priceVal = maxPrice * (1 - i / gridRows);
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.fillText(`${(priceVal * 1e6).toFixed(2)}µ`, padding.left - 8, y + 4);
  }

  // Draw X axis grid
  const gridCols = 4;
  for (let i = 0; i <= gridCols; i++) {
    const x = padding.left + (graphW / gridCols) * i;
    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + graphH);
    ctx.stroke();

    const supplyVal = (maxSupply / gridCols) * i;
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText(`${(supplyVal / 1e6).toFixed(0)}M`, x, height - 15);
  }

  // Draw Gradient Area under Curve
  const areaGrad = ctx.createLinearGradient(0, padding.top, 0, padding.top + graphH);
  areaGrad.addColorStop(0, 'rgba(245, 75, 0, 0.35)');
  areaGrad.addColorStop(1, 'rgba(245, 75, 0, 0.0)');

  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = padding.left + (p.tokensSold / maxSupply) * graphW;
    const y = padding.top + graphH - (p.pricePerToken / maxPrice) * graphH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineTo(padding.left + graphW, padding.top + graphH);
  ctx.lineTo(padding.left, padding.top + graphH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Draw Curve Line
  ctx.beginPath();
  points.forEach((p, idx) => {
    const x = padding.left + (p.tokensSold / maxSupply) * graphW;
    const y = padding.top + graphH - (p.pricePerToken / maxPrice) * graphH;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#f54b00';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw Graduation Target Milestone Marker
  const gradX = padding.left + graphW;
  const gradY = padding.top + graphH - (currentSim.migrationPrice / maxPrice) * graphH;

  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(gradX, gradY, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Graduation Milestone Label
  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 11px Inter';
  ctx.textAlign = 'right';
  ctx.fillText('DAMM v2 Migration Threshold', gradX - 12, gradY - 8);
}

/**
 * Handle Live Swap Quoting
 */
function updateSwapQuote() {
  if (!currentSim) return;

  const quoteIn = parseFloat(swapAmountIn.value) || 1.0;
  const progressPct = parseFloat(swapProgressSlider.value) || 0;
  swapProgressLabel.textContent = `${progressPct.toFixed(1)}%`;

  const currentAccumulated = (progressPct / 100) * currentSim.migrationQuoteThreshold;

  const quote = simulateSwapQuoteIn({
    curveSim: currentSim,
    currentQuoteAccumulated: currentAccumulated,
    quoteAmountIn: quoteIn
  });

  if (quote.error) {
    resTokensOut.textContent = 'MIGRATED';
    resPriceImpact.textContent = '—';
    resFee.textContent = '—';
    resCreatorFee.textContent = '—';
    resGradStatus.textContent = 'Pool Migrated to DAMM v2!';
    resGradStatus.style.color = 'var(--accent)';
    return;
  }

  resTokensOut.textContent = `${Math.floor(quote.tokensOut).toLocaleString()} tokens`;
  resPriceImpact.textContent = `${quote.priceImpactPct.toFixed(2)}%`;
  resPriceImpact.style.color = quote.priceImpactPct > 5 ? '#f87171' : 'var(--text-main)';
  resFee.textContent = `${quote.tradingFee.toFixed(4)} SOL`;
  resCreatorFee.textContent = `${quote.creatorFee.toFixed(4)} SOL`;

  if (quote.reachesGraduation) {
    resGradStatus.textContent = 'Triggers Graduation to DAMM v2!';
    resGradStatus.style.color = 'var(--primary)';
  } else {
    resGradStatus.textContent = `On Curve (${quote.newProgressPct.toFixed(1)}% complete)`;
    resGradStatus.style.color = 'var(--text-muted)';
  }
}

/**
 * Update Code Export Display
 */
function updateCodeDisplay() {
  if (activeTab === 'ts') {
    codeDisplay.textContent = generateTypeScriptCode(currentConfig);
  } else {
    codeDisplay.textContent = generateStudioJsonc(currentConfig);
  }
}

/**
 * Event Listeners
 */
function setupEventListeners() {
  const inputs = [
    inputCurveShape, inputSupply, inputInitialMC, inputGradMC,
    inputFeeBps, inputCreatorFee, inputMigratePct
  ];
  inputs.forEach(input => {
    input.addEventListener('input', updateSimulation);
  });

  swapAmountIn.addEventListener('input', updateSwapQuote);
  swapProgressSlider.addEventListener('input', updateSwapQuote);

  // Tabs
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');
      updateCodeDisplay();
    });
  });

  // Copy Code
  btnCopyCode.addEventListener('click', () => {
    navigator.clipboard.writeText(codeDisplay.textContent);
    btnCopyCode.textContent = 'Copied!';
    setTimeout(() => {
      btnCopyCode.textContent = 'Copy Code';
    }, 2000);
  });

  // Canvas Mousemove Hover Tooltip
  canvas.addEventListener('mousemove', (e) => {
    if (!currentSim) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const paddingLeft = 65;
    const paddingRight = 30;
    const graphW = rect.width - paddingLeft - paddingRight;

    if (x < paddingLeft || x > paddingLeft + graphW) {
      tooltip.style.display = 'none';
      return;
    }

    const ratio = Math.max(0, Math.min(1, (x - paddingLeft) / graphW));
    const tokenSold = ratio * currentSim.curveTokensSupply;
    const currentPrice = currentSim.initialPrice + (currentSim.migrationPrice - currentSim.initialPrice) * Math.pow(ratio, currentSim.power);
    const marketCap = currentPrice * currentSim.totalSupply;

    tooltip.style.display = 'block';
    tooltip.style.left = `${e.clientX - rect.left + 15}px`;
    tooltip.style.top = `${e.clientY - rect.top - 20}px`;
    tooltip.innerHTML = `
      <div><strong>Supply Sold:</strong> ${Math.floor(tokenSold).toLocaleString()} (${(ratio * 100).toFixed(1)}%)</div>
      <div><strong>Price:</strong> ${currentPrice.toFixed(8)} SOL</div>
      <div><strong>Market Cap:</strong> ${marketCap.toFixed(2)} SOL</div>
    `;
  });

  canvas.addEventListener('mouseleave', () => {
    tooltip.style.display = 'none';
  });
}

// Start
init();
