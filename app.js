"use strict";
/* Raydium Renaissance hub logic: project filtering plus twenty-three fully
   local liquidity-pool tools — a constant-product swap model, an
   impermanent-loss calculator, an LP fee estimator, a break-even fee
   calculator, a liquidity deposit planner, an exact-out swap model, a
   liquidity withdrawal planner, a CLMM range deposit planner, a CLMM
   position checker, a slippage / minimum-received calculator, a CLMM
   tick / price converter, a CLMM position-vs-holding calculator, a CLMM
   fee estimator, a CLMM wallet-balance deposit planner, a CLMM
   break-even days calculator, a constant-product arbitrage model, a
   price-impact trade sizer, an LP-token share & value calculator, a
   single-sided zap-in planner, a single-sided zap-out planner, an IL
   tolerance band, a CLMM symmetric-range planner, and a two-hop
   swap model.
   These are educational MODELS using
   the maths Raydium's pool types are built on; they are not live quotes,
   not live pool data, and not financial advice. Everything runs locally. */

/* ---------- decimal <-> scaled BigInt (9 dp, like SOL lamport precision) ---------- */
var SCALE = 1000000000n;
function parseScaled(str) {
  var s = (str == null ? "" : String(str)).trim();
  if (!/^\d+(\.\d{1,9})?$/.test(s)) return null;
  var parts = s.split(".");
  return BigInt(parts[0]) * SCALE + BigInt(((parts[1] || "") + "000000000").slice(0, 9));
}
function formatScaled(nano) {
  var whole = nano / SCALE;
  var frac = (nano % SCALE).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? whole.toString() + "." + frac : whole.toString();
}
function scaledToNumber(nano) { return Number(nano) / 1e9; }

/* ---------- 1 · Constant-product swap model (x * y = k) ---------- */
/* The model behind Raydium AMM v4 / CPMM pools: the fee is taken from the
   input first, then out = reserveOut * inAfterFee / (reserveIn + inAfterFee). */
function cpSwap(reserveInStr, reserveOutStr, amountInStr, feeBps) {
  var rin = parseScaled(reserveInStr), rout = parseScaled(reserveOutStr), ain = parseScaled(amountInStr);
  var fee = Number(feeBps);
  if (rin === null || rout === null || ain === null) return null;
  if (rin <= 0n || rout <= 0n || ain <= 0n) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var inAfterFee = ain * BigInt(10000 - fee) / 10000n;
  if (inAfterFee <= 0n) return null;
  var out = rout * inAfterFee / (rin + inAfterFee);
  if (out <= 0n) return null;
  var spot = scaledToNumber(rout) / scaledToNumber(rin);
  var effective = scaledToNumber(out) / scaledToNumber(ain);
  var priceImpactPct = (1 - effective / spot) * 100;
  return {
    out: formatScaled(out),
    spotPrice: spot,
    effectivePrice: effective,
    priceImpactPct: priceImpactPct,
    feePct: fee / 100
  };
}

/* ---------- 2 · Impermanent loss (constant-product pool, 50/50 start) ---------- */
/* If one token's price moves by a multiple r against the other:
   LP value / hold value = 2*sqrt(r) / (1 + r). LP value itself (in the
   unchanged token's terms, deposit normalised) scales by sqrt(r). */
function impermanentLoss(priceRatio, depositStr) {
  var r = Number(priceRatio);
  if (!Number.isFinite(r) || r <= 0) return null;
  var ratio = 2 * Math.sqrt(r) / (1 + r);
  var ilPct = (ratio - 1) * 100;
  var out = { priceRatio: r, ilPct: ilPct, lpVsHold: ratio };
  if (depositStr != null && String(depositStr).trim() !== "") {
    var dep = Number(depositStr);
    if (!Number.isFinite(dep) || dep < 0) return null;
    out.deposit = dep;
    out.holdValue = dep * (1 + r) / 2;
    out.lpValue = dep * Math.sqrt(r);
  }
  return out;
}

/* ---------- 3 · LP fee estimator ---------- */
/* dailyFees = poolVolume24h * feeRate * yourShare, where yourShare is your
   liquidity / pool TVL. APR annualises that day naively (x365) — an estimate
   that assumes volume, fees and TVL never change, which they always do. */
function lpFees(volumeStr, feeBps, yourStr, tvlStr) {
  var volume = Number(volumeStr), your = Number(yourStr), tvl = Number(tvlStr);
  var fee = Number(feeBps);
  if (![volume, your, tvl].every(Number.isFinite)) return null;
  if (volume < 0 || your <= 0 || tvl <= 0 || your > tvl) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) return null;
  var share = your / tvl;
  var daily = volume * (fee / 10000) * share;
  return {
    sharePct: share * 100,
    dailyFees: daily,
    monthlyFees: daily * 30,
    aprPct: your > 0 ? (daily * 365 / your) * 100 : 0,
    feePct: fee / 100
  };
}

/* ---------- 4 · Break-even fees vs impermanent loss ---------- */
/* Fees are what compensate an LP for impermanent loss, so the break-even
   question is concrete: feesNeeded = holdValue - lpValue for the same
   price move and deposit as Tool 2. If the LP also estimates their daily
   fees (e.g. from Tool 3), daysToBreakEven = feesNeeded / dailyFees —
   a model that assumes that daily rate never changes, which it will. */
function breakEvenFees(priceRatio, depositStr, dailyFeesStr) {
  var il = impermanentLoss(priceRatio, depositStr);
  if (il === null || il.deposit == null || !(il.deposit > 0)) return null;
  var feesNeeded = il.holdValue - il.lpValue;
  var out = {
    priceRatio: il.priceRatio,
    ilPct: il.ilPct,
    deposit: il.deposit,
    holdValue: il.holdValue,
    lpValue: il.lpValue,
    feesNeeded: feesNeeded,
    feesNeededPctOfDeposit: il.deposit > 0 ? (feesNeeded / il.deposit) * 100 : 0
  };
  if (dailyFeesStr != null && String(dailyFeesStr).trim() !== "") {
    var daily = Number(dailyFeesStr);
    if (!Number.isFinite(daily) || daily < 0) return null;
    out.dailyFees = daily;
    out.daysToBreakEven = daily > 0 ? feesNeeded / daily : (feesNeeded === 0 ? 0 : Infinity);
  }
  return out;
}

/* ---------- 5 · Liquidity deposit planner (constant-product pools) ---------- */
/* Adding liquidity to a constant-product pool means depositing BOTH tokens
   in the pool's existing ratio — depositing only one side, or the wrong
   ratio, either fails or leaves the excess unused. Given the reserves and
   how much of token A you want to add: requiredB = reserveB * amountA /
   reserveA (exact scaled-BigInt, floored at 9 dp), and because the deposit
   is proportional, your share of the pool afterwards is
   amountA / (reserveA + amountA) — the same fraction on both sides.
   This plans a deposit for AMM v4 / CPMM / CP-Swap style pools; CLMM
   deposits are range-based and work differently. Model only. */
function depositPlan(reserveAStr, reserveBStr, amountAStr) {
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr), aa = parseScaled(amountAStr);
  if (ra === null || rb === null || aa === null) return null;
  if (ra <= 0n || rb <= 0n || aa <= 0n) return null;
  var requiredB = rb * aa / ra;
  if (requiredB <= 0n) return null;
  return {
    requiredB: formatScaled(requiredB),
    sharePct: scaledToNumber(aa) / scaledToNumber(ra + aa) * 100,
    newReserveA: formatScaled(ra + aa),
    newReserveB: formatScaled(rb + requiredB),
    priceBperA: scaledToNumber(rb) / scaledToNumber(ra)
  };
}

/* ---------- 6 · Exact-out swap model (constant-product, inverse of Tool 1) ---------- */
/* Tool 1 answers "how much do I get for this much in?"; traders planning
   around a target amount ask the inverse: "how much in do I need for
   exactly this much out?" Inverting x * y = k:
   inAfterFee = reserveIn * amountOut / (reserveOut - amountOut), then the
   input is grossed back up for the fee: amountIn = inAfterFee * 10000 /
   (10000 - feeBps). Both divisions round UP (ceiling, exact scaled-BigInt)
   so the modelled input is never a hair short of buying the target output
   — the same round-up the on-chain programs require. amountOut must be
   strictly less than reserveOut: a constant-product pool can never pay
   out its whole reserve, and asking for more than it holds is rejected
   here instead of returning a nonsense (or negative) input. Model only. */
function cpSwapExactOut(reserveInStr, reserveOutStr, amountOutStr, feeBps) {
  var rin = parseScaled(reserveInStr), rout = parseScaled(reserveOutStr), aout = parseScaled(amountOutStr);
  var fee = Number(feeBps);
  if (rin === null || rout === null || aout === null) return null;
  if (rin <= 0n || rout <= 0n || aout <= 0n) return null;
  if (aout >= rout) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var denom = rout - aout;
  var inAfterFee = (rin * aout + denom - 1n) / denom;
  var amountIn = (inAfterFee * 10000n + BigInt(9999 - fee)) / BigInt(10000 - fee);
  if (amountIn <= 0n) return null;
  var spot = scaledToNumber(rout) / scaledToNumber(rin);
  var effective = scaledToNumber(aout) / scaledToNumber(amountIn);
  return {
    amountIn: formatScaled(amountIn),
    inAfterFee: formatScaled(inAfterFee),
    spotPrice: spot,
    effectivePrice: effective,
    priceImpactPct: (1 - effective / spot) * 100,
    feePct: fee / 100
  };
}

/* ---------- 7 · Liquidity withdrawal planner (constant-product pools) ---------- */
/* The exit side of Tool 5. Withdrawing liquidity from a constant-product
   pool pays out BOTH tokens in the pool's current ratio, in proportion
   to the share of the pool you redeem: amountOut = reserve * sharePct/100
   * withdrawPct/100, computed in exact scaled-BigInt and floored at 9 dp
   (the pool keeps any sub-unit remainder, as on-chain programs do).
   withdrawPct below 100 models a partial exit; your remaining share
   scales down by the same fraction. The reserves you enter are the
   pool's CURRENT reserves — if prices have moved since you deposited,
   the token mix you get back differs from what you put in, which is
   exactly impermanent loss made concrete (Tool 2). This plans a
   withdrawal for AMM v4 / CPMM / CP-Swap style pools; CLMM withdrawals
   depend on the position's range and ticks and work differently.
   Model only — no withdrawal fee is modelled, and real pools may have
   their own; check the pool page. */
function withdrawPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr) {
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr);
  var share = parseScaled(sharePctStr), withdraw = parseScaled(withdrawPctStr);
  if (ra === null || rb === null || share === null || withdraw === null) return null;
  if (ra <= 0n || rb <= 0n) return null;
  var hundred = 100n * SCALE;
  if (share <= 0n || share > hundred || withdraw <= 0n || withdraw > hundred) return null;
  var denom = 10000n * SCALE * SCALE;
  var outA = ra * share * withdraw / denom;
  var outB = rb * share * withdraw / denom;
  if (outA <= 0n || outB <= 0n) return null;
  var shareVal = scaledToNumber(share), withdrawVal = scaledToNumber(withdraw);
  return {
    outA: formatScaled(outA),
    outB: formatScaled(outB),
    remainingReserveA: formatScaled(ra - outA),
    remainingReserveB: formatScaled(rb - outB),
    sharePct: shareVal,
    withdrawPct: withdrawVal,
    remainingSharePct: shareVal * (100 - withdrawVal) / 100
  };
}

