"use strict";
/* Raydium Renaissance hub logic: project filtering plus eight fully local
   liquidity-pool tools — a constant-product swap model, an impermanent-loss
   calculator, an LP fee estimator, a break-even fee calculator, a
   liquidity deposit planner, an exact-out swap model, a liquidity
   withdrawal planner, and a CLMM range deposit planner. These are educational MODELS using
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseScaled, formatScaled, cpSwap, impermanentLoss, lpFees, breakEvenFees, depositPlan, cpSwapExactOut, withdrawPlan, priceToTick, clmmRangePlan, SCALE };
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
