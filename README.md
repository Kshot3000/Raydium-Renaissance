# Raydium Renaissance 💧

**Building, fixing and improving for Raydium on Solana — with a focus on liquidity pools.**

I'm Kyle Cox ([@kshot9000](https://x.com/kshot9000) · [github.com/Kshot3000](https://github.com/Kshot3000)), an independent builder working in public. This repo is my builder hub for the [Raydium](https://raydium.io/) project: new apps and tools, fixes and improvements across Raydium's open-source code and websites, and honest, local-first pool tools anyone can use. My standing focus is Raydium's liquidity pools — <https://raydium.io/liquidity-pools/>.

Live hub: **https://kshot3000.github.io/Raydium-Renaissance/**

For the Raydium team — [@raydium-io](https://github.com/raydium-io) on GitHub · [@Raydium](https://x.com/Raydium) on X — and the Solana team — [@solana-foundation](https://github.com/solana-foundation) on GitHub · [@solana](https://x.com/solana) on X — feedback, corrections and issue reports are welcome here. I'm an independent builder, **not affiliated with Raydium or the Solana Foundation**; ecosystem projects in the catalogue are linked for credit, not claimed as my work.

## What this hub does

- **Build** new websites, apps and tools for Raydium / Solana, starting with liquidity-pool tooling.
- **Fix** real, verified bugs — in my own Raydium work first, and upstream in [raydium-io](https://github.com/raydium-io) projects the legitimate way: fork, fix, test, upstream PR, substance only, respecting each project's contribution / AI policy exactly.
- **Improve** all aspects of this project and its website on an hourly builder loop: correctness, tests, docs, accessibility, performance and design — quality over speed, quiet runs over mediocre changes.

## Pool tools on the hub (all local, no wallet, no signing)

1. **Constant-product swap model** — the x × y = k maths behind AMM v4 / CPMM pools, with fee and price-impact output. Exact scaled-BigInt arithmetic (9 dp).
2. **Impermanent-loss calculator** — LP-vs-hold at any price multiple for a 50/50 constant-product position, with optional deposit value.
3. **LP fee estimator** — your share of a pool's swap fees from its volume, TVL and fee tier, with a naively-annualised APR.
4. **Break-even fee calculator** — how much in fees a 50/50 position must earn to offset impermanent loss at a given price move (hold value − LP value), and how many days that takes at an estimated daily fee rate.
5. **Liquidity deposit planner** — constant-product pools take both tokens in the pool's existing ratio: given the reserves and a token-A deposit, the matching token-B amount and your post-deposit share of the pool. Exact scaled-BigInt arithmetic (9 dp).
6. **Exact-out swap model** — the inverse of tool 1: given the reserves and the amount out you want, the amount in you'd need, grossed up for the fee and rounded up so the input is never short. Targets at or above the whole reserve out are rejected — a constant-product pool can never pay out everything it holds. Exact scaled-BigInt arithmetic (9 dp).
7. **Liquidity withdrawal planner** — the exit side of tool 5: given a pool's current reserves and your share of the pool, what a full or partial withdrawal returns in both tokens (in the pool's current ratio), plus your remaining share and the reserves left behind. Exact scaled-BigInt arithmetic (9 dp), floored like on-chain programs. No withdrawal fee is modelled.
8. **CLMM range deposit planner** — the range-based deposit the constant-product tools keep pointing at: given a current price, a chosen price range and a token-A deposit, the matching token-B amount the range's position maths requires (the split is set by where the price sits in the range), the model's liquidity, and the range's tick indices. Below the range the position is entirely token A; at or above the top it is entirely token B, so a token-A deposit is rejected there. Tick indices are modelled with floating-point logs and are not snapped to a pool's tick spacing; no fees are modelled.
9. **CLMM position checker** — the follow-up to tool 8: given a position's model liquidity (tool 8 reports it), its price range, and a price to check, what the position holds at that price. Inside the range a rising price steadily converts the position into token B — concentrated liquidity's version of impermanent loss; at or outside either edge the position is entirely one token and earns no fees until price returns. No fees earned are included.
10. **Slippage & minimum-received calculator** — given an expected amount out and a slippage tolerance, the minimum received that tolerance implies (and, with an expected amount in, the maximum input) — both bounds floored in exact scaled-BigInt (9 dp), never rounded up: a minimum that rounds up is stricter than the tolerance set, and a maximum that rounds up authorises paying more than intended.
11. **CLMM tick / price converter** — what the tick indices in tools 8 and 9 actually are: each tick is one 0.01% price step (price = 1.0001^tick), a price's tick floors, and prices outside the standard CLMM tick range (−443636…443636) are rejected. With a pool's tick spacing, it also snaps a boundary the way pools require — lower boundaries down to the previous spacing multiple, upper boundaries up to the next (floor division, so negative ticks snap away from zero going down). Tick maths is floating-point, so a price exactly on a boundary can land one tick off.
12. **CLMM position vs holding** — tool 2's impermanent-loss question for a CLMM position: given a position's model liquidity, its range, its entry price and a price to check, the position's value at the check price (in token B) against simply holding the tokens it started with. The position converts itself as price moves, so its value never beats holding — the shortfall is concentrated impermanent loss at that price, and the tool reports it as a % vs holding plus the exact fees (in token B) the position must have earned to break even with holding. The gap is zero at the entry price. No fees earned are included.
13. **CLMM fee estimator** — the other side of tool 12's fee hurdle: a concentrated position's share is of the *active* liquidity at the current tick, not of TVL, and it earns only while price is in range — fees ≈ daily volume × fee tier × (your liquidity ÷ total active liquidity) × time-in-range %, per day and over a chosen period, with an optional naively-annualised APR against a position value. The total active liquidity is an input labelled as your estimate, and a total below your own liquidity is rejected (your L is part of it, so the share can never exceed 100%).
14. **CLMM wallet-balance deposit planner** — the inverse of tool 8: given the token-A and token-B balances you actually hold, a current price and a chosen range, the biggest position those balances can fund — the scarcer side caps the liquidity and is used in full, the other side is partly left over (used and leftover amounts for both tokens, plus the model's liquidity). Below the range the position is entirely token A (the whole token-B balance is leftover); at or above the top it is entirely token B, symmetrically. Inside the range a zero balance on either side funds nothing and is rejected. No fees are modelled.
15. **CLMM break-even days calculator** — tool 4's question for a CLMM position, joining tools 12 and 13: tool 12's fee hurdle at a check price (the fees, in token B, the position must earn to match holding) divided by tool 13's estimated fees per day at the same liquidity gives the days at that rate needed to break even with holding. Both halves are computed by those tools' own functions, so the numbers can never drift from their own forms. At the entry price the gap is zero and the answer is 0 days; with a real gap and a zero fee rate the answer is honestly never, not a large number. The rate is assumed to hold still for the whole period, which in a live pool it will not.
16. **Constant-product arbitrage model** — why a pool's price tracks the wider market: given the pool's reserves and an external price you supply (no live feed — the tool finds no opportunities), the trade that moves the pool's price exactly to that external price: direction, size grossed up for the pool fee, and modelled profit valued in token B at your external price. The reserves at the target price are forced by x × y = k (√(k/Pe), √(k×Pe)). A price gap smaller than the fee honestly comes out unprofitable. No routing, other venues' depth/fees, or transaction costs are modelled.

Honest labels, always: these are **educational models** using numbers you type in — not live quotes, not live pool data, and not financial advice. Real pools live at <https://raydium.io/liquidity-pools/>.

## Catalogue (14 projects, all verified live at launch)

Mine:
- [Solana Pay Link Desk](https://kshot3000.github.io/solana-pay-link-desk/) ([source](https://github.com/Kshot3000/solana-pay-link-desk)) — my Solana Pay payment-link / QR tool.

Official Raydium ([@raydium-io](https://github.com/raydium-io)):
- [Liquidity Pools](https://raydium.io/liquidity-pools/) · [Swap](https://raydium.io/swap/) · [LaunchLab](https://raydium.io/launchpad/) · [Staking](https://raydium.io/staking/) · [Raydium home](https://raydium.io/)
- [Documentation](https://docs.raydium.io/) ([source](https://github.com/raydium-io/raydium-docs))
- [SDK V2](https://github.com/raydium-io/raydium-sdk-V2) · [CLMM program](https://github.com/raydium-io/raydium-clmm) · [CP-Swap program](https://github.com/raydium-io/raydium-cp-swap) · [AMM program](https://github.com/raydium-io/raydium-amm) · [IDL](https://github.com/raydium-io/raydium-idl)

Ecosystem:
- [Solana](https://solana.com/) ([@solana-foundation](https://github.com/solana-foundation) · [@solana](https://x.com/solana)) · [Jupiter](https://jup.ag/) (aggregator routing across venues including Raydium pools)

## Guides

- [Getting started with Raydium liquidity pools](guides/getting-started-raydium-pools.md)

## Tests

```sh
node tests/test-site.js
```

Covers attribution on every surface, catalogue links and counts, cache keys, and the maths of all sixteen pool tools (known-value vectors, edge and rejection cases).

## Support

Tips in SOL keep this work going: `9WMsvgpQQgtvfV4g2Mm7U6mHRGpVvEmFvQGAAu4aArU8`

— Kyle Cox, [@kshot9000](https://x.com/kshot9000). Tagging the Raydium and Solana teams on everything: [@raydium-io](https://github.com/raydium-io) · [@Raydium](https://x.com/Raydium) · [@solana-foundation](https://github.com/solana-foundation) · [@solana](https://x.com/solana).

*Independent builder hub — not affiliated with Raydium, raydium-io, or the Solana Foundation.*
