"use strict";
/* Raydium Renaissance hub logic: project filtering plus three fully local
   liquidity-pool tools — a constant-product swap model, an impermanent-loss
   calculator, and an LP fee estimator. These are educational MODELS using
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseScaled, formatScaled, cpSwap, impermanentLoss, lpFees, SCALE };
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