/* ---------- 8 · CLMM range deposit planner (concentrated liquidity) ---------- */
/* Tools 5 and 7 keep noting CLMM deposits are range-based and different —
   this is how they differ. A CLMM position covers a price range
   [lower, upper] (price = token B per token A). With sqrt prices
   s = sqrt(P), sa = sqrt(lower), sb = sqrt(upper), a position with
   liquidity L holds, while the current price P is inside the range:
     amountA = L * (1/s - 1/sb)    amountB = L * (s - sa)
   So given the token A you want to deposit, L = amountA / (1/s - 1/sb)
   and the matching token B follows — the split is set by where the
   current price sits inside your range, not by you. Below the range the
   position is entirely token A (amountB = 0, and L is set by the range
   edges: L = amountA / (1/sa - 1/sb)); at or above the top of the range
   the position is entirely token B, so a token-A deposit cannot fund
   it and that combination is rejected here. Tick indices are the
   standard CLMM ticks, tick = floor(log_{1.0001}(price)) — modelled
   with floating-point logs, so a price sitting exactly on a tick
   boundary can be off by one tick; real positions snap ticks to the
   pool's tick spacing. Model only: no fees, no tick-spacing snapping,
   and real Raydium CLMM deposits are quoted live on the pool page. */
function priceToTick(price) {
  return Math.floor(Math.log(price) / Math.log(1.0001) + 1e-9);
}
function clmmRangePlan(currentStr, lowerStr, upperStr, amountAStr) {
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr), amountA = Number(amountAStr);
  if (![current, lower, upper, amountA].every(Number.isFinite)) return null;
  if (current <= 0 || lower <= 0 || upper <= 0 || amountA <= 0) return null;
  if (lower >= upper) return null;
  if (current >= upper) return null;
  var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
  var liquidity, requiredB, status;
  if (current <= lower) {
    liquidity = amountA / (1 / sa - 1 / sb);
    requiredB = 0;
    status = "below";
  } else {
    liquidity = amountA / (1 / s - 1 / sb);
    requiredB = liquidity * (s - sa);
    status = "in";
  }
  if (!Number.isFinite(liquidity) || liquidity <= 0 || requiredB < 0) return null;
  var valueInB = amountA * current + requiredB;
  return {
    currentPrice: current,
    lowerPrice: lower,
    upperPrice: upper,
    amountA: amountA,
    requiredB: requiredB,
    liquidity: liquidity,
    status: status,
    inRange: status === "in",
    bValuePct: valueInB > 0 ? requiredB / valueInB * 100 : 0,
    tickCurrent: priceToTick(current),
    tickLower: priceToTick(lower),
    tickUpper: priceToTick(upper)
  };
}

/* ---------- 9 · CLMM position checker (what a position holds at a price) ---------- */
/* Tool 8 plans a CLMM deposit; this is its follow-up question: as the
   price moves, what does that position actually hold? A CLMM position's
   token mix is set by its liquidity L and its range [lower, upper]
   (price = token B per token A; s = sqrt(price) and friends):
     price at/below lower:  amountA = L * (1/sqrt(lower) - 1/sqrt(upper)), amountB = 0
     price inside range:    amountA = L * (1/s - 1/sqrt(upper)),
                            amountB = L * (s - sqrt(lower))
     price at/above upper:  amountA = 0,
                            amountB = L * (sqrt(upper) - sqrt(lower))
   So a rising price steadily converts the position into token B (the
   token whose price rose is the one you end up holding LESS of — that
   conversion is concentrated liquidity's version of impermanent loss),
   and outside the range the position is entirely one token and earns
   no fees until price returns. L here is the model liquidity Tool 8
   reports for a deposit — copy it across. Model only: no fees earned
   are added, no tick-spacing snapping, and a real position's amounts
   are quoted live on the pool page. */
function clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, priceStr) {
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr), price = Number(priceStr);
  if (![liquidity, lower, upper, price].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0) return null;
  if (lower >= upper) return null;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price);
  var amountA, amountB, status;
  if (price <= lower) {
    amountA = liquidity * (1 / sa - 1 / sb);
    amountB = 0;
    status = "below";
  } else if (price >= upper) {
    amountA = 0;
    amountB = liquidity * (sb - sa);
    status = "above";
  } else {
    amountA = liquidity * (1 / s - 1 / sb);
    amountB = liquidity * (s - sa);
    status = "in";
  }
  if (!Number.isFinite(amountA) || !Number.isFinite(amountB) || amountA < 0 || amountB < 0) return null;
  var valueInB = amountA * price + amountB;
  return {
    liquidity: liquidity,
    lowerPrice: lower,
    upperPrice: upper,
    price: price,
    amountA: amountA,
    amountB: amountB,
    status: status,
    inRange: status === "in",
    valueInB: valueInB,
    bValuePct: valueInB > 0 ? amountB / valueInB * 100 : 0
  };
}

/* ---------- 10 · Slippage / minimum-received calculator ---------- */
/* Every swap and liquidity add carries a slippage tolerance: how far the
   result may move against you between quote and execution before the
   transaction should fail instead of fill badly. The bounds it produces
   are simple — minimum received = expectedOut * (1 - tolerance) and,
   for an exact-in trade, maximum input = expectedIn * (1 + tolerance) —
   but the ROUNDING is the whole point: both bounds are floored in exact
   scaled-BigInt (9 dp), never rounded up. A minimum that rounds up
   (e.g. half-up: an expected 4 at 0.5% tolerance is exactly 3.98, which
   half-up turns back into 4) is stricter than the tolerance you set and
   makes transactions fail that should have filled; a maximum that rounds
   up quietly lets you pay more than you authorised. Floored, neither
   bound ever exceeds the tolerance — the same flooring the on-chain
   programs and integer SDK paths use. Model only: your real bounds are
   computed from the live quote on the swap / pool page. */
function slippagePlan(expectedOutStr, slippageBps, expectedInStr) {
  var out = parseScaled(expectedOutStr);
  var bps = Number(slippageBps);
  if (out === null || out <= 0n) return null;
  if (!Number.isInteger(bps) || bps < 0 || bps > 9999) return null;
  var minReceived = out * BigInt(10000 - bps) / 10000n;
  if (minReceived <= 0n) return null;
  var res = {
    expectedOut: formatScaled(out),
    minReceived: formatScaled(minReceived),
    protectedAmount: formatScaled(out - minReceived),
    slippageBps: bps,
    slippagePct: bps / 100
  };
  if (expectedInStr != null && String(expectedInStr).trim() !== "") {
    var inp = parseScaled(expectedInStr);
    if (inp === null || inp <= 0n) return null;
    var maxIn = inp * BigInt(10000 + bps) / 10000n;
    if (maxIn <= 0n) return null;
    res.expectedIn = formatScaled(inp);
    res.maxIn = formatScaled(maxIn);
  }
  return res;
}

/* ---------- 11 · CLMM tick / price converter (with tick-spacing snapping) ---------- */
/* Tools 8 and 9 report CLMM ranges as tick indices and warn that real
   positions snap those ticks to the pool's tick spacing — this tool does
   that conversion and snapping. CLMM prices are discrete: each tick is a
   0.01% price step, price = 1.0001^tick, and a price's tick is
   floor(log_{1.0001}(price)) — floored, so the tick's own price is at or
   just below the price you entered and the next tick's price is above it.
   The standard CLMM tick range is -443636..443636; prices whose tick
   falls outside it are rejected here instead of returning a meaningless
   index. Pools only accept position boundaries on multiples of their
   tick spacing: a lower boundary snaps DOWN to the previous multiple
   and an upper boundary snaps UP to the next (floor division, which for
   negative ticks moves away from zero on the down snap — -2232 at
   spacing 10 snaps down to -2240, not -2230). Tick maths here uses
   floating-point logs / powers, so a price sitting exactly on a tick
   boundary can land one tick off; the pool page quotes the real ticks.
   Model only. */
var TICK_MIN = -443636, TICK_MAX = 443636;
function tickToPrice(tick) {
  var t = Number(tick);
  if (!Number.isInteger(t) || t < TICK_MIN || t > TICK_MAX) return null;
  return Math.pow(1.0001, t);
}
function tickPriceConvert(priceStr, spacingStr) {
  var price = Number(priceStr);
  if (!Number.isFinite(price) || price <= 0) return null;
  var tick = priceToTick(price);
  if (tick < TICK_MIN || tick > TICK_MAX) return null;
  var tickPrice = tickToPrice(tick);
  var out = {
    price: price,
    tick: tick,
    tickPrice: tickPrice,
    nextTick: tick + 1,
    nextTickPrice: tick === TICK_MAX ? null : tickToPrice(tick + 1)
  };
  if (spacingStr != null && String(spacingStr).trim() !== "") {
    var spacing = Number(spacingStr);
    if (!Number.isInteger(spacing) || spacing <= 0) return null;
    var down = Math.floor(tick / spacing) * spacing;
    var up = down === tick ? tick : down + spacing;
    out.spacing = spacing;
    out.snappedDownTick = down;
    out.snappedDownPrice = Math.pow(1.0001, down);
    out.snappedUpTick = up;
    out.snappedUpPrice = Math.pow(1.0001, up);
  }
  return out;
}

/* ---------- 12 · CLMM position vs holding (concentrated impermanent loss) ---------- */
/* Tool 9 shows what a CLMM position holds at a price; Tool 2 quantifies
   impermanent loss for a constant-product position. This joins the two:
   it is Tool 2's question for a CLMM position. Take the position's
   holdings at its ENTRY price (Tool 9's maths at that price) and value
   them two ways at the CHECK price, both in token B:
     holding value   = entryAmountA * checkPrice + entryAmountB
     position value  = checkAmountA * checkPrice + checkAmountB
   The position converts itself as price moves (selling the token that
   rises, buying the one that falls), so position value never exceeds
   holding value — the shortfall is concentrated liquidity's impermanent
   loss at that price, and feesNeededInB is exactly the fee income (in
   token B) the position must have earned to match simply holding. The
   gap is zero at the entry price and grows the further price travels,
   inside or outside the range. Model only: no fees earned are added,
   and a real position's value is quoted live on the pool page. */
function clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr) {
  var entry = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, entryPriceStr);
  var check = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, checkPriceStr);
  if (entry === null || check === null) return null;
  var holdValueInB = entry.amountA * check.price + entry.amountB;
  var positionValueInB = check.valueInB;
  var diffInB = positionValueInB - holdValueInB;
  return {
    liquidity: entry.liquidity,
    lowerPrice: entry.lowerPrice,
    upperPrice: entry.upperPrice,
    entryPrice: entry.price,
    checkPrice: check.price,
    entryAmountA: entry.amountA,
    entryAmountB: entry.amountB,
    checkAmountA: check.amountA,
    checkAmountB: check.amountB,
    entryStatus: entry.status,
    checkStatus: check.status,
    holdValueInB: holdValueInB,
    positionValueInB: positionValueInB,
    diffInB: diffInB,
    vsHoldPct: holdValueInB > 0 ? diffInB / holdValueInB * 100 : 0,
    feesNeededInB: holdValueInB - positionValueInB
  };
}

