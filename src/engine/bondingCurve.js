/**
 * Meteora Dynamic Bonding Curve (DBC) Mathematical Simulation Engine
 * Based on @meteora-ag/dynamic-bonding-curve-sdk@1.5.11 specifications.
 */

export const CURVE_MODES = {
  SIMPLE: 0,            // buildCurve (threshold + % migration)
  MARKET_CAP: 1,        // buildCurveWithMarketCap (initial MC -> migration MC)
  TWO_SEGMENTS: 2,      // buildCurveWithTwoSegments
  MID_PRICE: 3,         // buildCurveWithMidPrice
  LIQUIDITY_WEIGHTS: 4, // buildCurveWithLiquidityWeights (16 weights)
  CUSTOM_PRICES: 5      // buildCurveWithCustomSqrtPrices
};

export const MIGRATION_TARGETS = {
  DAMM_V1: 0,
  DAMM_V2: 1 // Default in Meteora DBC SDK
};

export const MIGRATION_FEE_OPTIONS = {
  FIXED_25_BPS: 0,
  FIXED_50_BPS: 1,
  FIXED_100_BPS: 2,
  FIXED_200_BPS: 3, // 2% LP fee - recommended default
  FIXED_400_BPS: 4,
  CUSTOMIZABLE: 6
};

/**
 * Standard configuration defaults conforming to Meteora DBC rules.
 */
export const DEFAULT_CONFIG = {
  tokenName: "Tokenized Equity Alpha",
  tokenSymbol: "xALPHA",
  tokenDecimals: 6,
  quoteDecimals: 9, // SOL
  quoteSymbol: "SOL",
  totalSupply: 1_000_000_000, // 1 Billion tokens
  curveMode: CURVE_MODES.MARKET_CAP,
  curveShape: "linear", // "linear" | "exponential" | "flat" | "sigmoid"
  curvePower: 1.0,      // 1.0 = linear, 2.0 = quadratic
  initialMarketCap: 20, // SOL
  migrationMarketCap: 600, // SOL
  percentageSupplyOnMigration: 20, // % of supply deployed to DAMM v2 pool LP
  baseFeeBps: 100,      // 1.0% (min allowed is 25 bps)
  dynamicFeeEnabled: true,
  creatorTradingFeePercentage: 50, // 50% to creator, 50% to partner
  migrationOption: MIGRATION_TARGETS.DAMM_V2,
  migrationFeeOption: MIGRATION_FEE_OPTIONS.FIXED_200_BPS,
  liquidityDistribution: {
    partnerLiquidityPercentage: 50,
    partnerPermanentLockedLiquidityPercentage: 5,
    creatorLiquidityPercentage: 40,
    creatorPermanentLockedLiquidityPercentage: 5
  }
};

/**
 * Validates configuration parameters against Meteora protocol constraints.
 */
