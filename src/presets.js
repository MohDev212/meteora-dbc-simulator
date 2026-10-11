/**
 * Curated 100% Halal Presets for Meteora Dynamic Bonding Curves (DBC)
 * Focused on Real-World Assets (RWAs), Tokenized Equities, and Real Utility.
 * Zero gambling, zero interest/usury, zero memecoin scams.
 */

export const HALAL_PRESETS = [
  {
    id: "rwa-equity",
    title: "Tokenized Private Equity (xStock)",
    badge: "Enterprise RWA",
    description: "Tailored for private startup shares and tokenized corporate equity (xStocks). Linear price discovery curve with low 25 bps base fee to minimize trading friction.",
    rationale: "Halal equity sharing: genuine ownership representation of real corporate assets without interest debt.",
    config: {
      tokenName: "AeroTech Aerospace Shares",
      tokenSymbol: "xAIR",
      totalSupply: 10_000_000, // 10M shares
      curveMode: 1,
      curveShape: "linear",
      curvePower: 1.0,
      initialMarketCap: 50, // SOL
      migrationMarketCap: 1500, // SOL
      percentageSupplyOnMigration: 25,
      baseFeeBps: 25, // Minimal 25 bps base fee
      dynamicFeeEnabled: false,
      creatorTradingFeePercentage: 30,
      liquidityDistribution: {
        partnerLiquidityPercentage: 20,
        partnerPermanentLockedLiquidityPercentage: 10,
        creatorLiquidityPercentage: 20,
        creatorPermanentLockedLiquidityPercentage: 50 // 60% total permanently locked
      }
    }
  },
  {
    id: "rwa-real-estate",
    title: "Fractional Real Estate Property",
    badge: "Yield & Asset Backed",
    description: "Flat, bounded curve designed for fractionalized property deeds and rental yield tokens. Prevents wild speculation and maintains stable valuation.",
    rationale: "Asset-backed physical property with tangible deed ownership; zero interest leverage.",
    config: {
      tokenName: "Meridian Prime Commercial Deed",
      tokenSymbol: "rPROP",
      totalSupply: 1_000_000,
      curveMode: 1,
      curveShape: "flat",
      curvePower: 0.2,
      initialMarketCap: 500, // SOL
      migrationMarketCap: 750, // SOL (Tight range)
      percentageSupplyOnMigration: 15,
      baseFeeBps: 50,
      dynamicFeeEnabled: true,
      creatorTradingFeePercentage: 50,
      liquidityDistribution: {
        partnerLiquidityPercentage: 10,
        partnerPermanentLockedLiquidityPercentage: 10,
        creatorLiquidityPercentage: 10,
        creatorPermanentLockedLiquidityPercentage: 70 // 80% locked in DAMM v2
      }
    }
  },
  {
    id: "depin-compute",
    title: "DePIN Decentralized Compute Utility",
    badge: "Infrastructure Utility",
    description: "Exponential bonding curve with progressive dynamic fee protection. Ideal for hardware clusters, GPU nodes, and storage networks.",
    rationale: "Pure service utility exchange: tokens redeemable for verifiable computational work.",
    config: {
      tokenName: "VectorMesh AI Compute",
      tokenSymbol: "vGPU",
      totalSupply: 1_000_000_000,
      curveMode: 1,
      curveShape: "exponential",
      curvePower: 2.2,
      initialMarketCap: 20, // SOL
      migrationMarketCap: 600, // SOL
      percentageSupplyOnMigration: 20,
      baseFeeBps: 100,
      dynamicFeeEnabled: true,
      creatorTradingFeePercentage: 60, // High fee share to protocol developers
      liquidityDistribution: {
        partnerLiquidityPercentage: 40,
        partnerPermanentLockedLiquidityPercentage: 10,
        creatorLiquidityPercentage: 40,
        creatorPermanentLockedLiquidityPercentage: 10
      }
    }
  },
  {
    id: "open-source-treasury",
    title: "Open-Source Software Protocol Treasury",
    badge: "Developer Tooling",
    description: "Sustained long-curve mechanism with linear graduation schedule. Automatically directs trading and migration fees into verifiable open-source developer maintenance.",
    rationale: "Sponsorship of ethical software engineering and public good maintenance.",
    config: {
      tokenName: "Solana DevKit Core",
      tokenSymbol: "sDEV",
      totalSupply: 500_000_000,
      curveMode: 1,
      curveShape: "linear",
      curvePower: 1.0,
      initialMarketCap: 15, // SOL
      migrationMarketCap: 450, // SOL
      percentageSupplyOnMigration: 30,
      baseFeeBps: 75,
      dynamicFeeEnabled: true,
      creatorTradingFeePercentage: 50,
      liquidityDistribution: {
        partnerLiquidityPercentage: 30,
        partnerPermanentLockedLiquidityPercentage: 15,
        creatorLiquidityPercentage: 35,
        creatorPermanentLockedLiquidityPercentage: 20
      }
    }
  }
];