/* ---------- 13 · CLMM fee estimator ---------- */
/* Tool 3 estimates constant-product LP fees from your share of TVL;
   a CLMM position's share is not of TVL but of the ACTIVE liquidity
   at the current tick, and it only earns while price is inside its
   range. The model is the same shape with those two corrections:
     pool fees per day  = daily volume (in token B) * fee tier
     your share         = your liquidity L / total active liquidity
     your fees per day  = pool fees * share * time-in-range fraction
   Total active liquidity is the number nobody can read off a single
   pool page precisely — it is an input here, labelled an estimate,
   and it must be at least your own L (your liquidity is part of it),
   so total < L is rejected rather than silently paying out a share
   above 100%. The naive APR (only with a position value, also an
   input) just annualises the daily figure — it assumes volume, the
   active-liquidity total and your time in range all hold still,
   which in a live pool none of them do. Pair it with Tool 12: fees
   per day vs the fee hurdle a price move creates is the honest
   CLMM question. Model only — not a live quote or yield promise. */
function clmmFeeEstimate(yourLStr, totalActiveLStr, volumePerDayStr, feeBps, daysStr, inRangePctStr, positionValueStr) {
  /* required fields must be present: Number("") is 0, which the
     volume >= 0 allowance below would otherwise let slip through */
  var required = [yourLStr, totalActiveLStr, volumePerDayStr, feeBps, daysStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var yourL = Number(yourLStr), totalL = Number(totalActiveLStr);
  var volume = Number(volumePerDayStr), fee = Number(feeBps), days = Number(daysStr);
  if (![yourL, totalL, volume, fee, days].every(Number.isFinite)) return null;
  if (yourL <= 0 || totalL <= 0 || volume < 0 || days <= 0) return null;
  if (totalL < yourL) return null;
  if (fee < 0 || fee > 10000) return null;
  var inRangePct = 100;
  if (inRangePctStr != null && String(inRangePctStr).trim() !== "") {
    inRangePct = Number(inRangePctStr);
    if (!Number.isFinite(inRangePct) || inRangePct < 0 || inRangePct > 100) return null;
  }
  var positionValue = null;
  if (positionValueStr != null && String(positionValueStr).trim() !== "") {
    positionValue = Number(positionValueStr);
    if (!Number.isFinite(positionValue) || positionValue <= 0) return null;
  }
  var sharePct = yourL / totalL * 100;
  var poolFeesPerDay = volume * fee / 10000;
  var feesPerDay = poolFeesPerDay * (yourL / totalL) * (inRangePct / 100);
  return {
    yourLiquidity: yourL,
    totalActiveLiquidity: totalL,
    volumePerDay: volume,
    feeBps: fee,
    days: days,
    inRangePct: inRangePct,
    sharePct: sharePct,
    poolFeesPerDay: poolFeesPerDay,
    feesPerDay: feesPerDay,
    feesForPeriod: feesPerDay * days,
    positionValueInB: positionValue,
    naiveAprPct: positionValue !== null ? feesPerDay * 365 / positionValue * 100 : null
  };
}

/* ---------- 14 · CLMM wallet-balance deposit planner ---------- */
/* Tool 8 answers "I want to deposit this much token A — how much token
   B do I need?" Real wallets ask the inverse: "I hold this much of
   BOTH tokens — what is the biggest position my balances can fund in
   this range, and what will be left over?" Inside the range a position
   with liquidity L uses (Tool 8/9's maths, s/sa/sb = sqrt prices):
     amountA = L * (1/s - 1/sb)    amountB = L * (s - sa)
   so each balance alone caps the liquidity:
     LfromA = balanceA / (1/s - 1/sb),  LfromB = balanceB / (s - sa)
   and the fundable liquidity is the SMALLER cap — the scarcer side is
   used in full and the other side is partly left over. Below the range
   the position is entirely token A (token B cannot fund it at all, so
   the whole B balance is leftover and L is set by the range edges);
   at or above the top it is entirely token B, symmetrically. A zero
   balance on a side the position needs funds nothing and is rejected
   inside the range. Model only: no fees, no tick-spacing snapping,
   and a real deposit is quoted live on the pool page. */
function clmmWalletPlan(currentStr, lowerStr, upperStr, balanceAStr, balanceBStr) {
  var required = [currentStr, lowerStr, upperStr, balanceAStr, balanceBStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr);
  var balanceA = Number(balanceAStr), balanceB = Number(balanceBStr);
  if (![current, lower, upper, balanceA, balanceB].every(Number.isFinite)) return null;
  if (current <= 0 || lower <= 0 || upper <= 0) return null;
  if (balanceA < 0 || balanceB < 0) return null;
  if (lower >= upper) return null;
  var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
  var liquidity, usedA, usedB, status, limiting;
  if (current <= lower) {
    if (balanceA <= 0) return null;
    liquidity = balanceA / (1 / sa - 1 / sb);
    usedA = balanceA; usedB = 0; status = "below"; limiting = "A";
  } else if (current >= upper) {
    if (balanceB <= 0) return null;
    liquidity = balanceB / (sb - sa);
    usedA = 0; usedB = balanceB; status = "above"; limiting = "B";
  } else {
    if (balanceA <= 0 || balanceB <= 0) return null;
    var lFromA = balanceA / (1 / s - 1 / sb);
    var lFromB = balanceB / (s - sa);
    liquidity = Math.min(lFromA, lFromB);
    usedA = liquidity * (1 / s - 1 / sb);
    usedB = liquidity * (s - sa);
    status = "in";
    limiting = Math.abs(lFromA - lFromB) <= Math.max(lFromA, lFromB) * 1e-12 ? "both" : (lFromA < lFromB ? "A" : "B");
  }
  if (!Number.isFinite(liquidity) || liquidity <= 0 || usedA < 0 || usedB < 0) return null;
  return {
    currentPrice: current,
    lowerPrice: lower,
    upperPrice: upper,
    balanceA: balanceA,
    balanceB: balanceB,
    liquidity: liquidity,
    usedA: usedA,
    usedB: usedB,
    leftoverA: balanceA - usedA,
    leftoverB: balanceB - usedB,
    status: status,
    inRange: status === "in",
    limiting: limiting
  };
}

/* ---------- 15 · CLMM break-even days (Tools 12 + 13 joined) ---------- */
/* Tool 4 does this for constant-product positions; Tools 12 and 13
   leave the CLMM version as two numbers on two different forms:
   Tool 12 reports the fees (in token B) a position must earn to
   match holding at a check price, and Tool 13 estimates the fees
   (in token B) it earns per day. This tool divides one by the other:
     daysToBreakEven = feesNeededInB (Tool 12) / feesPerDayInB (Tool 13)
   Both halves are computed by calling those tools' own functions, so
   the hurdle and the rate can never drift apart from what their own
   forms show. Two honest edges: at the entry price there is no gap
   to close, so the answer is 0 days even if the fee rate is 0; and
   with a real gap but a 0 fee rate (no volume, a 0 fee tier, or 0%
   time in range) the position never catches holding at that rate —
   daysToBreakEven is Infinity, not a very large number. The result
   assumes the fee rate holds still for the whole period, which in a
   live pool it will not — volume, active liquidity and time in range
   all move. Model only — not a live quote or a yield promise. */
function clmmBreakEven(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr, totalActiveLStr, volumePerDayStr, feeBps, inRangePctStr) {
  var vh = clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr);
  if (vh === null) return null;
  /* one day of Tool 13's estimator at the same liquidity: its fees
     for a 1-day period are exactly its fees per day */
  var est = clmmFeeEstimate(liquidityStr, totalActiveLStr, volumePerDayStr, feeBps, "1", inRangePctStr, "");
  if (est === null) return null;
  var feesNeeded = vh.feesNeededInB;
  var days;
  if (feesNeeded <= 1e-12) days = 0;
  else if (est.feesPerDay > 0) days = feesNeeded / est.feesPerDay;
  else days = Infinity;
  return {
    liquidity: vh.liquidity,
    lowerPrice: vh.lowerPrice,
    upperPrice: vh.upperPrice,
    entryPrice: vh.entryPrice,
    checkPrice: vh.checkPrice,
    entryStatus: vh.entryStatus,
    checkStatus: vh.checkStatus,
    holdValueInB: vh.holdValueInB,
    positionValueInB: vh.positionValueInB,
    vsHoldPct: vh.vsHoldPct,
    feesNeededInB: feesNeeded,
    sharePct: est.sharePct,
    poolFeesPerDay: est.poolFeesPerDay,
    feesPerDay: est.feesPerDay,
    inRangePct: est.inRangePct,
    daysToBreakEven: days
  };
}

/* ---------- 16 · Constant-product arbitrage model ---------- */
/* Why pools stay near the market price: if a pool's spot price
   (reserveB / reserveA, in B per A) differs from a price elsewhere,
   a trade that moves the pool's price TO that external price is
   the textbook arbitrage. With k = reserveA * reserveB held
   constant, the reserves at the external price Pe are forced:
     reserveA' = sqrt(k / Pe),  reserveB' = sqrt(k * Pe)
   Pe above spot: A is cheap in the pool — pay B in (net
   reserveB' - reserveB), take A out (reserveA - reserveA').
   Pe below spot: the mirror — pay A in, take B out. The fee is
   taken from the input before it reaches the pool (as in Tool 1),
   so the gross input is net / (1 - fee) and the modelled profit,
   valued in B at the external price, is
     outValueInB - grossInValueInB.
   A gap smaller than the fee makes that profit negative at the
   price-aligning size — reported as-is, never dressed up. The
   external price is YOUR input, not a live feed: this sizes a
   textbook trade against a price you supply, it does not find
   one. Model only — no routing, no other venues' depth or fees,
   no transaction costs, not financial advice. */