export function validateConfig(config) {
  const errors = [];
  const merged = { ...DEFAULT_CONFIG, ...config };

  if (merged.baseFeeBps < 25) {
    errors.push("Base fee cannot be less than 25 bps (protocol constraint: MIN_FEE_BPS = 25).");
  }

  const dist = merged.liquidityDistribution;
  const totalLpPct = dist.partnerLiquidityPercentage +
                     dist.partnerPermanentLockedLiquidityPercentage +
                     dist.creatorLiquidityPercentage +
                     dist.creatorPermanentLockedLiquidityPercentage;
  
  if (Math.abs(totalLpPct - 100) > 0.001) {
    errors.push(`Liquidity distribution must sum to 100% (currently ${totalLpPct}%).`);
  }

  const totalLocked = dist.partnerPermanentLockedLiquidityPercentage + dist.creatorPermanentLockedLiquidityPercentage;
  if (totalLocked < 10) {
    // Protocol requires >= 10% permanently locked or vested >= 1 day post-migration
    errors.push(`At least 10% of migrated LP must be permanently locked (currently ${totalLocked}%).`);
  }

  if (merged.initialMarketCap <= 0 || merged.migrationMarketCap <= merged.initialMarketCap) {
    errors.push("Migration Market Cap must be strictly greater than Initial Market Cap.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculates curve parameters, pricing progression, and graduation requirements.
 */
export function simulateBondingCurve(userConfig = {}) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const validation = validateConfig(config);
  if (!validation.isValid) {
    throw new Error(`Invalid DBC configuration: ${validation.errors.join("; ")}`);
  }

  const totalSupply = config.totalSupply;
  const initialMC = config.initialMarketCap;
  const migrationMC = config.migrationMarketCap;

  // Initial and graduation price in quote tokens per 1 token
  const initialPrice = initialMC / totalSupply;
  const migrationPrice = migrationMC / totalSupply;

  // Supply allocated to the bonding curve sale
  // Remainder is reserved for migration liquidity pool (DAMM v2)
  const migrationSupplyPct = config.percentageSupplyOnMigration / 100;
  const curveTokensSupply = totalSupply * (1 - migrationSupplyPct);

  // Curve shape exponent
  let power = config.curvePower || 1.0;
  if (config.curveShape === "flat") power = 0.2;
  else if (config.curveShape === "exponential") power = 2.2;
  else if (config.curveShape === "linear") power = 1.0;

  // Integration to calculate migrationQuoteThreshold (total quote tokens needed to graduate)
  // Price at supply s: P(s) = initialPrice + (migrationPrice - initialPrice) * (s / curveTokensSupply)^power
  // Integral from 0 to curveTokensSupply:
  // Threshold = initialPrice * curveTokensSupply + ((migrationPrice - initialPrice) / (power + 1)) * curveTokensSupply
  const migrationQuoteThreshold = (initialPrice * curveTokensSupply) +
    (((migrationPrice - initialPrice) / (power + 1)) * curveTokensSupply);

  // Generate 50 sampled curve points for visualization and chart rendering
  const samplePoints = [];
  const steps = 50;
  for (let i = 0; i <= steps; i++) {
    const s = (i / steps) * curveTokensSupply;
    const progress = i / steps; // 0.0 to 1.0
    const price = initialPrice + (migrationPrice - initialPrice) * Math.pow(progress, power);
    const marketCap = price * totalSupply;
    
    // Cumulative quote accumulated up to supply s
    const accumulatedQuote = (initialPrice * s) +
      (((price - initialPrice) / (power + 1)) * s);

    samplePoints.push({
      step: i,
      tokensSold: s,
      progressPct: progress * 100,
      pricePerToken: price,
      marketCapQuote: marketCap,
      accumulatedQuote
    });
  }

  return {
    config,
    totalSupply,
    curveTokensSupply,
    initialPrice,
    migrationPrice,
    migrationQuoteThreshold,
    samplePoints,
    power
  };
}

/**
 * Simulates an exact-input swap (buying base tokens with quote tokens)
 * along the bonding curve.
 */
export function simulateSwapQuoteIn({
  curveSim,
  currentQuoteAccumulated = 0,
  quoteAmountIn = 1.0 // e.g. 1 SOL
}) {
  const { initialPrice, migrationPrice, curveTokensSupply, migrationQuoteThreshold, power, config } = curveSim;
  
  if (currentQuoteAccumulated >= migrationQuoteThreshold) {
    return {
      error: "Curve has already graduated to DAMM v2! Trade via DAMM v2 pool."
    };
  }

  // Calculate dynamic fees
  const baseFeeBps = config.baseFeeBps;
  const dynamicFeeBps = config.dynamicFeeEnabled ? Math.min(baseFeeBps * 1.5, 250) : baseFeeBps;
  const tradingFee = quoteAmountIn * (dynamicFeeBps / 10000);
  const netQuoteIn = quoteAmountIn - tradingFee;

  // Split fee
  const creatorFee = tradingFee * (config.creatorTradingFeePercentage / 100);
  const partnerFee = tradingFee - creatorFee;

  // Approximate tokens bought using average price around current point
  const currentProgress = Math.min(1, currentQuoteAccumulated / migrationQuoteThreshold);
  const currentPrice = initialPrice + (migrationPrice - initialPrice) * Math.pow(currentProgress, power);
  
  const targetQuote = Math.min(migrationQuoteThreshold, currentQuoteAccumulated + netQuoteIn);
  const newProgress = targetQuote / migrationQuoteThreshold;
  const nextPrice = initialPrice + (migrationPrice - initialPrice) * Math.pow(newProgress, power);
  const avgPrice = (currentPrice + nextPrice) / 2;

  const tokensOut = netQuoteIn / avgPrice;
  const priceImpactPct = ((nextPrice - currentPrice) / currentPrice) * 100;
  const reachesGraduation = (currentQuoteAccumulated + netQuoteIn) >= migrationQuoteThreshold;

  return {
    quoteAmountIn,
    tradingFee,
    netQuoteIn,
    creatorFee,
    partnerFee,
    tokensOut,
    currentPrice,
    nextPrice,
    priceImpactPct,
    newAccumulatedQuote: currentQuoteAccumulated + netQuoteIn,
    reachesGraduation,
    newProgressPct: (targetQuote / migrationQuoteThreshold) * 100
  };
}

/**
 * Generates copy-pasteable, production-ready TypeScript code using
 * @meteora-ag/dynamic-bonding-curve-sdk@1.5.11 matching skill specifications.
 */
export function generateTypeScriptCode(config) {
  const c = { ...DEFAULT_CONFIG, ...config };
  return `import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  buildCurveWithMarketCap,
  DynamicBondingCurveClient,
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenDecimal,
  TokenType
} from '@meteora-ag/dynamic-bonding-curve-sdk';

/**
 * Meteora DBC Launch Script - Generated by Meteora DBC Studio
 * Protocol: Dynamic Bonding Curve (dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN)
 * Migration: DAMM v2 (cp-amm)
 */
export async function createMeteoraDbcLaunch(
  connection: Connection,
  wallet: Keypair,
  feeClaimer: PublicKey,
  leftoverReceiver: PublicKey
) {
  const client = new DynamicBondingCurveClient(connection, 'confirmed');

  // 1. Build mathematical curve parameters
  const curveConfig = buildCurveWithMarketCap({
    token: {
      tokenType: TokenType.SPLToken,
      tokenBaseDecimal: TokenDecimal.SIX,
      tokenQuoteDecimal: TokenDecimal.NINE,
      tokenAuthorityOption: TokenAuthorityOption.Immutable,
      totalTokenSupply: ${c.totalSupply},
      leftover: 0,
    },
    fee: {
      baseFeeParams: {
        baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
        feeSchedulerParam: {
          startingFeeBps: ${c.baseFeeBps},
          endingFeeBps: ${c.baseFeeBps},
          numberOfPeriod: 0,
          totalDuration: 0,
        },
      },
      dynamicFeeEnabled: ${c.dynamicFeeEnabled},
      collectFeeMode: CollectFeeMode.QuoteToken,
      creatorTradingFeePercentage: ${c.creatorTradingFeePercentage},
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: {
      migrationOption: MigrationOption.MET_DAMM_V2,
      migrationFeeOption: MigrationFeeOption.FixedBps200, // 2% LP fee
      migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    },
    liquidityDistribution: {
      partnerLiquidityPercentage: ${c.liquidityDistribution.partnerLiquidityPercentage},
      partnerPermanentLockedLiquidityPercentage: ${c.liquidityDistribution.partnerPermanentLockedLiquidityPercentage},
      creatorLiquidityPercentage: ${c.liquidityDistribution.creatorLiquidityPercentage},
      creatorPermanentLockedLiquidityPercentage: ${c.liquidityDistribution.creatorPermanentLockedLiquidityPercentage},
    },
    lockedVesting: {
      totalLockedVestingAmount: 0,
      numberOfVestingPeriod: 0,
      cliffUnlockAmount: 0,
      totalVestingDuration: 0,
      cliffDurationFromMigrationTime: 0,
    },
    activationType: ActivationType.Timestamp,
    initialMarketCap: ${c.initialMarketCap},
    migrationMarketCap: ${c.migrationMarketCap},
  });

  // 2. Generate new config account keypair
  const configKeypair = Keypair.generate();
  const QUOTE_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL

  // 3. Assemble and execute transaction
  const tx = await client.partner.createConfig({
    config: configKeypair.publicKey,
    feeClaimer,
    leftoverReceiver,
    payer: wallet.publicKey,
    quoteMint: QUOTE_MINT,
    ...curveConfig,
  });

  const txSig = await sendAndConfirmTransaction(connection, tx, [wallet, configKeypair]);
  console.log('DBC Config Created Successfully!');
  console.log('Config Public Key:', configKeypair.publicKey.toBase58());
  console.log('Transaction Signature:', txSig);

  return {
    configPubkey: configKeypair.publicKey,
    txSig,
  };
}
`;
}

/**
 * Generates JSONC config file ready for meteora-invent/studio CLI.
 */
export function generateStudioJsonc(config) {
  const c = { ...DEFAULT_CONFIG, ...config };
  return `{
  // Meteora Invent Studio - DBC Configuration File
  // Generated by Meteora DBC Studio (100% Halal RWA & Equity Tokenization)
  "dryRun": true,
  "token": {
    "name": "${c.tokenName}",
    "symbol": "${c.tokenSymbol}",
    "decimals": ${c.tokenDecimals},
    "totalSupply": ${c.totalSupply},
    "uri": "https://arweave.net/example-metadata-uri"
  },
  "quote": {
    "mint": "So11111111111111111111111111111111111111112",
    "symbol": "${c.quoteSymbol}",
    "decimals": ${c.quoteDecimals}
  },
  "curve": {
    "buildCurveMode": 1, // Target Market Cap Mode
    "initialMarketCap": ${c.initialMarketCap},
    "migrationMarketCap": ${c.migrationMarketCap},
    "percentageSupplyOnMigration": ${c.percentageSupplyOnMigration}
  },
  "fee": {
    "startingFeeBps": ${c.baseFeeBps},
    "endingFeeBps": ${c.baseFeeBps},
    "dynamicFeeEnabled": ${c.dynamicFeeEnabled},
    "creatorTradingFeePercentage": ${c.creatorTradingFeePercentage}
  },
  "migration": {
    "migrationOption": 1, // 1 = DAMM v2
    "migrationFeeOption": 3 // 3 = Fixed 2% (200 bps)
  },
  "liquidityDistribution": {
    "partnerLiquidityPercentage": ${c.liquidityDistribution.partnerLiquidityPercentage},
    "partnerPermanentLockedLiquidityPercentage": ${c.liquidityDistribution.partnerPermanentLockedLiquidityPercentage},
    "creatorLiquidityPercentage": ${c.liquidityDistribution.creatorLiquidityPercentage},
    "creatorPermanentLockedLiquidityPercentage": ${c.liquidityDistribution.creatorPermanentLockedLiquidityPercentage}
  }
}
`;
}
