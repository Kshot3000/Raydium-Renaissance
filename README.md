# Raydium Renaissance 💧

**Building, fixing and improving for Raydium on Solana — with a focus on liquidity pools.**

I'm Kyle Cox ([@kshot9000](https://x.com/kshot9000) · [github.com/Kshot3000](https://github.com/Kshot3000)), an independent builder working in public. This repo is my builder hub for the [Raydium](https://raydium.io/) project: new apps and tools, fixes and improvements across Raydium's open-source code and websites, and honest, local-first pool tools anyone can use. My standing focus is Raydium's liquidity pools — <https://raydium.io/liquidity-pools/>.

Live hub: **https://kshot3000.github.io/Raydium-Renaissance/**

For the Raydium team — [@raydium-io](https://github.com/raydium-io) on GitHub · [@Raydium](https://x.com/Raydium) on X — feedback, corrections and issue reports are welcome here. I'm an independent builder, **not affiliated with Raydium or the Solana Foundation**; ecosystem projects in the catalogue are linked for credit, not claimed as my work.

## What this hub does

- **Build** new websites, apps and tools for Raydium / Solana, starting with liquidity-pool tooling.
- **Fix** real, verified bugs — in my own Raydium work first, and upstream in [raydium-io](https://github.com/raydium-io) projects the legitimate way: fork, fix, test, upstream PR, substance only, respecting each project's contribution / AI policy exactly.
- **Improve** all aspects of this project and its website on an hourly builder loop: correctness, tests, docs, accessibility, performance and design — quality over speed, quiet runs over mediocre changes.

## Pool tools on the hub (all local, no wallet, no signing)

1. **Constant-product swap model** — the x × y = k maths behind AMM v4 / CPMM pools, with fee and price-impact output. Exact scaled-BigInt arithmetic (9 dp).
2. **Impermanent-loss calculator** — LP-vs-hold at any price multiple for a 50/50 constant-product position, with optional deposit value.
3. **LP fee estimator** — your share of a pool's swap fees from its volume, TVL and fee tier, with a naively-annualised APR.

Honest labels, always: these are **educational models** using numbers you type in — not live quotes, not live pool data, and not financial advice. Real pools live at <https://raydium.io/liquidity-pools/>.

## Catalogue (14 projects, all verified live at launch)

Mine:
- [Solana Pay Link Desk](https://kshot3000.github.io/solana-pay-link-desk/) ([source](https://github.com/Kshot3000/solana-pay-link-desk)) — my Solana Pay payment-link / QR tool.

Official Raydium ([@raydium-io](https://github.com/raydium-io)):
- [Liquidity Pools](https://raydium.io/liquidity-pools/) · [Swap](https://raydium.io/swap/) · [LaunchLab](https://raydium.io/launchpad/) · [Staking](https://raydium.io/staking/) · [Raydium home](https://raydium.io/)
- [Documentation](https://docs.raydium.io/) ([source](https://github.com/raydium-io/raydium-docs))
- [SDK V2](https://github.com/raydium-io/raydium-sdk-V2) · [CLMM program](https://github.com/raydium-io/raydium-clmm) · [CP-Swap program](https://github.com/raydium-io/raydium-cp-swap) · [AMM program](https://github.com/raydium-io/raydium-amm) · [IDL](https://github.com/raydium-io/raydium-idl)

Ecosystem:
- [Solana](https://solana.com/) · [Jupiter](https://jup.ag/) (aggregator routing across venues including Raydium pools)

## Guides

- [Getting started with Raydium liquidity pools](guides/getting-started-raydium-pools.md)

## Tests

```sh
node tests/test-site.js
```

Covers attribution on every surface, catalogue links and counts, cache keys, and the maths of all three pool tools (known-value vectors, edge and rejection cases).

## Support

Tips in SOL keep this work going: `9WMsvgpQQgtvfV4g2Mm7U6mHRGpVvEmFvQGAAu4aArU8`

— Kyle Cox, [@kshot9000](https://x.com/kshot9000). Tagging the Raydium team on everything: [@raydium-io](https://github.com/raydium-io) · [@Raydium](https://x.com/Raydium).

*Independent builder hub — not affiliated with Raydium, raydium-io, or the Solana Foundation.*
