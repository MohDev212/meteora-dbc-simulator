# Meteora Dynamic Bonding Curve (DBC) & RWA Launchpad Studio

> **Interactive Visual Simulator, Mathematical Modeler, and Preset Marketplace for Meteora DBC & Tokenized Real-World Assets (RWAs) on Solana.**  
> Built for the **Superteam Earn & Colosseum Crypto World's Fair Hackathon** (Best use of Meteora DBC).  
> **Protocol Standard:** Pinned to `@meteora-ag/dynamic-bonding-curve-sdk@1.5.11` and Meteora DAMM v2 (`cp-amm`).

---

## 1. Overview

Meteora's Dynamic Bonding Curve (DBC) program (`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`) is Solana's premier primitive for configurable asset issuance and continuous liquidity migration into Meteora DAMM v2.

However, builders venturing beyond memecoins—specifically those tokenizing **Real-World Assets (RWAs), private corporate equities (xStocks), and decentralized infrastructure (DePIN)**—face a major tooling gap:
- Deriving the exact quote reserve threshold (`migrationQuoteThreshold`) required to graduate.
- Visualizing non-linear price discovery across different curve configurations.
- Modeling fee distributions (dynamic fee schedulers, creator vs. partner splits, and permanent-locked DAMM v2 LP shares).
- Generating valid, type-safe TypeScript SDK code and `meteora-invent/studio` JSONC configs.

**Meteora DBC Studio** solves this with an interactive visual simulation engine, real-time quote quoter, and mathematically verified Halal presets.

---

## 2. Core Features

### 📈 Interactive Mathematical Curve Simulator
- **Real-Time Canvas Graphing:** Plots price progression ($P(s)$ in SOL/token) and cumulative quote reserve accumulation against circulating supply sold.
- **Accurate Graduation Threshold Calculation:** Solves the integral $\int_0^{S_{curve}} P(s) ds$ to compute the exact quote tokens needed to trigger graduation to Meteora DAMM v2.
- **Interactive Cursor Tooltip:** Inspect token price, market cap, and supply sold at any point along the curve.

### 🛡️ 100% Halal Curated Presets
Strictly built for lawful asset tokenization (zero gambling, zero interest/usury, zero scam tokens):
1. **Tokenized Private Equity (xStock):** Linear price discovery, minimal 25 bps base fee to reduce friction, high graduation threshold, and 60% permanently locked DAMM v2 LP.
2. **Fractional Real Estate Property (rPROP):** Low-volatility flat curve with tight price boundaries, preserving stable valuation for property deeds.
3. **DePIN Decentralized Compute Utility (vGPU):** Quadratic curve with dynamic fee protection against front-running snipers, directing 60% of fees to protocol developers.
4. **Open-Source Protocol Treasury (sDEV):** Sustained long curve directing fees to open-source software maintenance.

### 💱 Live ExactIn Swap Quoter & Impact Analyzer
- Enter simulated quote amounts (e.g. 5 SOL, 50 SOL) and see exact tokens received, price impact %, trading fee deductions, and creator/partner splits.
- Real-time indicator showing if a trade triggers graduation to DAMM v2.

### ⚙️ One-Click Code & Config Exporter
- **TypeScript SDK:** Ready-to-run TypeScript code importing `@meteora-ag/dynamic-bonding-curve-sdk` with `buildCurveWithMarketCap` and `client.partner.createConfig`.
- **Studio JSONC:** Production-ready JSONC configuration for `meteora-invent/studio` CLI (`pnpm studio dbc-create-config`).

---

## 3. Mathematical Model

For initial market cap $MC_0$, target migration market cap $MC_{grad}$, total supply $S_{total}$, and supply allocated to the curve $S_{curve} = S_{total} \times (1 - \text{migrationLPPercentage})$:

$$\text{Initial Price: } P_0 = \frac{MC_0}{S_{total}}$$

$$\text{Graduation Price: } P_{grad} = \frac{MC_{grad}}{S_{total}}$$

$$\text{Price at sold supply } s: P(s) = P_0 + (P_{grad} - P_0) \cdot \left(\frac{s}{S_{curve}}\right)^\alpha$$

$$\text{Quote Reserve Threshold: } R_{grad} = \int_0^{S_{curve}} P(s) \, ds = P_0 \cdot S_{curve} + \frac{P_{grad} - P_0}{\alpha + 1} \cdot S_{curve}$$

---

## 4. Quickstart

### Run Locally
```bash
git clone https://github.com/MohDev212/meteora-dbc-simulator.git
cd meteora-dbc-simulator
node server.js
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Run Hermetic Tests
```bash
npm test
```
Runs the test suite using Node's native test runner (`node --test`), verifying curve mathematics, protocol constraints, fee splits, and code generation.

---

## 5. Protocol Safety & Verification
- Validates protocol constraints: `baseFeeBps >= 25` (`MIN_FEE_BPS = 25`).
- Enforces DAMM v2 liquidity distribution rules: total LP shares must equal 100%, with $\ge 10\%$ permanently locked.
- Zero external dependencies for the simulator engine and web app.

---

## 6. License
MIT License. Created by [MohDev212](https://github.com/MohDev212).