function cpArbitrage(reserveAStr, reserveBStr, externalPriceStr, feeBps) {
  var required = [reserveAStr, reserveBStr, externalPriceStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var pe = Number(externalPriceStr), fee = Number(feeBps);
  if (![ra, rb, pe, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || pe <= 0) return null;
  if (fee < 0 || fee >= 10000) return null;
  var spot = rb / ra;
  var k = ra * rb;
  var targetA = Math.sqrt(k / pe), targetB = Math.sqrt(k * pe);
  var base = { reserveA: ra, reserveB: rb, spotPrice: spot, externalPrice: pe,
    priceGapPct: (pe / spot - 1) * 100, feeBps: fee, postTradeSpot: pe };
  if (Math.abs(pe - spot) / spot < 1e-12) {
    return Object.assign(base, { direction: "none", inToken: null, netIn: 0, grossIn: 0, amountOut: 0, outToken: null, profitInB: 0 });
  }
  var keep = 1 - fee / 10000;
  if (pe > spot) {
    var netInB = targetB - rb, outA = ra - targetA;
    var grossInB = netInB / keep;
    return Object.assign(base, { direction: "buy-a", inToken: "B", netIn: netInB, grossIn: grossInB, amountOut: outA, outToken: "A", profitInB: outA * pe - grossInB });
  }
  var netInA = targetA - ra, outB = rb - targetB;
  var grossInA = netInA / keep;
  return Object.assign(base, { direction: "sell-a", inToken: "A", netIn: netInA, grossIn: grossInA, amountOut: outB, outToken: "B", profitInB: outB - grossInA * pe });
}

/* ---------- 17 · Price-impact trade sizer ---------- */
/* The inverse question to Tool 1: not "what does this trade get?"
   but "how large can a trade get before its price impact crosses a
   cap I choose?" Tool 1 measures price impact as
     1 - (effective price / spot price),  effective = out / grossIn,
   a measure that INCLUDES the fee: even a vanishingly small trade
   shows impact = the fee fraction, because the fee is taken from
   the input before the curve sees it. With net = grossIn*(1-fee)
   reaching the pool, out/spot-expected works out to
   reserveIn*(1-fee) / (reserveIn + net), so setting the impact
   equal to the cap p and solving for the input gives
     grossIn = reserveIn * (p - fee) / ((1 - p) * (1 - fee)).
   Two honest consequences, reported as-is: a cap at or below the
   fee itself admits no positive trade at all (feasible:false, the
   only trade that fits is none), and the answer scales with the
   pool — the same cap in a pool 10x deeper allows a trade 10x
   larger, which is the whole point of pool depth. Model only —
   the reserves are your inputs, not live pool state, and real
   routes split trades across pools. Not financial advice. */
function priceImpactSizer(reserveInStr, reserveOutStr, maxImpactPctStr, feeBps) {
  var required = [reserveInStr, reserveOutStr, maxImpactPctStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var rin = Number(reserveInStr), rout = Number(reserveOutStr);
  var capPct = Number(maxImpactPctStr), fee = Number(feeBps);
  if (![rin, rout, capPct, fee].every(Number.isFinite)) return null;
  if (rin <= 0 || rout <= 0) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var feeFrac = fee / 10000, pFrac = capPct / 100;
  var base = { reserveIn: rin, reserveOut: rout, spotPrice: rout / rin,
    maxImpactPct: capPct, feeBps: fee, feeImpactPct: feeFrac * 100 };
  if (pFrac <= feeFrac) {
    return Object.assign(base, { feasible: false, maxAmountIn: 0, netIn: 0, amountOut: 0, actualImpactPct: feeFrac * 100 });
  }
  var grossIn = rin * (pFrac - feeFrac) / ((1 - pFrac) * (1 - feeFrac));
  var netIn = grossIn * (1 - feeFrac);
  var amountOut = rout * netIn / (rin + netIn);
  var effective = amountOut / grossIn;
  return Object.assign(base, {
    feasible: true,
    maxAmountIn: grossIn,
    netIn: netIn,
    amountOut: amountOut,
    effectivePrice: effective,
    actualImpactPct: (1 - effective / base.spotPrice) * 100,
    postTradeSpotPrice: (rout - amountOut) / (rin + netIn)
  });
}

/* ---------- 18 · LP-token share & value calculator ---------- */
/* Tools 5 and 7 work in share percentages, but what an LP actually
   HOLDS is a count of LP tokens against the pool's total LP supply —
   and that count is the share: share = yourTokens / totalSupply.
   Redeeming (burning) those tokens pays out both reserves in the
   pool's current ratio, exactly as Tool 7 models for a percentage:
     amountOut = reserve * yourTokens / totalSupply
   computed in exact scaled-BigInt and floored at 9 dp (the pool
   keeps any sub-unit remainder, as on-chain programs do). The
   position's value in token B values the token-A side at the pool's
   own spot price (reserveB / reserveA) — the pool's price, not an
   external one, so it is the value the pool itself implies. Two
   honest consequences: the share a fixed token count represents
   SHRINKS as new LPs deposit (the supply grows), so a count that
   was 1% at deposit need not be 1% now; and holding every token in
   the supply redeems the whole pool, no more and no less. Model
   only — no withdrawal fee is modelled, and a real redemption is
   quoted live on the pool page. CLMM positions are NFTs with
   range-based amounts (Tools 8/9), not fungible LP tokens. */
function lpTokenValue(reserveAStr, reserveBStr, totalSupplyStr, yourTokensStr) {
  var required = [reserveAStr, reserveBStr, totalSupplyStr, yourTokensStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr);
  var supply = parseScaled(totalSupplyStr), yours = parseScaled(yourTokensStr);
  if (ra === null || rb === null || supply === null || yours === null) return null;
  if (ra <= 0n || rb <= 0n || supply <= 0n || yours <= 0n) return null;
  if (yours > supply) return null;
  var outA = ra * yours / supply;
  var outB = rb * yours / supply;
  if (outA <= 0n || outB <= 0n) return null;
  var spot = scaledToNumber(rb) / scaledToNumber(ra);
  return {
    amountA: formatScaled(outA),
    amountB: formatScaled(outB),
    remainingReserveA: formatScaled(ra - outA),
    remainingReserveB: formatScaled(rb - outB),
    sharePct: scaledToNumber(yours) / scaledToNumber(supply) * 100,
    priceBperA: spot,
    valueInB: scaledToNumber(outB) + scaledToNumber(outA) * spot
  };
}

/* ---------- 19 · Single-sided zap-in planner (constant-product pools) ---------- */
/* Tools 5 and 14 assume you already hold both tokens in the right
   ratio. A wallet often holds only ONE side — say token A — and the
   standard way in is a "zap": swap part of the A for B in the same
   pool, then deposit what remains of the A together with all of the
   B the swap returned. The whole question is the split. The swap
   follows Tool 1's model (net = grossIn * (1 - fee) reaches the
   pool, out = reserveB * net / (reserveA + net), post-swap reserves
   Ra+net / Rb-out), and the deposit must match the POST-swap ratio
   (Tool 5), so with s the amount swapped and k = 1 - fee:
     out / (X - s)  =  (Rb - out) / (Ra + k*s)
   Substituting Tool 1's out and clearing denominators gives a
   quadratic in s:  k^2*s^2 + Ra*(k+1)*s - Ra*X = 0, whose positive
   root is the split (at zero fee it reduces to the classic
   s = sqrt(Ra*(Ra + X)) - Ra). Two invariants fall out and are
   tested: the B the swap takes out comes straight back in as the
   deposit, so the pool's final B reserve equals the B reserve you
   started with; and the deposit's share is the same fraction on
   both sides. A larger fee makes the swap leg less efficient, so
   the split swaps slightly MORE of the holding to raise the same
   B. Model only — one trade in one pool, no routing, no price
   movement between the swap and the deposit (a real zap is a
   single transaction for exactly that reason), and the reserves
   are your inputs, not live pool state. CLMM positions are
   range-based and a single-sided CLMM entry is Tools 8/14's
   entirely-one-token case, not this. Not financial advice. */
function zapInPlan(reserveAStr, reserveBStr, amountAStr, feeBps) {
  var required = [reserveAStr, reserveBStr, amountAStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var x = Number(amountAStr), fee = Number(feeBps);
  if (![ra, rb, x, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || x <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var k = 1 - fee / 10000;
  var a = k * k, b = ra * (k + 1), c = -ra * x;
  var s = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
  if (!Number.isFinite(s) || s <= 0 || s >= x) return null;
  var netIn = s * k;
  var amountOut = rb * netIn / (ra + netIn);
  var depositA = x - s, depositB = amountOut;
  if (!(amountOut > 0) || !(depositA > 0)) return null;
  var postSwapReserveA = ra + netIn, postSwapReserveB = rb - amountOut;
  var finalReserveA = postSwapReserveA + depositA;
  var finalReserveB = postSwapReserveB + depositB;
  return {
    reserveA: ra, reserveB: rb, amountA: x, feeBps: fee,
    swapIn: s, netIn: netIn, swapOut: amountOut,
    depositA: depositA, depositB: depositB,
    postSwapReserveA: postSwapReserveA, postSwapReserveB: postSwapReserveB,
    finalReserveA: finalReserveA, finalReserveB: finalReserveB,
    sharePct: depositA / finalReserveA * 100,
    spotPrice: rb / ra
  };
}

/* ---------- 20 · Single-sided zap-out planner (constant-product pools) ---------- */
/* Tool 19's exit mirror. Tool 7's withdrawal always pays BOTH tokens
   in the pool's ratio, but a wallet often wants to leave holding ONE
   token — say token A. The standard way out is a "zap-out": withdraw
   (Tool 7's model, unchanged), then swap all of the token B the
   withdrawal returned back into token A in the same pool, against
   the POST-withdrawal reserves (Tool 1's model, unchanged). Both
   legs are computed by those tools' own functions, so the numbers
   can never drift from their own forms. The consolidation is not
   free, and the tool prices it honestly: valueAtSpotA is what the
   withdrawn pair would be worth in A if the B leg filled at the
   post-withdrawal spot price with no fee and no impact, and
   consolidationCostA / consolidationCostPct are the difference —
   the fee plus the price impact of swapping into a pool your own
   withdrawal just made shallower, which is why the cost grows with
   your share of the pool. One honest edge: withdrawing 100% of a
   pool you own 100% of leaves no pool behind to swap in, so that
   combination returns feasible: false (you simply keep both
   tokens, or swap elsewhere) instead of a made-up fill. Model
   only — one pool, no routing, no price movement between the
   withdrawal and the swap (a real zap-out is a single transaction
   for exactly that reason), no withdrawal fee modelled, and the
   reserves are your inputs, not live pool state. CLMM exits are
   range-based and differ. Not financial advice. */
function zapOutPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr, feeBps) {
  var required = [reserveAStr, reserveBStr, sharePctStr, withdrawPctStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var fee = Number(feeBps);
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wd = withdrawPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr);
  if (wd === null) return null;
  var base = {
    withdrawA: wd.outA, withdrawB: wd.outB,
    postWithdrawReserveA: wd.remainingReserveA, postWithdrawReserveB: wd.remainingReserveB,
    sharePct: wd.sharePct, withdrawPct: wd.withdrawPct, feeBps: fee
  };
  var remA = parseScaled(wd.remainingReserveA), remB = parseScaled(wd.remainingReserveB);
  if (remA <= 0n || remB <= 0n) {
    return Object.assign(base, { feasible: false, swapInB: wd.outB, swapOutA: null, totalA: null,
      spotPrice: null, priceImpactPct: null, valueAtSpotA: null, consolidationCostA: null, consolidationCostPct: null });
  }
  var swap = cpSwap(wd.remainingReserveB, wd.remainingReserveA, wd.outB, fee);
  if (swap === null) return null;
  var totalA = parseScaled(wd.outA) + parseScaled(swap.out);
  var spot = scaledToNumber(remB) / scaledToNumber(remA);
  var valueAtSpotA = scaledToNumber(parseScaled(wd.outA)) + scaledToNumber(parseScaled(wd.outB)) / spot;
  var totalANum = scaledToNumber(totalA);
  return Object.assign(base, {
    feasible: true,
    swapInB: wd.outB,
    swapOutA: swap.out,
    totalA: formatScaled(totalA),
    spotPrice: spot,
    priceImpactPct: swap.priceImpactPct,
    valueAtSpotA: valueAtSpotA,
    consolidationCostA: valueAtSpotA - totalANum,
    consolidationCostPct: (valueAtSpotA - totalANum) / valueAtSpotA * 100
  });
}

/* ---------- 21 · IL tolerance band (constant-product pool, 50/50 start) ---------- */
/* Tools 2 and 4 answer forwards: at THIS price move, how much impermanent
   loss, and how many fees to break even against it (Tool 4's feesNeeded =
   holdValue - lpValue)? This one inverts Tool 4 exactly: given the fees a
   position has already earned, how far can the price still move before the
   shortfall against holding consumes those fees? Tool 4's shortfall as a
   fraction of the deposit is (1 + r)/2 - sqrt(r) = (sqrt(r) - 1)^2 / 2, so
   with f = fees / deposit the band edges are sqrt(r) = 1 +/- sqrt(2f) —
   symmetric in the square root of the price, not in the price itself.
   One honest asymmetry: as the price falls to zero the shortfall caps at
   half the deposit (the half of the position held in the other token is
   untouched), so fees of 50% of the deposit or more can never be consumed
   by a fall, however far — reported as downUnbounded, not a made-up edge.
   A rise has no such cap. Zero fees earned means the band has already
   collapsed to the entry price. Model only — constant product, 50/50
   start, fees counted in the deposit's terms and held outside the pool;
   no compounding and no fee growth of the position itself is modelled.
   Not financial advice. */
function ilToleranceBand(depositStr, feesStr) {
  var required = [depositStr, feesStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var dep = Number(depositStr), fees = Number(feesStr);
  if (!Number.isFinite(dep) || !Number.isFinite(fees)) return null;
  if (dep <= 0 || fees < 0) return null;
  var f = fees / dep;
  var a = Math.sqrt(2 * f);
  var rHigh = (1 + a) * (1 + a);
  var base = {
    deposit: dep, feesEarned: fees, feePctOfDeposit: f * 100,
    priceRatioHigh: rHigh, moveUpPct: (rHigh - 1) * 100
  };
  if (f >= 0.5) {
    return Object.assign(base, { downUnbounded: true, priceRatioLow: null, moveDownPct: null });
  }
  var rLow = (1 - a) * (1 - a);
  return Object.assign(base, {
    downUnbounded: false,
    priceRatioLow: rLow,
    moveDownPct: (1 - rLow) * 100
  });
}

/* ---------- 22 · CLMM symmetric-range (±%) planner ---------- */
/* Tools 8/14 ask for a CLMM range as two raw prices, but the way LPs
   actually talk about a range is a width around the current price:
   "±25%". This tool takes that form — current price P and a width w%
   — and builds the range MULTIPLICATIVELY symmetric around P:
     upper = P * m,  lower = P / m,  with m = 1 + w/100.
   Multiplicative symmetry is the honest kind for prices (a rise and a
   fall that undo each other), and it has a visible consequence the
   tool reports rather than hides: the percentage room differs by
   side — ±25% of width is +25% of room up but only −20% down,
   because the lower edge is P/1.25, not P*(1 − 0.25).
   With a pool tick spacing (optional), the raw edges are snapped the
   way pools require BEFORE planning — lower tick down, upper tick up
   (Tool 11's rule, floor division) — and the deposit is planned on
   the SNAPPED range's prices, because that is the range a real
   position would actually cover; without a spacing the raw range is
   planned as-is. Ranges whose ticks fall outside the standard CLMM
   tick range (-443636..443636, Tool 11) are rejected. The deposit
   itself is planned by Tool 8's own clmmRangePlan, so the split and
   liquidity can never drift from that tool's numbers. Model only —
   no fees, and a real position is quoted live on the pool page. */
function clmmSymmetricRange(currentStr, widthPctStr, amountAStr, spacingStr) {
  var required = [currentStr, widthPctStr, amountAStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var current = Number(currentStr), widthPct = Number(widthPctStr), amountA = Number(amountAStr);
  if (![current, widthPct, amountA].every(Number.isFinite)) return null;
  if (current <= 0 || widthPct <= 0 || amountA <= 0) return null;
  var m = 1 + widthPct / 100;
  var rawLower = current / m, rawUpper = current * m;
  var tickLower = priceToTick(rawLower), tickUpper = priceToTick(rawUpper);
  if (tickLower < TICK_MIN || tickUpper > TICK_MAX) return null;
  var effLower = rawLower, effUpper = rawUpper, snapped = false, spacing = null;
  if (spacingStr != null && String(spacingStr).trim() !== "") {
    spacing = Number(spacingStr);
    if (!Number.isInteger(spacing) || spacing <= 0) return null;
    var downTick = Math.floor(tickLower / spacing) * spacing;
    var floorUp = Math.floor(tickUpper / spacing) * spacing;
    var upTick = floorUp === tickUpper ? tickUpper : floorUp + spacing;
    if (downTick < TICK_MIN || upTick > TICK_MAX) return null;
    snapped = downTick !== tickLower || upTick !== tickUpper;
    tickLower = downTick; tickUpper = upTick;
    effLower = tickToPrice(downTick); effUpper = tickToPrice(upTick);
    if (effLower == null || effUpper == null) return null;
  }
  var plan = clmmRangePlan(String(current), String(effLower), String(effUpper), String(amountA));
  if (plan === null) return null;
  return {
    currentPrice: current,
    widthPct: widthPct,
    multiple: m,
    rawLower: rawLower,
    rawUpper: rawUpper,
    effLower: effLower,
    effUpper: effUpper,
    snapped: snapped,
    spacing: spacing,
    tickLower: tickLower,
    tickUpper: tickUpper,
    amountA: amountA,
    requiredB: plan.requiredB,
    liquidity: plan.liquidity,
    bValuePct: plan.bValuePct,
    upRoomPct: (effUpper / current - 1) * 100,
    downRoomPct: (1 - effLower / current) * 100
  };
}

/* ---------- 23 · Two-hop swap model ---------- */
/* Real trades often have no direct pool for the pair wanted, so they
   route through an intermediate token: A -> M in one constant-product
   pool, then M -> C in a second. This model is Tool 1 twice, honestly
   composed: hop 1 is cpSwap on the first pool, and hop 2's input is
   hop 1's output STRING exactly as Tool 1 reports it (floored at
   9 dp — that, not a hidden-precision value, is what the second pool
   would receive). Each hop pays its own pool's fee and takes its own
   price impact against its own reserves, so the routed trade always
   does worse than either hop alone. The combined spot price is the
   product of the two hops' spot prices (M per A x C per M = C per A),
   and the combined price impact follows Tool 1's definition against
   that product — equivalently 1 - (1 - i1)(1 - i2) for the hops'
   impacts i1 and i2. Both hops are CP pools in this model; a real
   route may cross CLMM pools, other venues and priority fees, none of
   which are modelled. Model only — your inputs, not live pool state.
   Not a live quote and not financial advice. */
function twoHopSwap(reserve1InStr, reserve1OutStr, reserve2InStr, reserve2OutStr, amountInStr, fee1Bps, fee2Bps) {
  var hop1 = cpSwap(reserve1InStr, reserve1OutStr, amountInStr, fee1Bps);
  if (hop1 === null) return null;
  var hop2 = cpSwap(reserve2InStr, reserve2OutStr, hop1.out, fee2Bps);
  if (hop2 === null) return null;
  var amountIn = Number(amountInStr);
  if (!Number.isFinite(amountIn) || amountIn <= 0) return null;
  var spotPrice = hop1.spotPrice * hop2.spotPrice;
  var effectivePrice = Number(hop2.out) / amountIn;
  return {
    amountIn: amountIn,
    midOut: hop1.out,
    out: hop2.out,
    hop1ImpactPct: hop1.priceImpactPct,
    hop2ImpactPct: hop2.priceImpactPct,
    spotPrice: spotPrice,
    effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    fee1Pct: hop1.feePct,
    fee2Pct: hop2.feePct
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseScaled, formatScaled, cpSwap, impermanentLoss, lpFees, breakEvenFees, depositPlan, cpSwapExactOut, withdrawPlan, priceToTick, tickToPrice, tickPriceConvert, TICK_MIN, TICK_MAX, clmmRangePlan, clmmPositionAtPrice, clmmVsHold, clmmFeeEstimate, clmmWalletPlan, clmmBreakEven, cpArbitrage, priceImpactSizer, lpTokenValue, zapInPlan, zapOutPlan, ilToleranceBand, clmmSymmetricRange, twoHopSwap, slippagePlan, SCALE };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    /* --- project filtering --- */
    var cards = Array.prototype.slice.call(document.querySelectorAll("#cards .card"));
    var q = document.getElementById("q");
    var status = document.getElementById("filter-status");
    var noResults = document.getElementById("no-results");
    var activeFilter = "all";
    function applyFilter() {
      var needle = (q.value || "").toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var catOk = activeFilter === "all" || (card.getAttribute("data-cat") || "").split(" ").indexOf(activeFilter) !== -1;
        var textOk = !needle || (card.getAttribute("data-name") + " " + card.textContent).toLowerCase().indexOf(needle) !== -1;
        var show = catOk && textOk;
        card.hidden = !show;
        if (show) shown++;
      });
      noResults.hidden = shown !== 0;
      status.textContent = shown + (shown === 1 ? " project shown" : " projects shown");
    }
    q.addEventListener("input", applyFilter);
    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        activeFilter = chip.getAttribute("data-filter");
        applyFilter();
      });
    });
    applyFilter();

    function fmt(n, dp) { return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }

    /* --- swap model --- */
    document.getElementById("swap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpSwap(
        document.getElementById("rin").value,
        document.getElementById("rout").value,
        document.getElementById("ain").value,
        document.getElementById("swap-fee").value
      );
      var out = document.getElementById("swap-result");
      out.textContent = res === null
        ? "Enter positive reserves and an amount in (up to 9 decimal places), and a fee in basis points (25 = 0.25%)."
        : "Model output: ≈ " + res.out + " tokens out. Spot price " + fmt(res.spotPrice, 6) +
          ", effective price " + fmt(res.effectivePrice, 6) + " (after the " + fmt(res.feePct, 2) +
          "% fee), price impact incl. fee " + fmt(res.priceImpactPct, 2) +
          "%. A constant-product model, not a live Raydium quote.";
      if (res !== null) document.getElementById("aout").value = res.out;
    });

    /* --- impermanent loss --- */
    document.getElementById("il-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = impermanentLoss(document.getElementById("ratio").value, document.getElementById("deposit").value);
      var out = document.getElementById("il-result");
      if (res === null) {
        out.textContent = "Enter a price multiple above 0 — e.g. 2 if one token doubled against the other, 0.5 if it halved.";
      } else if (res.deposit != null) {
        out.textContent = "At a " + res.priceRatio + "x price move: impermanent loss " + fmt(res.ilPct, 2) +
          "% vs holding. Holding would be $" + fmt(res.holdValue, 2) + "; the LP position would be $" +
          fmt(res.lpValue, 2) + " (before fees earned — fees are what compensate for this). Model only.";
      } else {
        out.textContent = "At a " + res.priceRatio + "x price move: impermanent loss " + fmt(res.ilPct, 2) +
          "% vs holding (before fees earned). Model only.";
      }
    });

    /* --- LP fee estimator --- */
    document.getElementById("fee-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = lpFees(
        document.getElementById("volume").value,
        document.getElementById("fee-fee").value,
        document.getElementById("your-liq").value,
        document.getElementById("tvl").value
      );
      var out = document.getElementById("fee-result");
      out.textContent = res === null
        ? "Enter a 24h volume, your liquidity and the pool TVL (your liquidity can't exceed the TVL), plus a fee in basis points."
        : "Estimate: your share is " + fmt(res.sharePct, 4) + "% of the pool, earning ≈ $" + fmt(res.dailyFees, 2) +
          "/day (≈ $" + fmt(res.monthlyFees, 2) + "/30 days), a naive APR of " + fmt(res.aprPct, 2) +
          "% if nothing changed. Volume, TVL and prices always change — this is an estimate, not a promise.";
    });

    /* --- break-even fees --- */
    document.getElementById("be-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = breakEvenFees(
        document.getElementById("be-ratio").value,
        document.getElementById("be-deposit").value,
        document.getElementById("be-daily").value
      );
      var out = document.getElementById("be-result");
      if (res === null) {
        out.textContent = "Enter a price multiple above 0 and a deposit above $0 — e.g. 2 and 1000. Daily fees, if given, must be $0 or more.";
      } else if (res.feesNeeded === 0) {
        out.textContent = "At a " + res.priceRatio + "x price move there is no impermanent loss to offset — $0 in fees breaks even. Model only.";
      } else if (res.dailyFees != null) {
        out.textContent = "At a " + res.priceRatio + "x price move: holding would be $" + fmt(res.holdValue, 2) +
          ", the LP position $" + fmt(res.lpValue, 2) + " — so you need $" + fmt(res.feesNeeded, 2) + " in fees (" +
          fmt(res.feesNeededPctOfDeposit, 2) + "% of your deposit) to break even. At $" + fmt(res.dailyFees, 2) +
          "/day in fees that is ≈ " + (isFinite(res.daysToBreakEven) ? fmt(res.daysToBreakEven, 1) + " days" : "never — $0/day never offsets a loss") +
          ", if that rate held, which it won't. Model only, not financial advice.";
      } else {
        out.textContent = "At a " + res.priceRatio + "x price move: holding would be $" + fmt(res.holdValue, 2) +
          ", the LP position $" + fmt(res.lpValue, 2) + " — so you need $" + fmt(res.feesNeeded, 2) + " in fees (" +
          fmt(res.feesNeededPctOfDeposit, 2) + "% of your deposit) to break even, before the position counts as ahead. Model only.";
      }
    });

    /* --- deposit planner --- */
    document.getElementById("dep-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = depositPlan(
        document.getElementById("dep-ra").value,
        document.getElementById("dep-rb").value,
        document.getElementById("dep-aa").value
      );
      var out = document.getElementById("dep-result");
      out.textContent = res === null
        ? "Enter positive pool reserves for both tokens and a positive amount of token A (up to 9 decimal places)."
        : "Model output: deposit ≈ " + res.requiredB + " of token B alongside your token A (pool ratio ≈ " +
          fmt(res.priceBperA, 6) + " B per A). Your share of the pool after depositing would be ≈ " +
          fmt(res.sharePct, 4) + "%, with model reserves of " + res.newReserveA + " A / " + res.newReserveB +
          " B. A constant-product deposit model, not a live Raydium quote — CLMM deposits are range-based and differ.";
      if (res !== null) document.getElementById("dep-reqb").value = res.requiredB;
    });

    /* --- exact-out swap model --- */
    document.getElementById("xo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpSwapExactOut(
        document.getElementById("xo-rin").value,
        document.getElementById("xo-rout").value,
        document.getElementById("xo-aout").value,
        document.getElementById("xo-fee").value
      );
      var out = document.getElementById("xo-result");
      out.textContent = res === null
        ? "Enter positive reserves and a target amount out that is less than the reserve out (a pool can never pay out its whole reserve), plus a fee in basis points (25 = 0.25%)."
        : "Model output: you need ≈ " + res.amountIn + " tokens in to receive that amount out. Spot price " + fmt(res.spotPrice, 6) +
          ", effective price " + fmt(res.effectivePrice, 6) + " (after the " + fmt(res.feePct, 2) +
          "% fee), price impact incl. fee " + fmt(res.priceImpactPct, 2) +
          "%. A constant-product model, not a live Raydium quote.";
      if (res !== null) document.getElementById("xo-ain").value = res.amountIn;
    });

    /* --- withdrawal planner --- */
    document.getElementById("wd-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = withdrawPlan(
        document.getElementById("wd-ra").value,
        document.getElementById("wd-rb").value,
        document.getElementById("wd-share").value,
        document.getElementById("wd-pct").value
      );
      var out = document.getElementById("wd-result");
      out.textContent = res === null
        ? "Enter positive pool reserves for both tokens, your share of the pool (above 0 and at most 100%), and a withdrawal percentage (above 0 and at most 100)."
        : "Model output: withdrawing " + fmt(res.withdrawPct, 2) + "% of your position returns ≈ " + res.outA +
          " of token A and ≈ " + res.outB + " of token B — both tokens, in the pool's current ratio. Your remaining share would be ≈ " +
          fmt(res.remainingSharePct, 4) + "%, with model reserves left of " + res.remainingReserveA + " A / " + res.remainingReserveB +
          " B. A constant-product withdrawal model, not a live Raydium quote — CLMM withdrawals are range-based and differ, and no withdrawal fee is modelled.";
      if (res !== null) {
        document.getElementById("wd-outa").value = res.outA;
        document.getElementById("wd-outb").value = res.outB;
      }
    });

    /* --- CLMM range deposit planner --- */
    document.getElementById("clmm-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRangePlan(
        document.getElementById("clmm-price").value,
        document.getElementById("clmm-lower").value,
        document.getElementById("clmm-upper").value,
        document.getElementById("clmm-aa").value
      );
      var out = document.getElementById("clmm-result");
      if (res === null) {
        out.textContent = "Enter a current price and a range with lower below upper (all above 0) and a positive token-A deposit. If the current price is at or above the top of your range, the position would be entirely token B — a token-A deposit can't fund it.";
      } else if (res.status === "below") {
        out.textContent = "Model output: the current price is below your range, so the position is entirely token A — deposit ≈ " +
          fmt(res.amountA, 6) + " of token A and 0 of token B (model liquidity ≈ " + fmt(res.liquidity, 2) +
          "). It earns no fees until the price enters the range (ticks " + res.tickLower + " to " + res.tickUpper +
          ", current tick " + res.tickCurrent + "). A CLMM range model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: deposit ≈ " + fmt(res.requiredB, 6) + " of token B alongside your token A (model liquidity ≈ " +
          fmt(res.liquidity, 2) + "; token B is ≈ " + fmt(res.bValuePct, 2) + "% of the position's value at the current price). " +
          "Your range is ticks " + res.tickLower + " to " + res.tickUpper + " (current tick " + res.tickCurrent +
          "). A CLMM range model, not a live Raydium quote — real positions snap ticks to the pool's tick spacing.";
      }
      if (res !== null) document.getElementById("clmm-reqb").value = fmt(res.requiredB, 6);
    });

    /* --- CLMM position checker --- */
    document.getElementById("pos-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmPositionAtPrice(
        document.getElementById("pos-l").value,
        document.getElementById("pos-lower").value,
        document.getElementById("pos-upper").value,
        document.getElementById("pos-price").value
      );
      var out = document.getElementById("pos-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity (Tool 8 reports it for a deposit), a range with lower below upper, and a positive price to check.";
      } else if (res.status === "below") {
        out.textContent = "Model output: at " + fmt(res.price, 6) + " B per A the price is at or below your range, so the position holds ≈ " +
          fmt(res.amountA, 6) + " of token A and 0 of token B (value ≈ " + fmt(res.valueInB, 6) +
          " B) and earns no fees until the price returns into the range. A CLMM position model, not a live Raydium quote.";
      } else if (res.status === "above") {
        out.textContent = "Model output: at " + fmt(res.price, 6) + " B per A the price is at or above your range, so the position holds 0 of token A and ≈ " +
          fmt(res.amountB, 6) + " of token B (value ≈ " + fmt(res.valueInB, 6) +
          " B) and earns no fees until the price returns into the range. A CLMM position model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: at " + fmt(res.price, 6) + " B per A the position holds ≈ " + fmt(res.amountA, 6) +
          " of token A and ≈ " + fmt(res.amountB, 6) + " of token B (value ≈ " + fmt(res.valueInB, 6) +
          " B; token B is ≈ " + fmt(res.bValuePct, 2) + "% of the value). As price rises inside the range the position converts into token B — that conversion is concentrated liquidity's version of impermanent loss. A CLMM position model, not a live Raydium quote — no fees earned are included.";
      }
      if (res !== null) {
        document.getElementById("pos-outa").value = fmt(res.amountA, 6);
        document.getElementById("pos-outb").value = fmt(res.amountB, 6);
      }
    });

    /* --- slippage / minimum-received --- */
    document.getElementById("slip-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = slippagePlan(
        document.getElementById("slip-out").value,
        document.getElementById("slip-bps").value,
        document.getElementById("slip-in").value
      );
      var out = document.getElementById("slip-result");
      if (res === null) {
        out.textContent = "Enter a positive expected amount out (up to 9 decimal places) and a slippage tolerance in basis points (50 = 0.5%, at most 9999). Expected amount in, if given, must be positive too.";
      } else {
        out.textContent = "Model output: at a " + fmt(res.slippagePct, 2) + "% slippage tolerance, your minimum received is ≈ " +
          res.minReceived + " tokens — the expected " + res.expectedOut + " minus a " + res.protectedAmount +
          " tolerance band, floored and never rounded up, so the bound never exceeds the tolerance you set" +
          (res.maxIn != null ? ". Your maximum input is ≈ " + res.maxIn + " tokens (expected in " + res.expectedIn + ", also floored)" : "") +
          ". If the live result would cross either bound, the transaction fails instead of filling badly. A slippage model, not a live Raydium quote.";
      }
      if (res !== null) document.getElementById("slip-min").value = res.minReceived;
    });

    /* --- CLMM tick / price converter --- */
    document.getElementById("tick-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = tickPriceConvert(
        document.getElementById("tick-price").value,
        document.getElementById("tick-spacing").value
      );
      var out = document.getElementById("tick-result");
      function fp(x) { return x === null ? "—" : String(parseFloat(x.toPrecision(10))); }
      if (res === null) {
        out.textContent = "Enter a positive price whose tick sits inside the standard CLMM tick range (-443636 to 443636), and — if you add a tick spacing — a positive whole number.";
      } else {
        out.textContent = "Model output: " + fp(res.price) + " B per A is tick " + res.tick +
          " — that tick's own price is " + fp(res.tickPrice) + " (ticks floor, so it sits at or just below your price; the next tick, " +
          res.nextTick + ", is " + fp(res.nextTickPrice) + ")" +
          (res.spacing != null
            ? ". At a tick spacing of " + res.spacing + ", a lower range boundary at this price snaps down to tick " +
              res.snappedDownTick + " (price " + fp(res.snappedDownPrice) + ") and an upper boundary snaps up to tick " +
              res.snappedUpTick + " (price " + fp(res.snappedUpPrice) + ") — pools only accept boundaries on spacing multiples"
            : ". Add your pool's tick spacing to see where a range boundary at this price would snap") +
          ". A tick model, not a live Raydium quote — real positions are quoted with the pool's own ticks on the pool page.";
      }
      if (res !== null) document.getElementById("tick-out").value = res.tick;
    });

    /* --- CLMM position vs holding --- */
    document.getElementById("vh-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmVsHold(
        document.getElementById("vh-l").value,
        document.getElementById("vh-lower").value,
        document.getElementById("vh-upper").value,
        document.getElementById("vh-entry").value,
        document.getElementById("vh-check").value
      );
      var out = document.getElementById("vh-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity (Tool 8 reports it for a deposit), a range with lower below upper, and positive entry and check prices.";
      } else if (Math.abs(res.diffInB) < 1e-12) {
        out.textContent = "Model output: at the check price of " + fmt(res.checkPrice, 6) + " B per A the position is worth exactly what simply holding its entry tokens would be — ≈ " +
          fmt(res.positionValueInB, 6) + " B either way, so $0 in fees is the break-even there. A CLMM position-vs-holding model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: at " + fmt(res.checkPrice, 6) + " B per A the position holds ≈ " + fmt(res.checkAmountA, 6) +
          " A / " + fmt(res.checkAmountB, 6) + " B, worth ≈ " + fmt(res.positionValueInB, 6) + " B — but simply holding the tokens it started with (" +
          fmt(res.entryAmountA, 6) + " A / " + fmt(res.entryAmountB, 6) + " B at entry) would be worth ≈ " + fmt(res.holdValueInB, 6) +
          " B. That is " + fmt(res.vsHoldPct, 2) + "% vs holding, so the position needs ≈ " + fmt(res.feesNeededInB, 6) +
          " B in fees earned to break even with holding. A CLMM position-vs-holding model, not a live Raydium quote — no fees earned are included.";
      }
      if (res !== null) document.getElementById("vh-fees").value = fmt(res.feesNeededInB, 6);
    });

    document.getElementById("cfee-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmFeeEstimate(
        document.getElementById("cfee-l").value,
        document.getElementById("cfee-total").value,
        document.getElementById("cfee-volume").value,
        document.getElementById("cfee-bps").value,
        document.getElementById("cfee-days").value,
        document.getElementById("cfee-inrange").value,
        document.getElementById("cfee-value").value
      );
      var out = document.getElementById("cfee-result");
      if (res === null) {
        out.textContent = "Enter a positive position liquidity, a total active liquidity at least as large, a non-negative daily volume, a fee tier of 0–10,000 bps, a positive number of days, and a time-in-range of 0–100%.";
      } else {
        var msg = "Model output: your liquidity is ≈ " + fmt(res.sharePct, 4) + "% of the active liquidity, so of the pool's ≈ " +
          fmt(res.poolFeesPerDay, 6) + " B in daily fees your in-range share is ≈ " + fmt(res.feesPerDay, 6) + " B per day — ≈ " +
          fmt(res.feesForPeriod, 6) + " B over " + fmt(res.days, 0) + " days at " + fmt(res.inRangePct, 2) + "% time in range.";
        if (res.naiveAprPct !== null) {
          msg += " Against a position value of ≈ " + fmt(res.positionValueInB, 6) + " B that is a naive ≈ " + fmt(res.naiveAprPct, 2) +
            "% APR — it assumes volume, active liquidity and your time in range all hold still, which in a live pool none of them do.";
        }
        out.textContent = msg + " A CLMM fee model, not a live Raydium quote or a yield promise — the total active liquidity is your estimate, and real fees are read on the pool page.";
      }
      if (res !== null) document.getElementById("cfee-out").value = fmt(res.feesPerDay, 6);
    });

    /* --- CLMM wallet-balance deposit planner --- */
    document.getElementById("wp-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmWalletPlan(
        document.getElementById("wp-price").value,
        document.getElementById("wp-lower").value,
        document.getElementById("wp-upper").value,
        document.getElementById("wp-bal-a").value,
        document.getElementById("wp-bal-b").value
      );
      var out = document.getElementById("wp-result");
      if (res === null) {
        out.textContent = "Enter a current price and a range with lower below upper (all above 0) and the balances you hold. Inside the range a position needs both tokens, so a zero balance on either side funds nothing; below the range it needs token A, at or above the top it needs token B.";
      } else if (res.status === "below") {
        out.textContent = "Model output: the current price is below your range, so the position is entirely token A — it uses ≈ " +
          fmt(res.usedA, 6) + " of token A and 0 of token B (model liquidity ≈ " + fmt(res.liquidity, 2) +
          "), leaving ≈ " + fmt(res.leftoverB, 6) + " of token B unused. It earns no fees until the price enters the range. A CLMM wallet model, not a live Raydium quote.";
      } else if (res.status === "above") {
        out.textContent = "Model output: the current price is at or above the top of your range, so the position is entirely token B — it uses ≈ " +
          fmt(res.usedB, 6) + " of token B and 0 of token A (model liquidity ≈ " + fmt(res.liquidity, 2) +
          "), leaving ≈ " + fmt(res.leftoverA, 6) + " of token A unused. It earns no fees until the price returns into the range. A CLMM wallet model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: your balances fund a position with model liquidity ≈ " + fmt(res.liquidity, 2) +
          ", using ≈ " + fmt(res.usedA, 6) + " of token A and ≈ " + fmt(res.usedB, 6) + " of token B" +
          (res.limiting === "both"
            ? " — both balances are used in full, with nothing left over"
            : " — token " + res.limiting + " is the limiting side and is used in full, leaving ≈ " +
              fmt(res.limiting === "A" ? res.leftoverB : res.leftoverA, 6) + " of token " + (res.limiting === "A" ? "B" : "A") + " unused") +
          ". A CLMM wallet model, not a live Raydium quote — real positions snap ticks to the pool's tick spacing.";
      }
      if (res !== null) {
        document.getElementById("wp-out-l").value = fmt(res.liquidity, 6);
      }
    });

    /* --- CLMM break-even days --- */
    document.getElementById("bed-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmBreakEven(
        document.getElementById("bed-l").value,
        document.getElementById("bed-lower").value,
        document.getElementById("bed-upper").value,
        document.getElementById("bed-entry").value,
        document.getElementById("bed-check").value,
        document.getElementById("bed-total").value,
        document.getElementById("bed-volume").value,
        document.getElementById("bed-bps").value,
        document.getElementById("bed-inrange").value
      );
      var out = document.getElementById("bed-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity (Tool 8 reports it), a range with lower below upper, positive entry and check prices, a total active liquidity at least as large as yours, a non-negative daily volume, a fee tier of 0–10,000 bps, and a time-in-range of 0–100%.";
      } else if (res.daysToBreakEven === 0) {
        out.textContent = "Model output: at the check price of " + fmt(res.checkPrice, 6) + " B per A there is no gap to close — the position is worth what holding its entry tokens would be (≈ " +
          fmt(res.positionValueInB, 6) + " B either way), so it breaks even with holding at 0 days. A CLMM break-even model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: at " + fmt(res.checkPrice, 6) + " B per A the position trails holding by ≈ " + fmt(res.feesNeededInB, 6) +
          " B (" + fmt(res.vsHoldPct, 2) + "% vs holding — Tool 12's hurdle). At ≈ " + fmt(res.feesPerDay, 6) + " B per day in fees (your ≈ " +
          fmt(res.sharePct, 4) + "% share of the active liquidity at " + fmt(res.inRangePct, 2) + "% time in range — Tool 13's rate) that gap closes in ≈ " +
          (isFinite(res.daysToBreakEven) ? fmt(res.daysToBreakEven, 2) + " days" : "never — a 0 fee rate never offsets a real gap") +
          ", if that rate held for the whole period, which in a live pool it won't. A CLMM break-even model, not a live Raydium quote or a yield promise.";
      }
      if (res !== null) document.getElementById("bed-out").value = isFinite(res.daysToBreakEven) ? fmt(res.daysToBreakEven, 2) : "never";
    });

    /* --- CP arbitrage model --- */
    document.getElementById("arb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpArbitrage(
        document.getElementById("arb-ra").value,
        document.getElementById("arb-rb").value,
        document.getElementById("arb-ext").value,
        document.getElementById("arb-fee").value
      );
      var out = document.getElementById("arb-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, a positive external price (B per A), and a fee of 0–9,999 bps.";
        document.getElementById("arb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the pool's spot price (≈ " + fmt(res.spotPrice, 6) + " B per A) already matches your external price — no arbitrage trade exists at these numbers. A CP arbitrage model, not a live Raydium quote.";
        document.getElementById("arb-out").value = "0";
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in this pool vs your external price: pay ≈ " + fmt(res.grossIn, 6) + " B in (≈ " + fmt(res.netIn, 6) + " B reaches the pool after the fee) and take ≈ " + fmt(res.amountOut, 6) + " A out"
          : "token A is dear in this pool vs your external price: pay ≈ " + fmt(res.grossIn, 6) + " A in (≈ " + fmt(res.netIn, 6) + " A reaches the pool after the fee) and take ≈ " + fmt(res.amountOut, 6) + " B out";
        out.textContent = "Model output: spot ≈ " + fmt(res.spotPrice, 6) + " B per A vs your external " + fmt(res.externalPrice, 6) +
          " (" + (res.priceGapPct >= 0 ? "+" : "") + fmt(res.priceGapPct, 2) + "% gap) — " + dirText +
          ", moving the pool's modelled price to your external price. Modelled profit ≈ " + fmt(res.profitInB, 6) + " B valued at the external price" +
          (res.profitInB <= 0 ? " — not profitable at this fee: the gap is smaller than the fee takes. " : ". ") +
          "A CP arbitrage model against a price you supplied, not a live quote, a found opportunity, or financial advice — real venues have their own depth, fees and costs this model ignores.";
        document.getElementById("arb-out").value = fmt(res.profitInB, 6);
      }
    });

    /* --- price-impact trade sizer --- */
    document.getElementById("pi-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = priceImpactSizer(
        document.getElementById("pi-rin").value,
        document.getElementById("pi-rout").value,
        document.getElementById("pi-cap").value,
        document.getElementById("pi-fee").value
      );
      var out = document.getElementById("pi-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, a maximum price impact above 0% and below 100%, and a fee of 0–9,999 bps.";
        document.getElementById("pi-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no positive trade fits that cap — in this model the pool fee alone contributes ≈ " + fmt(res.feeImpactPct, 4) +
          "% price impact (Tool 1's measure includes the fee), so a cap of " + fmt(res.maxImpactPct, 4) +
          "% can only be met by not trading at all. Raise the cap above the fee, or use a pool with a lower fee tier. A price-impact sizing model, not a live Raydium quote.";
        document.getElementById("pi-out").value = "0";
      } else {
        out.textContent = "Model output: the largest pay-in whose modelled price impact stays at your ≈ " + fmt(res.maxImpactPct, 4) +
          "% cap is ≈ " + fmt(res.maxAmountIn, 6) + " in (≈ " + fmt(res.netIn, 6) + " reaches the pool after the fee), returning ≈ " +
          fmt(res.amountOut, 6) + " out at an effective price of ≈ " + fmt(res.effectivePrice, 6) + " vs a spot of ≈ " + fmt(res.spotPrice, 6) +
          " — any larger trade crosses the cap, any smaller one stays under it. The fee alone accounts for ≈ " + fmt(res.feeImpactPct, 4) +
          "% of that impact before trade size adds the rest. A price-impact sizing model against reserves you supplied, not a live Raydium quote or financial advice.";
        document.getElementById("pi-out").value = fmt(res.maxAmountIn, 6);
      }
    });

    /* --- LP-token share & value --- */
    document.getElementById("lp-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = lpTokenValue(
        document.getElementById("lp-ra").value,
        document.getElementById("lp-rb").value,
        document.getElementById("lp-supply").value,
        document.getElementById("lp-yours").value
      );
      var out = document.getElementById("lp-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, a positive total LP supply, and your LP-token count (above 0 and at most the total supply).";
        document.getElementById("lp-outa").value = "";
        document.getElementById("lp-outb").value = "";
      } else {
        out.textContent = "Model output: your LP tokens are ≈ " + fmt(res.sharePct, 4) + "% of the pool's supply, redeeming for ≈ " +
          res.amountA + " of token A and ≈ " + res.amountB + " of token B — both tokens, in the pool's current ratio — worth ≈ " +
          fmt(res.valueInB, 6) + " B valued at the pool's own spot price (≈ " + fmt(res.priceBperA, 6) +
          " B per A), with model reserves left of " + res.remainingReserveA + " A / " + res.remainingReserveB +
          " B. That share shrinks as new LPs deposit and the supply grows, so re-check the supply rather than trusting the share you had at deposit. An LP-token model, not a live Raydium quote — CLMM positions are range-based and differ, and no withdrawal fee is modelled.";
        document.getElementById("lp-outa").value = res.amountA;
        document.getElementById("lp-outb").value = res.amountB;
      }
    });

    /* --- single-sided zap-in planner --- */
    document.getElementById("zap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = zapInPlan(
        document.getElementById("zap-ra").value,
        document.getElementById("zap-rb").value,
        document.getElementById("zap-aa").value,
        document.getElementById("zap-fee").value
      );
      var out = document.getElementById("zap-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, a positive amount of token A you hold, and a fee in basis points (25 = 0.25%).";
        document.getElementById("zap-swap").value = "";
        document.getElementById("zap-depb").value = "";
      } else {
        out.textContent = "Model output: swap ≈ " + fmt(res.swapIn, 6) + " of token A for ≈ " + fmt(res.swapOut, 6) +
          " of token B in the same pool, then deposit the remaining ≈ " + fmt(res.depositA, 6) + " A together with that ≈ " +
          fmt(res.depositB, 6) + " B — the split the pool's post-swap ratio requires, so nothing is left over. Your share of the pool would be ≈ " +
          fmt(res.sharePct, 4) + "%, with model reserves after both steps of " + fmt(res.finalReserveA, 2) + " A / " + fmt(res.finalReserveB, 2) +
          " B (the B reserve returns to what it was — the swap's B comes straight back as the deposit). A single-sided entry model in one pool, not a live Raydium quote — no routing or price movement between the two steps is modelled, and CLMM entries are range-based and differ.";
        document.getElementById("zap-swap").value = fmt(res.swapIn, 6);
        document.getElementById("zap-depb").value = fmt(res.depositB, 6);
      }
    });

    /* --- single-sided zap-out planner --- */
    document.getElementById("zout-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = zapOutPlan(
        document.getElementById("zout-ra").value,
        document.getElementById("zout-rb").value,
        document.getElementById("zout-share").value,
        document.getElementById("zout-pct").value,
        document.getElementById("zout-fee").value
      );
      var out = document.getElementById("zout-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, your share of the pool (above 0 and at most 100%), how much of your position to withdraw (above 0 and at most 100%), and a fee in basis points (25 = 0.25%).";
        document.getElementById("zout-swapout").value = "";
        document.getElementById("zout-totala").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: withdrawing " + fmt(res.withdrawPct, 4) + "% of a pool you own " + fmt(res.sharePct, 4) +
          "% of returns ≈ " + res.withdrawA + " of token A and ≈ " + res.withdrawB + " of token B — and leaves no pool behind to swap in, " +
          "so a same-pool zap-out cannot complete: you keep both tokens, or swap the B elsewhere. A single-sided exit model, not a live Raydium quote.";
        document.getElementById("zout-swapout").value = "";
        document.getElementById("zout-totala").value = "";
      } else {
        out.textContent = "Model output: withdraw ≈ " + res.withdrawA + " of token A and ≈ " + res.withdrawB +
          " of token B, then swap all of that B back into token A in the same (now shallower) pool for ≈ " + res.swapOutA +
          " A — leaving you holding ≈ " + res.totalA + " of token A in total. Consolidating costs ≈ " + fmt(res.consolidationCostA, 6) +
          " A (≈ " + fmt(res.consolidationCostPct, 4) + "% of the withdrawn pair's value at the post-withdrawal spot price) in fee plus price impact (≈ " +
          fmt(res.priceImpactPct, 4) + "% on the swap leg) — the cost grows with your share of the pool. A single-sided exit model in one pool, not a live Raydium quote — no routing or price movement between the two steps is modelled, no withdrawal fee is modelled, and CLMM exits are range-based and differ.";
        document.getElementById("zout-swapout").value = res.swapOutA;
        document.getElementById("zout-totala").value = res.totalA;
      }
    });

    /* --- IL tolerance band --- */
    document.getElementById("band-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = ilToleranceBand(
        document.getElementById("band-dep").value,
        document.getElementById("band-fees").value
      );
      var out = document.getElementById("band-result");
      if (res === null) {
        out.textContent = "Enter a positive position value (in token B terms) and the fees earned so far (zero or more, in the same token B terms).";
        document.getElementById("band-high").value = "";
        document.getElementById("band-low").value = "";
      } else if (res.downUnbounded) {
        out.textContent = "Model output: fees of ≈ " + fmt(res.feesEarned, 6) + " B are ≈ " + fmt(res.feePctOfDeposit, 4) +
          "% of the ≈ " + fmt(res.deposit, 6) + " B position. On the way up, they cover impermanent loss until the price reaches ≈ " +
          fmt(res.priceRatioHigh, 6) + "× the entry price (+" + fmt(res.moveUpPct, 4) + "%). On the way down there is no edge to report: " +
          "the worst a fall can cost against holding is half the position (the half held in the other token), so fees of 50% or more can never be " +
          "consumed by a fall, however far the price drops. An IL tolerance model for a 50/50 constant-product position, not a live Raydium quote.";
        document.getElementById("band-high").value = fmt(res.priceRatioHigh, 6);
        document.getElementById("band-low").value = "";
      } else {
        out.textContent = "Model output: fees of ≈ " + fmt(res.feesEarned, 6) + " B (≈ " + fmt(res.feePctOfDeposit, 4) +
          "% of the ≈ " + fmt(res.deposit, 6) + " B position) cover impermanent loss until the price reaches ≈ " +
          fmt(res.priceRatioHigh, 6) + "× the entry price (+" + fmt(res.moveUpPct, 4) + "%) or falls to ≈ " + fmt(res.priceRatioLow, 6) +
          "× (−" + fmt(res.moveDownPct, 4) + "%) — the band is symmetric in the square root of the price, which is why the percentage moves differ. Past either edge, impermanent loss " +
          "exceeds the fees earned and holding would have been better. An IL tolerance model for a 50/50 constant-product position, not a live Raydium quote — fees are counted in token B terms outside the pool, with no compounding modelled, and CLMM positions are range-based and differ.";
        document.getElementById("band-high").value = fmt(res.priceRatioHigh, 6);
        document.getElementById("band-low").value = fmt(res.priceRatioLow, 6);
      }
    });

    /* --- CLMM symmetric-range planner --- */
    document.getElementById("sym-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmSymmetricRange(
        document.getElementById("sym-price").value,
        document.getElementById("sym-width").value,
        document.getElementById("sym-aa").value,
        document.getElementById("sym-spacing").value
      );
      var out = document.getElementById("sym-result");
      if (res === null) {
        out.textContent = "Enter a positive current price, a width above 0%, and a positive token A deposit (and, if you give a tick spacing, a whole number above 0). Ranges wider than the standard CLMM tick range are rejected.";
        document.getElementById("sym-reqb").value = "";
      } else {
        out.textContent = "Model output: a ±" + fmt(res.widthPct, 4) + "% range around " + fmt(res.currentPrice, 6) +
          " runs from ≈ " + fmt(res.effLower, 6) + " to ≈ " + fmt(res.effUpper, 6) + " B per A (ticks " + res.tickLower + " to " + res.tickUpper + ")" +
          (res.snapped
            ? " — snapped outward to multiples of your pool's tick spacing " + res.spacing + " before planning, because that snapped range is the one a real position would cover (the raw ±% edges were ≈ " + fmt(res.rawLower, 6) + " to ≈ " + fmt(res.rawUpper, 6) + ")"
            : "") +
          ". The room is asymmetric by construction: +" + fmt(res.upRoomPct, 4) + "% up but −" + fmt(res.downRoomPct, 4) +
          "% down, because the range is symmetric in the price multiple, not in percentages. Depositing ≈ " + fmt(res.amountA, 6) +
          " of token A needs ≈ " + fmt(res.requiredB, 6) + " of token B (≈ " + fmt(res.bValuePct, 2) +
          "% of the position's value in B) for model liquidity L ≈ " + fmt(res.liquidity, 4) +
          ". A CLMM range model, not a live Raydium quote — no fees are modelled, and CLMM deposits are range-based, not pool-ratio based.";
        document.getElementById("sym-reqb").value = fmt(res.requiredB, 6);
      }
    });

    /* --- two-hop swap model --- */
    document.getElementById("hop-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = twoHopSwap(
        document.getElementById("hop-r1in").value,
        document.getElementById("hop-r1out").value,
        document.getElementById("hop-r2in").value,
        document.getElementById("hop-r2out").value,
        document.getElementById("hop-ain").value,
        document.getElementById("hop-fee1").value,
        document.getElementById("hop-fee2").value
      );
      var out = document.getElementById("hop-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both pools and a positive amount in (up to 9 decimal places), plus a fee in basis points for each pool (25 = 0.25%). A trade so small that the first hop rounds to zero cannot route.";
        document.getElementById("hop-mid").value = "";
        document.getElementById("hop-aout").value = "";
      } else {
        out.textContent = "Model output: hop 1 pays ≈ " + res.midOut + " of the intermediate token (price impact ≈ " + fmt(res.hop1ImpactPct, 2) +
          "% after its " + fmt(res.fee1Pct, 2) + "% fee), and hop 2 turns that into ≈ " + res.out + " of token C (price impact ≈ " + fmt(res.hop2ImpactPct, 2) +
          "% after its " + fmt(res.fee2Pct, 2) + "% fee). Combined: effective price ≈ " + fmt(res.effectivePrice, 6) + " C per A against a combined spot of ≈ " +
          fmt(res.spotPrice, 6) + " — a combined price impact of ≈ " + fmt(res.priceImpactPct, 2) +
          "%, worse than either hop alone, because each hop pays its own fee and moves its own pool. A two-hop constant-product model, not a live Raydium quote — a real route may cross CLMM pools or other venues, and no routing search is done here: these are the two pools you typed.";
        document.getElementById("hop-mid").value = res.midOut;
        document.getElementById("hop-aout").value = res.out;
      }
    });

    /* --- copy donation address --- */
    document.getElementById("copy-address").addEventListener("click", function () {
      var addr = document.getElementById("donation-address").textContent.trim();
      var done = function () { document.getElementById("copy-status").textContent = "SOL address copied."; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(done, function () {
          document.getElementById("copy-status").textContent = "Copy failed — select the address text manually.";
        });
      } else {
        document.getElementById("copy-status").textContent = "Select the address text to copy it.";
      }
    });
  });
}
