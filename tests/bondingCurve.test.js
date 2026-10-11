import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  simulateBondingCurve,
  validateConfig,
  simulateSwapQuoteIn,
  generateTypeScriptCode,
  generateStudioJsonc,
  DEFAULT_CONFIG
} from '../src/engine/bondingCurve.js';
import { HALAL_PRESETS } from '../src/presets.js';

describe('Meteora DBC Mathematical Engine Tests', () => {

  it('should validate default configuration successfully', () => {
    const val = validateConfig(DEFAULT_CONFIG);
    assert.equal(val.isValid, true);
    assert.equal(val.errors.length, 0);
  });

  it('should reject baseFeeBps lower than protocol limit (25 bps)', () => {
    const val = validateConfig({ ...DEFAULT_CONFIG, baseFeeBps: 20 });
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some(e => e.includes('MIN_FEE_BPS = 25')));
  });

  it('should reject liquidity distribution that does not sum to 100%', () => {
    const val = validateConfig({
      ...DEFAULT_CONFIG,
      liquidityDistribution: {
        partnerLiquidityPercentage: 40,
        partnerPermanentLockedLiquidityPercentage: 5,
        creatorLiquidityPercentage: 40,
        creatorPermanentLockedLiquidityPercentage: 5 // 90% total
      }
    });
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some(e => e.includes('must sum to 100%')));
  });

  it('should reject liquidity distribution with less than 10% locked LP', () => {
    const val = validateConfig({
      ...DEFAULT_CONFIG,
      liquidityDistribution: {
        partnerLiquidityPercentage: 50,
        partnerPermanentLockedLiquidityPercentage: 4,
        creatorLiquidityPercentage: 42,
        creatorPermanentLockedLiquidityPercentage: 4 // only 8% locked
      }
    });
    assert.equal(val.isValid, false);
    assert.ok(val.errors.some(e => e.includes('must be permanently locked')));
  });

  it('should accurately calculate linear curve threshold and token supply', () => {
    const sim = simulateBondingCurve({
      totalSupply: 1_000_000_000,
      percentageSupplyOnMigration: 20, // 20% to DAMM v2 LP -> 800M sold on curve
      initialMarketCap: 20, // SOL
      migrationMarketCap: 600, // SOL
      curveShape: 'linear'
    });

    assert.equal(sim.curveTokensSupply, 800_000_000);
    // Linear curve average price = (20/1B + 600/1B) / 2 = 310 / 1B SOL per token
    // Total threshold = 310/1B * 800M = 248 SOL
    assert.ok(Math.abs(sim.migrationQuoteThreshold - 248) < 0.001);
    assert.equal(sim.samplePoints.length, 51);
    assert.equal(sim.samplePoints[0].tokensSold, 0);
    assert.equal(sim.samplePoints[50].tokensSold, 800_000_000);
  });

  it('should accurately simulate exact-in swap with fee split', () => {
    const sim = simulateBondingCurve(DEFAULT_CONFIG);
    const swap = simulateSwapQuoteIn({
      curveSim: sim,
      currentQuoteAccumulated: 0,
      quoteAmountIn: 10 // 10 SOL
    });

    assert.equal(swap.quoteAmountIn, 10);
    assert.ok(swap.tradingFee > 0);
    assert.ok(swap.tokensOut > 0);
    assert.equal(swap.creatorFee, swap.tradingFee * 0.5); // 50% split
    assert.equal(swap.partnerFee, swap.tradingFee * 0.5);
    assert.equal(swap.reachesGraduation, false);
  });

  it('should generate valid TypeScript code containing correct SDK methods', () => {
    const code = generateTypeScriptCode(DEFAULT_CONFIG);
    assert.ok(code.includes('import { Connection, Keypair, PublicKey, sendAndConfirmTransaction }'));
    assert.ok(code.includes('@meteora-ag/dynamic-bonding-curve-sdk'));
    assert.ok(code.includes('buildCurveWithMarketCap'));
    assert.ok(code.includes('client.partner.createConfig'));
    assert.ok(code.includes('initialMarketCap: 20'));
    assert.ok(code.includes('migrationMarketCap: 600'));
  });

  it('should generate valid JSONC with dryRun and protocol fields', () => {
    const jsonc = generateStudioJsonc(DEFAULT_CONFIG);
    assert.ok(jsonc.includes('"dryRun": true'));
    assert.ok(jsonc.includes('"migrationOption": 1'));
    assert.ok(jsonc.includes('"creatorTradingFeePercentage": 50'));
  });

  it('should validate all Halal Presets successfully', () => {
    assert.equal(HALAL_PRESETS.length, 4);
    for (const preset of HALAL_PRESETS) {
      const val = validateConfig(preset.config);
      assert.equal(val.isValid, true, `Preset ${preset.id} must be valid: ${val.errors.join(', ')}`);
      const sim = simulateBondingCurve(preset.config);
      assert.ok(sim.migrationQuoteThreshold > 0);
    }
  });

});
