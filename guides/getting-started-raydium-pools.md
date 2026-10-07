# Getting started with Raydium liquidity pools

By Kyle Cox ([@kshot9000](https://x.com/kshot9000)) — my builder notes for Raydium on Solana, for the Raydium team ([@raydium-io](https://github.com/raydium-io) · [@Raydium](https://x.com/Raydium)) and the Solana team ([@solana-foundation](https://github.com/solana-foundation) · [@solana](https://x.com/solana)) and anyone arriving at liquidity pools for the first time. Independent notes, not affiliated with Raydium.

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
6. **Deposit ratio (constant-product pools)** — AMM v4 / CPMM / CP-Swap pools take both tokens in the pool's existing ratio, so the second token's amount is set by the pool, not by you. Run your planned deposit through my hub's deposit planner first so the matching amount — and your resulting share of the pool — doesn't surprise you.
7. **Trade size vs the pool** — the closer a swap's amount out gets to the pool's whole reserve on that side, the worse its price gets, without limit: a constant-product pool can never actually pay out its full reserve. If you need a specific amount out, run it through my hub's exact-out model first and look at the price impact — if it's in double digits, a smaller trade, a deeper pool, or an aggregator route will almost always beat it.
8. **Your exit, before you enter** — withdrawing pays out both tokens in the pool's ratio *at that moment*, not the mix you deposited: if a price moved, the token that rose makes up less of what you get back (impermanent loss, made concrete). Run your share through my hub's withdrawal planner against the current reserves so the payout — and what's left if you withdraw only part — doesn't surprise you, and check on the pool page whether any withdrawal fee applies, because the planner models none.
9. **Your CLMM split is set by the range, not by you** — in a concentrated-liquidity position, where the current price sits inside your chosen range decides how much of each token you must deposit: near the bottom you deposit mostly the cheaper-side token, below the range you're entirely in one token and earning nothing, and the narrower the range the more liquidity (and fee share while in range) the same deposit buys — and the sooner price walks out of it. Run your range through my hub's CLMM range deposit planner first so the matching token amount and the tick range don't surprise you.
10. **Watch what your CLMM position becomes, not what it was** — a CLMM position converts itself as price moves: as price rises inside your range you steadily end up holding more of token B and less of the token A that rose, and outside the range you're entirely in one token earning nothing. Before you open a position — and when you check on one — run its liquidity (my hub's CLMM range planner reports it) and range through the hub's CLMM position checker at the prices you fear, so the mix you'd actually hold there doesn't surprise you.

## 4 · Building on Raydium

- SDK: <https://github.com/raydium-io/raydium-sdk-V2>
- Programs: [CLMM](https://github.com/raydium-io/raydium-clmm) · [CP-Swap](https://github.com/raydium-io/raydium-cp-swap) · [AMM](https://github.com/raydium-io/raydium-amm) · [IDL](https://github.com/raydium-io/raydium-idl)
- Docs source: <https://github.com/raydium-io/raydium-docs>

## Support

Tips in SOL: `9WMsvgpQQgtvfV4g2Mm7U6mHRGpVvEmFvQGAAu4aArU8` — [@kshot9000](https://x.com/kshot9000) · tagging [@raydium-io](https://github.com/raydium-io) · [@solana-foundation](https://github.com/solana-foundation)
