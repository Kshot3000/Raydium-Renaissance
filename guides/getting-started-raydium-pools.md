# Getting started with Raydium liquidity pools

By Kyle Cox ([@kshot9000](https://x.com/kshot9000)) — my builder notes for Raydium on Solana, for the Raydium team ([@raydium-io](https://github.com/raydium-io) · [@Raydium](https://x.com/Raydium)) and anyone arriving at liquidity pools for the first time. Independent notes, not affiliated with Raydium.

## 1 · Start at the real pools page

Everything real happens at <https://raydium.io/liquidity-pools/> — live pools, fee tiers, TVL and volume. The tools on my hub (<https://kshot3000.github.io/Raydium-Renaissance/>) only model pool maths so the numbers on that page make sense.

## 2 · Learn the three pool types

- **AMM v4 / CPMM (constant product):** the classic x × y = k pool. Simple, always in range, prices move along a curve.
- **CLMM (concentrated liquidity):** liquidity inside a chosen price range. More fee-efficient in range, earns nothing out of range, needs monitoring.
- **CP-Swap:** the newer constant-product standard — no OpenBook market requirement, Token-2022 support.

Official explainer source: <https://docs.raydium.io/>

## 3 · Before depositing anywhere, check

1. **Fee tier** on the pool page — your earnings come from that fee, split by your share of the pool.
2. **TVL and 24h volume** — fees only exist if people trade; my LP fee estimator shows how volume × fee × your share becomes (or doesn't become) income.
3. **Impermanent loss** — run the price moves you fear through the IL calculator first. If a 2× move's IL scares you, the fees need to be very good.
4. **Token risk** — a pool is only as sound as its weaker token. Verify token addresses from official sources, never from a chat message.
5. **Range (CLMM only)** — decide how you'll notice and respond when price leaves your range.

## 4 · Building on Raydium

- SDK: <https://github.com/raydium-io/raydium-sdk-V2>
- Programs: [CLMM](https://github.com/raydium-io/raydium-clmm) · [CP-Swap](https://github.com/raydium-io/raydium-cp-swap) · [AMM](https://github.com/raydium-io/raydium-amm) · [IDL](https://github.com/raydium-io/raydium-idl)
- Docs source: <https://github.com/raydium-io/raydium-docs>

## Support

Tips in SOL: `9WMsvgpQQgtvfV4g2Mm7U6mHRGpVvEmFvQGAAu4aArU8` — [@kshot9000](https://x.com/kshot9000)
