"use strict";
/* Raydium Renaissance site tests — run: node tests/test-site.js */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const guide = fs.readFileSync(path.join(root, "guides", "getting-started-raydium-pools.md"), "utf8");
const app = require(path.join(root, "app.js"));

const SOL = "9WMsvgpQQgtvfV4g2Mm7U6mHRGpVvEmFvQGAAu4aArU8";
let failures = 0;
function check(name, cond) {
  console.log((cond ? "PASS" : "FAIL") + " " + name);
  if (!cond) failures++;
}
function near(name, got, want, tol) {
  check(name + " (got " + got + ", want ~" + want + ")", typeof got === "number" && Math.abs(got - want) <= tol);
}

/* attribution on every user-facing surface */
for (const [label, doc] of [["index.html", html], ["README", readme], ["guide", guide]]) {
  check("SOL donation address in " + label, doc.includes(SOL));
  check("@kshot9000 in " + label, doc.includes("@kshot9000"));
  check("Raydium team GitHub tag in " + label, doc.includes("@raydium-io"));
  check("Raydium team X tag in " + label, doc.includes("@Raydium"));
  check("Solana team GitHub tag in " + label, doc.includes("@solana-foundation"));
  check("Solana team X tag in " + label, doc.includes("https://x.com/solana"));
}
check("honesty line in index.html", html.includes("Not affiliated with Raydium"));
check("honesty line in README", readme.includes("not affiliated with Raydium"));
check("models labelled not live in index.html", html.includes("not") && html.includes("live quotes") && html.includes("not financial advice"));
check("liquidity pools focus linked", html.includes("https://raydium.io/liquidity-pools/") && readme.includes("https://raydium.io/liquidity-pools/"));

/* document structure */
check("exactly one <h1>", (html.match(/<h1[ >]/g) || []).length === 1);
check("has <main> landmark", /<main[\s>]/.test(html));
check("all main form controls labelled",
  ["q", "rin", "rout", "ain", "aout", "swap-fee", "ratio", "deposit", "volume", "tvl", "your-liq", "fee-fee", "be-ratio", "be-deposit", "be-daily", "dep-ra", "dep-rb", "dep-aa", "dep-reqb", "xo-rin", "xo-rout", "xo-aout", "xo-ain", "xo-fee", "wd-ra", "wd-rb", "wd-share", "wd-pct", "wd-outa", "wd-outb", "clmm-price", "clmm-lower", "clmm-upper", "clmm-aa", "clmm-reqb"]
    .every(id => html.includes(`for="${id}"`)));
check("all position-checker controls labelled",
  ["pos-l", "pos-lower", "pos-upper", "pos-price", "pos-outa", "pos-outb"]
    .every(id => html.includes(`for="${id}"`)));
check("all slippage controls labelled",
  ["slip-out", "slip-bps", "slip-in", "slip-min"]
    .every(id => html.includes(`for="${id}"`)));
check("all tick-converter controls labelled",
  ["tick-price", "tick-spacing", "tick-out"]
    .every(id => html.includes(`for="${id}"`)));
check("all vs-holding controls labelled",
  ["vh-l", "vh-lower", "vh-upper", "vh-entry", "vh-check", "vh-fees"]
    .every(id => html.includes(`for="${id}"`)));
check("all wallet-planner controls labelled",
  ["wp-price", "wp-lower", "wp-upper", "wp-bal-a", "wp-bal-b", "wp-out-l"]
    .every(id => html.includes(`for="${id}"`)));
check("cache keys present", html.includes("styles.css?v=1") && html.includes("app.js?v=12"));
check("catalogue has 14 cards", (html.match(/class="card"/g) || []).length === 14);

/* catalogue links — all verified HTTP 200 at launch (2026-10-06) */
const LINKS = [
  "https://kshot3000.github.io/solana-pay-link-desk/", "https://github.com/Kshot3000/solana-pay-link-desk",
  "https://raydium.io/liquidity-pools/", "https://raydium.io/swap/", "https://raydium.io/launchpad/",
  "https://raydium.io/staking/", "https://raydium.io/", "https://docs.raydium.io/",
  "https://github.com/raydium-io/raydium-docs", "https://github.com/raydium-io/raydium-sdk-V2",
  "https://github.com/raydium-io/raydium-clmm", "https://github.com/raydium-io/raydium-cp-swap",
  "https://github.com/raydium-io/raydium-amm", "https://github.com/raydium-io/raydium-idl",
  "https://solana.com/", "https://github.com/solana-foundation", "https://x.com/solana", "https://jup.ag/"
];
for (const url of LINKS) {
  check("catalogue linked in index.html: " + url, html.includes(url));
  check("catalogue linked in README: " + url, readme.includes(url));
}
check("Solana Pay Link Desk labelled as my project", html.includes("My project") && html.includes("Solana Pay Link Desk"));

/* scaled decimal parsing */
check("parseScaled integer", app.parseScaled("2") === 2000000000n);
check("parseScaled fraction", app.parseScaled("1.5") === 1500000000n);
check("parseScaled smallest unit", app.parseScaled("0.000000001") === 1n);
check("parseScaled rejects 10dp", app.parseScaled("0.0000000001") === null);
check("parseScaled rejects junk", app.parseScaled("abc") === null && app.parseScaled("-1") === null && app.parseScaled("") === null);
check("formatScaled round trip", app.formatScaled(app.parseScaled("42.123456789")) === "42.123456789");
check("formatScaled whole", app.formatScaled(1000000000n) === "1");

/* constant-product swap model — known values */
/* reserves 1000/1000, in 100, no fee: out = 1000*100/1100 = 90.909090... */
const s0 = app.cpSwap("1000", "1000", "100", 0);
near("cpSwap no-fee out", parseFloat(s0.out), 90.9090909, 0.000001);
near("cpSwap no-fee spot", s0.spotPrice, 1, 1e-12);
near("cpSwap no-fee impact", s0.priceImpactPct, 9.090909, 0.001);
/* reserves 1000/1000, in 100, 25bps: inAfterFee 99.75, out = 1000*99.75/1099.75 = 90.7025... */
const s1 = app.cpSwap("1000", "1000", "100", 25);
near("cpSwap 25bps out", parseFloat(s1.out), 90.702523, 0.001);
check("cpSwap fee lowers output", parseFloat(s1.out) < parseFloat(s0.out));
/* asymmetric reserves 2000000 in / 500000 out, spot 0.25 */
const s2 = app.cpSwap("2000000", "500000", "10000", 25);
near("cpSwap asymmetric spot", s2.spotPrice, 0.25, 1e-12);
check("cpSwap asymmetric out sane", parseFloat(s2.out) > 2400 && parseFloat(s2.out) < 2500);
check("cpSwap rejects zero reserves", app.cpSwap("0", "1000", "100", 25) === null);
check("cpSwap rejects zero amount", app.cpSwap("1000", "1000", "0", 25) === null);
check("cpSwap rejects junk", app.cpSwap("abc", "1000", "100", 25) === null);
check("cpSwap rejects bad fee", app.cpSwap("1000", "1000", "100", -1) === null && app.cpSwap("1000", "1000", "100", 10000) === null);
check("cpSwap larger trade = larger impact", app.cpSwap("1000", "1000", "500", 25).priceImpactPct > s1.priceImpactPct);

/* impermanent loss — known values: IL(r) = 2*sqrt(r)/(1+r) - 1 */
near("IL at 1x is 0", app.impermanentLoss(1).ilPct, 0, 1e-9);
near("IL at 2x", app.impermanentLoss(2).ilPct, -5.719, 0.01);
near("IL at 0.5x equals IL at 2x", app.impermanentLoss(0.5).ilPct, app.impermanentLoss(2).ilPct, 1e-9);
near("IL at 4x is -20%", app.impermanentLoss(4).ilPct, -20, 1e-9);
const ilDep = app.impermanentLoss(4, "1000");
near("IL deposit hold value at 4x", ilDep.holdValue, 2500, 1e-9);
near("IL deposit LP value at 4x", ilDep.lpValue, 2000, 1e-9);
check("IL rejects 0 / negative / junk", app.impermanentLoss(0) === null && app.impermanentLoss(-2) === null && app.impermanentLoss("x") === null);

/* LP fee estimator — known values */
/* volume $1,000,000, fee 25bps => $2,500 pool fees/day; your $10k of $1M TVL = 1% => $25/day, APR 91.25% */
const f1 = app.lpFees("1000000", 25, "10000", "1000000");
near("LP share pct", f1.sharePct, 1, 1e-9);
near("LP daily fees", f1.dailyFees, 25, 1e-9);
near("LP monthly fees", f1.monthlyFees, 750, 1e-9);
near("LP naive APR", f1.aprPct, 91.25, 1e-9);
check("LP zero volume = zero fees", app.lpFees("0", 25, "10000", "1000000").dailyFees === 0);
check("LP rejects your > TVL", app.lpFees("1000", 25, "2000000", "1000000") === null);
check("LP rejects junk", app.lpFees("x", 25, "1", "2") === null && app.lpFees("1", 25, "0", "2") === null);

/* break-even fees — known values: feesNeeded = holdValue - lpValue (Tool 2 maths) */
/* at 4x, $1000 deposit: hold $2500, LP $2000 => $500 needed = 50% of deposit; at $25/day => 20 days */
const b1 = app.breakEvenFees(4, "1000", "25");
near("BE fees needed at 4x", b1.feesNeeded, 500, 1e-9);
near("BE fees pct of deposit at 4x", b1.feesNeededPctOfDeposit, 50, 1e-9);
near("BE days at $25/day", b1.daysToBreakEven, 20, 1e-9);
near("BE hold value at 4x", b1.holdValue, 2500, 1e-9);
near("BE LP value at 4x", b1.lpValue, 2000, 1e-9);
/* at 1x there is no IL to offset */
const b0 = app.breakEvenFees(1, "1000");
near("BE fees needed at 1x is 0", b0.feesNeeded, 0, 1e-9);
check("BE without daily fees has no days field", app.breakEvenFees(2, "1000").daysToBreakEven === undefined);
check("BE $0/day with a loss never breaks even", app.breakEvenFees(2, "1000", "0").daysToBreakEven === Infinity);
check("BE $0/day with no loss is 0 days", app.breakEvenFees(1, "1000", "0").daysToBreakEven === 0);
check("BE fees needed matches IL gap at 2x", Math.abs(app.breakEvenFees(2, "1000").feesNeeded -
  (app.impermanentLoss(2, "1000").holdValue - app.impermanentLoss(2, "1000").lpValue)) < 1e-9);
check("BE rejects missing/zero deposit", app.breakEvenFees(2) === null && app.breakEvenFees(2, "") === null && app.breakEvenFees(2, "0") === null);
check("BE rejects bad ratio / junk / negative daily", app.breakEvenFees(0, "1000") === null && app.breakEvenFees("x", "1000") === null && app.breakEvenFees(2, "1000", "-5") === null && app.breakEvenFees(2, "1000", "x") === null);
check("break-even tool present in index.html", html.includes('id="be-calc"') && html.includes('id="be-result"'));

/* deposit planner — known values: requiredB = reserveB * amountA / reserveA, share = amountA / (reserveA + amountA) */
/* reserves 1,000,000 A / 500,000 B (0.5 B per A), deposit 10,000 A => 5,000 B, share 10,000/1,010,000 = 0.990099...% */
const d1 = app.depositPlan("1000000", "500000", "10000");
check("DP required B exact", d1.requiredB === "5000");
near("DP share pct", d1.sharePct, 0.990099, 0.000001);
near("DP price B per A", d1.priceBperA, 0.5, 1e-12);
check("DP new reserves", d1.newReserveA === "1010000" && d1.newReserveB === "505000");
/* equal reserves 1000/1000, deposit 100 => 100 B, share 100/1100 = 9.0909...% */
const d2 = app.depositPlan("1000", "1000", "100");
check("DP equal reserves required B", d2.requiredB === "100");
near("DP equal reserves share", d2.sharePct, 9.090909, 0.000001);
/* fractional: reserves 3 A / 1 B, deposit 1.5 A => 0.5 B exactly at 9 dp */
check("DP fractional exact", app.depositPlan("3", "1", "1.5").requiredB === "0.5");
check("DP rejects zero reserves", app.depositPlan("0", "1000", "100") === null && app.depositPlan("1000", "0", "100") === null);
check("DP rejects zero amount", app.depositPlan("1000", "1000", "0") === null);
check("DP rejects junk / negative", app.depositPlan("abc", "1000", "100") === null && app.depositPlan("1000", "1000", "-5") === null && app.depositPlan("1000", "1000", "") === null);
check("DP rejects dust that floors to zero B", app.depositPlan("1000000000", "0.000000001", "1") === null);
check("deposit planner present in index.html", html.includes('id="dep-calc"') && html.includes('id="dep-result"'));

/* exact-out swap — known values: inAfterFee = rin*aout/(rout-aout), grossed up for the fee, both rounded UP */
/* reserves 1000/1000, want 500 out, no fee => exactly 1000 in, impact 50% */
const x0 = app.cpSwapExactOut("1000", "1000", "500", 0);
check("XO no-fee amount in exact", x0.amountIn === "1000");
near("XO no-fee impact", x0.priceImpactPct, 50, 1e-9);
/* inverse of Tool 1's headline case: 1000/1000, out 90.909090909, no fee => exactly 100 in */
check("XO inverse of cpSwap case", app.cpSwapExactOut("1000", "1000", "90.909090909", 0).amountIn === "100");
/* same target at 25bps: inAfterFee stays 100, grossed up 100*10000/9975 = 100.250626... */
check("XO 25bps amount in exact", app.cpSwapExactOut("1000", "1000", "90.909090909", 25).amountIn === "100.250626567");
check("XO fee raises required input", parseFloat(app.cpSwapExactOut("1000", "1000", "100", 25).amountIn) > parseFloat(app.cpSwapExactOut("1000", "1000", "100", 0).amountIn));
/* round-trip property: feeding the modelled input into cpSwap yields at least the target out */
for (const [ri, ro, ao, f] of [["1000", "1000", "500", 0], ["2000000", "500000", "2400", 25], ["1000000", "1000000", "1000", 25], ["3", "1", "0.5", 4]]) {
  const xo = app.cpSwapExactOut(ri, ro, ao, f);
  check("XO round-trip " + ri + "/" + ro + " out " + ao + " @" + f + "bps", xo !== null && parseFloat(app.cpSwap(ri, ro, xo.amountIn, f).out) >= parseFloat(ao));
}
check("XO rejects out >= reserve out", app.cpSwapExactOut("1000", "1000", "1000", 25) === null && app.cpSwapExactOut("1000", "1000", "1001", 25) === null);
check("XO rejects zero/junk/bad fee", app.cpSwapExactOut("1000", "1000", "0", 25) === null && app.cpSwapExactOut("abc", "1000", "1", 25) === null && app.cpSwapExactOut("1000", "1000", "1", 10000) === null && app.cpSwapExactOut("1000", "1000", "1", -1) === null);
check("XO larger target = larger impact", app.cpSwapExactOut("1000", "1000", "500", 25).priceImpactPct > app.cpSwapExactOut("1000", "1000", "100", 25).priceImpactPct);
check("exact-out tool present in index.html", html.includes('id="xo-calc"') && html.includes('id="xo-result"'));

/* withdrawal planner — known values: out = reserve * share/100 * withdraw/100, floored */
/* reserves 1,000,000 A / 500,000 B, 1% share, full exit => 10,000 A / 5,000 B, nothing left of the share */
const w1 = app.withdrawPlan("1000000", "500000", "1", "100");
check("WD full exit amounts exact", w1.outA === "10000" && w1.outB === "5000");
check("WD full exit remaining reserves", w1.remainingReserveA === "990000" && w1.remainingReserveB === "495000");
near("WD full exit remaining share is 0", w1.remainingSharePct, 0, 1e-12);
check("WD payout keeps pool ratio", parseFloat(w1.outA) / parseFloat(w1.outB) === 2);
/* same position, 50% exit => half the amounts, half the share left */
const w2 = app.withdrawPlan("1000000", "500000", "1", "50");
check("WD half exit amounts exact", w2.outA === "5000" && w2.outB === "2500");
near("WD half exit remaining share", w2.remainingSharePct, 0.5, 1e-12);
check("WD half exit remaining reserves", w2.remainingReserveA === "995000" && w2.remainingReserveB === "497500");
/* fractional: reserves 3 A / 1 B, 50% share, full exit => 1.5 A / 0.5 B exactly at 9 dp */
const w3 = app.withdrawPlan("3", "1", "50", "100");
check("WD fractional exact", w3.outA === "1.5" && w3.outB === "0.5");
/* whole-pool share: 100% share, full exit returns the entire reserves */
const w4 = app.withdrawPlan("1000", "250", "100", "100");
check("WD sole LP drains pool exactly", w4.outA === "1000" && w4.outB === "250" && w4.remainingReserveA === "0" && w4.remainingReserveB === "0");
/* deposit-then-withdraw consistency: depositing with Tool 5 then redeeming that share in full returns the deposit (floored prices aside, equal-ratio case is exact) */
const dpForWd = app.depositPlan("1000", "1000", "100");
/* Tool 5 reports share as a float (9.090909...%); the planner takes it rounded to its 9 dp input precision */
const wdBack = app.withdrawPlan(dpForWd.newReserveA, dpForWd.newReserveB, "9.090909091", "100");
check("WD round-trips a Tool 5 deposit", wdBack !== null && Math.abs(parseFloat(wdBack.outA) - 100) < 0.001 && Math.abs(parseFloat(wdBack.outB) - 100) < 0.001);
check("WD rejects zero reserves", app.withdrawPlan("0", "1000", "1", "100") === null && app.withdrawPlan("1000", "0", "1", "100") === null);
check("WD rejects share out of range", app.withdrawPlan("1000", "1000", "0", "100") === null && app.withdrawPlan("1000", "1000", "100.000000001", "100") === null && app.withdrawPlan("1000", "1000", "101", "100") === null);
check("WD rejects withdraw out of range", app.withdrawPlan("1000", "1000", "1", "0") === null && app.withdrawPlan("1000", "1000", "1", "101") === null);
check("WD rejects junk / negative", app.withdrawPlan("abc", "1000", "1", "100") === null && app.withdrawPlan("1000", "1000", "-1", "100") === null && app.withdrawPlan("1000", "1000", "", "100") === null);
check("WD rejects dust that floors to zero", app.withdrawPlan("0.000000001", "1000", "1", "100") === null);
check("withdrawal planner present in index.html", html.includes('id="wd-calc"') && html.includes('id="wd-result"'));

/* CLMM range planner — known values: amountA = L*(1/sqrt(P) - 1/sqrt(upper)), amountB = L*(sqrt(P) - sqrt(lower)) */
/* reciprocal range 0.8–1.25 at price 1, deposit 100 A => exactly 100 B (50% of value in B), L = 100/(1 - 1/sqrt(1.25)) = 947.2136 */
const c1 = app.clmmRangePlan("1", "0.8", "1.25", "100");
near("CLMM reciprocal range required B", c1.requiredB, 100, 1e-9);
near("CLMM reciprocal range liquidity", c1.liquidity, 947.2135955, 0.000001);
near("CLMM reciprocal range B value pct", c1.bValuePct, 50, 1e-9);
check("CLMM reciprocal range in range", c1.status === "in" && c1.inRange === true);
check("CLMM ticks at price 1 / 0.8 / 1.25", c1.tickCurrent === 0 && c1.tickLower === -2232 && c1.tickUpper === 2231);
/* wider symmetric range 0.5–2 at price 1 also splits 100 A / 100 B, with lower liquidity (less concentrated) */
const c2 = app.clmmRangePlan("1", "0.5", "2", "100");
near("CLMM wide range required B", c2.requiredB, 100, 1e-9);
check("CLMM wider range = lower liquidity", c2.liquidity < c1.liquidity);
near("CLMM wide range liquidity", c2.liquidity, 341.4213562, 0.000001);
/* below the range: entirely token A, L set by the range edges */
const c3 = app.clmmRangePlan("0.5", "0.8", "1.25", "100");
check("CLMM below range needs no B", c3.requiredB === 0 && c3.status === "below" && c3.inRange === false);
near("CLMM below range liquidity", c3.liquidity, 447.2135955, 0.000001);
near("CLMM below range B value pct is 0", c3.bValuePct, 0, 1e-12);
/* nearer the top of the range the position skews to token B, so the same fixed A deposit needs MORE B */
check("CLMM nearer upper needs more B", app.clmmRangePlan("1.2", "0.8", "1.25", "100").requiredB > app.clmmRangePlan("0.9", "0.8", "1.25", "100").requiredB);
check("CLMM B value share rises toward the top", app.clmmRangePlan("1.2", "0.8", "1.25", "100").bValuePct > app.clmmRangePlan("0.9", "0.8", "1.25", "100").bValuePct);
check("CLMM priceToTick known values", app.priceToTick(1) === 0 && app.priceToTick(2) === 6931 && app.priceToTick(0.5) === -6932 && app.priceToTick(1.0001) === 1);
check("CLMM rejects at/above upper for an A deposit", app.clmmRangePlan("1.25", "0.8", "1.25", "100") === null && app.clmmRangePlan("2", "0.8", "1.25", "100") === null);
check("CLMM rejects inverted / empty range", app.clmmRangePlan("1", "1.25", "0.8", "100") === null && app.clmmRangePlan("1", "1", "1", "100") === null);
check("CLMM rejects zero / junk inputs", app.clmmRangePlan("0", "0.8", "1.25", "100") === null && app.clmmRangePlan("1", "0.8", "1.25", "0") === null && app.clmmRangePlan("x", "0.8", "1.25", "100") === null && app.clmmRangePlan("1", "0.8", "1.25", "") === null);
check("CLMM range planner present in index.html", html.includes('id="clmm-calc"') && html.includes('id="clmm-result"'));

/* CLMM position checker — known values: amounts from L and the sqrt-price position maths */
/* position from Tool 8's headline case: range 0.8–1.25, L = 947.2135955 (100 A deposited at price 1) */
const L8 = "947.2135954999579";
/* at the entry price 1 it must hold exactly what Tool 8 deposited: 100 A / 100 B, value 200 B, 50% in B */
const p1 = app.clmmPositionAtPrice(L8, "0.8", "1.25", "1");
near("POS at entry price holds 100 A", p1.amountA, 100, 1e-9);
near("POS at entry price holds 100 B", p1.amountB, 100, 1e-9);
near("POS at entry price value in B", p1.valueInB, 200, 1e-9);
near("POS at entry price B value pct", p1.bValuePct, 50, 1e-9);
check("POS at entry price in range", p1.status === "in" && p1.inRange === true);
/* Tool 8 -> Tool 9 round trip: feeding Tool 8's own liquidity back at its own price returns its deposit pair */
const plan8 = app.clmmRangePlan("1", "0.8", "1.25", "100");
const pBack = app.clmmPositionAtPrice(String(plan8.liquidity), "0.8", "1.25", "1");
near("POS round-trips Tool 8 deposit A", pBack.amountA, 100, 1e-9);
near("POS round-trips Tool 8 deposit B", pBack.amountB, plan8.requiredB, 1e-9);
/* at/below the lower edge: entirely token A, L*(1/sqrt(0.8) - 1/sqrt(1.25)) = 211.80339887 A, none of B */
const pLow = app.clmmPositionAtPrice(L8, "0.8", "1.25", "0.8");
near("POS at lower edge holds only A", pLow.amountA, 211.80339887, 0.000001);
check("POS at lower edge holds no B", pLow.amountB === 0 && pLow.status === "below" && pLow.bValuePct === 0);
check("POS below range holds the same A", Math.abs(app.clmmPositionAtPrice(L8, "0.8", "1.25", "0.5").amountA - pLow.amountA) < 1e-9);
/* at/above the upper edge: entirely token B, L*(sqrt(1.25) - sqrt(0.8)) = 211.80339887 B, value all in B */
const pHigh = app.clmmPositionAtPrice(L8, "0.8", "1.25", "1.25");
near("POS at upper edge holds only B", pHigh.amountB, 211.80339887, 0.000001);
check("POS at upper edge holds no A", pHigh.amountA === 0 && pHigh.status === "above" && pHigh.bValuePct === 100);
check("POS above range holds the same B", Math.abs(app.clmmPositionAtPrice(L8, "0.8", "1.25", "2").amountB - pHigh.amountB) < 1e-9);
/* inside the range a rising price converts A into B: at 1.2 the position is ~90% B by value, at 0.9 ~27% */
check("POS rising price converts to B", app.clmmPositionAtPrice(L8, "0.8", "1.25", "1.2").bValuePct > p1.bValuePct && p1.bValuePct > app.clmmPositionAtPrice(L8, "0.8", "1.25", "0.9").bValuePct);
near("POS at 1.2 B value pct", app.clmmPositionAtPrice(L8, "0.8", "1.25", "1.2").bValuePct, 90.0818, 0.001);
check("POS rejects zero liquidity / price", app.clmmPositionAtPrice("0", "0.8", "1.25", "1") === null && app.clmmPositionAtPrice(L8, "0.8", "1.25", "0") === null);
check("POS rejects inverted / empty range", app.clmmPositionAtPrice(L8, "1.25", "0.8", "1") === null && app.clmmPositionAtPrice(L8, "1", "1", "1") === null);
check("POS rejects junk / empty", app.clmmPositionAtPrice("x", "0.8", "1.25", "1") === null && app.clmmPositionAtPrice(L8, "0.8", "1.25", "") === null && app.clmmPositionAtPrice(L8, "", "1.25", "1") === null);
check("CLMM position checker present in index.html", html.includes('id="pos-calc"') && html.includes('id="pos-result"'));

/* slippage / minimum-received — known values: min = out*(10000-bps)/10000 FLOORED, maxIn = in*(10000+bps)/10000 FLOORED */
/* expected 1000 out at 50bps (0.5%) => exactly 995 min, 5 protected */
const sl1 = app.slippagePlan("1000", 50);
check("SLIP 1000 @50bps min exact", sl1.minReceived === "995" && sl1.protectedAmount === "5");
near("SLIP slippage pct", sl1.slippagePct, 0.5, 1e-12);
/* the rounding point of the tool: expected 4 @0.5% is exactly 3.98 — floored to 3.98, NEVER rounded back up to 4 */
const sl2 = app.slippagePlan("4", 50);
check("SLIP 4 @0.5% floors, never rounds up", sl2.minReceived === "3.98" && sl2.minReceived !== "4");
check("SLIP protected amount on 4 @0.5%", sl2.protectedAmount === "0.02");
/* 100 @33bps => 99.67; 1 @1bp => 0.9999 */
check("SLIP 100 @33bps", app.slippagePlan("100", 33).minReceived === "99.67");
check("SLIP 1 @1bp", app.slippagePlan("1", 1).minReceived === "0.9999");
/* zero tolerance: min equals the expected out, nothing protected */
check("SLIP zero tolerance", app.slippagePlan("1000", 0).minReceived === "1000" && app.slippagePlan("1000", 0).protectedAmount === "0");
/* maximum input: expected 100 in @50bps => exactly 100.5 */
const sl3 = app.slippagePlan("1000", 50, "100");
check("SLIP max in exact", sl3.maxIn === "100.5" && sl3.expectedIn === "100");
/* max input floors too: 1 smallest unit in @50% tolerance => 1.5 units, floored back to 1 unit, never rounded up */
check("SLIP max in floors at the smallest unit", app.slippagePlan("1000", 5000, "0.000000001").maxIn === "0.000000001");
/* bounds never cross the expected amounts at any tolerance */
for (const bps of [1, 25, 50, 100, 500, 5000, 9999]) {
  const r = app.slippagePlan("123.456", bps, "123.456");
  check("SLIP bounds sane @" + bps + "bps", r !== null && parseFloat(r.minReceived) <= 123.456 && parseFloat(r.maxIn) >= 123.456);
}
check("SLIP without expected in has no maxIn", app.slippagePlan("1000", 50).maxIn === undefined);
check("SLIP rejects tolerance out of range", app.slippagePlan("1000", 10000) === null && app.slippagePlan("1000", -1) === null && app.slippagePlan("1000", 25.5) === null);
check("SLIP rejects zero / junk out", app.slippagePlan("0", 50) === null && app.slippagePlan("abc", 50) === null && app.slippagePlan("", 50) === null);
check("SLIP rejects dust that floors to zero min", app.slippagePlan("0.000000001", 5000) === null);
check("SLIP rejects junk expected in when given", app.slippagePlan("1000", 50, "abc") === null && app.slippagePlan("1000", 50, "0") === null);
check("slippage calculator present in index.html", html.includes('id="slip-calc"') && html.includes('id="slip-result"'));

/* tick / price converter — known values: price = 1.0001^tick, tick = floor(log_{1.0001}(price)) */
near("TICK tickToPrice 0", app.tickToPrice(0), 1, 1e-12);
near("TICK tickToPrice 1", app.tickToPrice(1), 1.0001, 1e-12);
near("TICK tickToPrice -1", app.tickToPrice(-1), 0.999900009999, 1e-12);
check("TICK tickToPrice bounds", app.tickToPrice(app.TICK_MAX) !== null && app.tickToPrice(app.TICK_MIN) !== null);
check("TICK tickToPrice rejects out of range / fractional", app.tickToPrice(443637) === null && app.tickToPrice(-443637) === null && app.tickToPrice(1.5) === null);
/* price 1 is tick 0 exactly; its next tick is 1 at 1.0001 */
const t0 = app.tickPriceConvert("1");
check("TICK price 1 is tick 0", t0.tick === 0 && t0.tickPrice === 1 && t0.nextTick === 1);
near("TICK price 1 next tick price", t0.nextTickPrice, 1.0001, 1e-12);
/* price 1.25 floors to tick 2231, whose own price 1.2499316199 sits just below 1.25; next tick is above */
const t1 = app.tickPriceConvert("1.25");
check("TICK price 1.25 floors to 2231", t1.tick === 2231);
near("TICK tick 2231 price", t1.tickPrice, 1.2499316199, 1e-9);
check("TICK tick price <= price < next tick price", t1.tickPrice <= 1.25 && t1.nextTickPrice > 1.25);
/* price 0.8 floors to tick -2232 (floor, not nearest: -2231's price is above 0.8) */
const t2 = app.tickPriceConvert("0.8");
check("TICK price 0.8 floors to -2232", t2.tick === -2232);
near("TICK tick -2232 price", t2.tickPrice, 0.7999637693, 1e-9);
/* round trip across a sweep: tickToPrice(priceToTick(p)) <= p < tickToPrice(tick+1) */
for (const p of [0.01, 0.5, 0.99, 1, 1.01, 2, 10, 150.5, 1000]) {
  const r = app.tickPriceConvert(String(p));
  check("TICK round-trip brackets " + p, r !== null && r.tickPrice <= p && r.nextTickPrice > p);
}
/* snapping at spacing 10: 2231 snaps down to 2230 / up to 2240, with prices to match */
const ts1 = app.tickPriceConvert("1.25", "10");
check("TICK snap 2231 @10", ts1.snappedDownTick === 2230 && ts1.snappedUpTick === 2240 && ts1.spacing === 10);
near("TICK snapped down price @10", ts1.snappedDownPrice, app.tickToPrice(2230), 1e-12);
near("TICK snapped up price @10", ts1.snappedUpPrice, app.tickToPrice(2240), 1e-9);
/* negative ticks snap by floor division: -2232 @10 snaps DOWN to -2240 (away from zero), up to -2230 */
const ts2 = app.tickPriceConvert("0.8", "10");
check("TICK negative snap @10", ts2.snappedDownTick === -2240 && ts2.snappedUpTick === -2230);
/* a tick already on a multiple snaps to itself both ways */
const ts3 = app.tickPriceConvert("1", "10");
check("TICK on-multiple snaps to itself", ts3.snappedDownTick === 0 && ts3.snappedUpTick === 0);
check("TICK without spacing has no snap fields", app.tickPriceConvert("1.25").snappedDownTick === undefined);
check("TICK rejects zero / negative / junk price", app.tickPriceConvert("0") === null && app.tickPriceConvert("-1") === null && app.tickPriceConvert("abc") === null && app.tickPriceConvert("") === null);
check("TICK rejects price outside tick range", app.tickPriceConvert("1e30") === null && app.tickPriceConvert("1e-30") === null);
check("TICK rejects bad spacing", app.tickPriceConvert("1.25", "0") === null && app.tickPriceConvert("1.25", "-10") === null && app.tickPriceConvert("1.25", "2.5") === null && app.tickPriceConvert("1.25", "x") === null);
check("tick converter present in index.html", html.includes('id="tick-calc"') && html.includes('id="tick-result"'));

/* CLMM position vs holding — known values: entry holdings valued at the check price vs the position's holdings there */
/* position from Tools 8/9's headline case: range 0.8–1.25, L = 947.2135955, entered at price 1 holding 100 A / 100 B */
const vhL = "947.2135954999579";
/* at the entry price the position IS the holding: zero gap, zero fees needed */
const vh0 = app.clmmVsHold(vhL, "0.8", "1.25", "1", "1");
near("VH at entry price hold value", vh0.holdValueInB, 200, 1e-9);
near("VH at entry price position value", vh0.positionValueInB, 200, 1e-9);
near("VH at entry price diff is 0", vh0.diffInB, 0, 1e-9);
near("VH at entry price fees needed is 0", vh0.feesNeededInB, 0, 1e-9);
near("VH entry holdings are Tool 9's at entry", vh0.entryAmountA, 100, 1e-9);
/* at the upper edge 1.25: position is 211.80339887 B, holding is 100*1.25+100 = 225 B => shortfall 13.19660113 B, -5.86515606% */
const vhUp = app.clmmVsHold(vhL, "0.8", "1.25", "1", "1.25");
near("VH at upper edge position value", vhUp.positionValueInB, 211.80339887, 0.000001);
near("VH at upper edge hold value", vhUp.holdValueInB, 225, 1e-9);
near("VH at upper edge fees needed", vhUp.feesNeededInB, 13.19660113, 0.000001);
near("VH at upper edge pct vs hold", vhUp.vsHoldPct, -5.86515606, 0.000001);
check("VH at upper edge check holdings all B", vhUp.checkAmountA === 0 && vhUp.checkStatus === "above");
/* the reciprocal range makes the lower edge symmetric: at 0.8 the pct vs hold is the same -5.86515606% */
const vhLo = app.clmmVsHold(vhL, "0.8", "1.25", "1", "0.8");
near("VH at lower edge fees needed", vhLo.feesNeededInB, 10.5572809, 0.000001);
near("VH lower edge pct equals upper edge pct", vhLo.vsHoldPct, vhUp.vsHoldPct, 1e-9);
/* beyond the range the gap keeps growing: at 2, holding 300 B vs position still 211.80339887 B */
const vhFar = app.clmmVsHold(vhL, "0.8", "1.25", "1", "2");
near("VH far above hold value", vhFar.holdValueInB, 300, 1e-9);
near("VH far above fees needed", vhFar.feesNeededInB, 88.19660113, 0.000001);
near("VH far above pct vs hold", vhFar.vsHoldPct, -29.39886704, 0.000001);
/* the position never beats holding, at any check price inside or outside the range */
for (const p of ["0.5", "0.8", "0.9", "1", "1.1", "1.2", "1.25", "2"]) {
  const r = app.clmmVsHold(vhL, "0.8", "1.25", "1", p);
  check("VH position never beats holding @" + p, r !== null && r.diffInB <= 1e-9 && r.feesNeededInB >= -1e-9 && r.vsHoldPct <= 1e-9);
}
/* consistency with Tool 9: the check holdings here are exactly Tool 9's at the check price */
const posAt12 = app.clmmPositionAtPrice(vhL, "0.8", "1.25", "1.2");
const vh12 = app.clmmVsHold(vhL, "0.8", "1.25", "1", "1.2");
near("VH check holdings match Tool 9 A", vh12.checkAmountA, posAt12.amountA, 1e-12);
near("VH check holdings match Tool 9 B", vh12.checkAmountB, posAt12.amountB, 1e-12);
near("VH at 1.2 pct vs hold", vh12.vsHoldPct, -3.92222635, 0.000001);
/* entering out of range: entered below the range holding only A, checked at entry — still zero gap */
const vhOut = app.clmmVsHold(vhL, "0.8", "1.25", "0.5", "0.5");
near("VH out-of-range entry diff is 0", vhOut.diffInB, 0, 1e-9);
check("VH out-of-range entry status", vhOut.entryStatus === "below" && vhOut.entryAmountB === 0);
check("VH rejects zero liquidity / prices", app.clmmVsHold("0", "0.8", "1.25", "1", "1") === null && app.clmmVsHold(vhL, "0.8", "1.25", "0", "1") === null && app.clmmVsHold(vhL, "0.8", "1.25", "1", "0") === null);
check("VH rejects inverted / empty range", app.clmmVsHold(vhL, "1.25", "0.8", "1", "1") === null && app.clmmVsHold(vhL, "1", "1", "1", "1") === null);
check("VH rejects junk / empty", app.clmmVsHold("x", "0.8", "1.25", "1", "1") === null && app.clmmVsHold(vhL, "0.8", "1.25", "", "1") === null && app.clmmVsHold(vhL, "0.8", "1.25", "1", "") === null);
check("vs-holding calculator present in index.html", html.includes('id="vh-calc"') && html.includes('id="vh-result"'));

/* ---------- 13 · CLMM fee estimator ---------- */
/* headline: L is exactly 10% of active liquidity; 1,000,000 B/day at
   25 bps is 2,500 B of pool fees; 10% share at 80% in range = 200/day */
const cf = app.clmmFeeEstimate("947.2136", "9472.136", "1000000", "25", "30", "80", "20000");
near("CF share pct", cf.sharePct, 10, 1e-9);
near("CF pool fees per day", cf.poolFeesPerDay, 2500, 1e-9);
near("CF fees per day", cf.feesPerDay, 200, 1e-9);
near("CF fees for period", cf.feesForPeriod, 6000, 1e-9);
near("CF naive APR", cf.naiveAprPct, 365, 1e-9);
/* sole active LP at 1% tier, half the time in range */
const cfSole = app.clmmFeeEstimate("500", "500", "40000", "100", "7", "50", "");
near("CF sole-LP share is 100", cfSole.sharePct, 100, 1e-12);
near("CF sole-LP fees per day", cfSole.feesPerDay, 200, 1e-9);
near("CF sole-LP fees for period", cfSole.feesForPeriod, 1400, 1e-9);
check("CF no position value -> no APR", cfSole.naiveAprPct === null && cfSole.positionValueInB === null);
/* empty time-in-range defaults to 100%: full 10% of 2,500 = 250/day */
near("CF default in-range is 100%", app.clmmFeeEstimate("947.2136", "9472.136", "1000000", "25", "30", "", "20000").feesPerDay, 250, 1e-9);
/* zeros that are honest answers, not errors */
check("CF zero fee tier earns 0", app.clmmFeeEstimate("500", "500", "40000", "0", "7", "50", "").feesPerDay === 0);
check("CF zero time in range earns 0", app.clmmFeeEstimate("500", "500", "40000", "100", "7", "0", "").feesPerDay === 0);
check("CF zero volume earns 0", app.clmmFeeEstimate("500", "500", "0", "100", "7", "50", "").feesForPeriod === 0);
/* doubling volume or time in range doubles the fees; period = day * days */
for (const [v, ir] of [["100000", "100"], ["250000", "60"], ["50000", "25"]]) {
  const a = app.clmmFeeEstimate("100", "1000", v, "25", "10", ir, "");
  const b = app.clmmFeeEstimate("100", "1000", String(Number(v) * 2), "25", "10", ir, "");
  check(`CF fees scale with volume @${v}/${ir}`, a !== null && b !== null && Math.abs(b.feesPerDay - 2 * a.feesPerDay) < 1e-9 && Math.abs(a.feesForPeriod - a.feesPerDay * 10) < 1e-9);
}
check("CF rejects your L above total active", app.clmmFeeEstimate("600", "500", "40000", "100", "7", "50", "") === null);
check("CF rejects zero / negative liquidity", app.clmmFeeEstimate("0", "500", "40000", "100", "7", "50", "") === null && app.clmmFeeEstimate("500", "0", "40000", "100", "7", "50", "") === null && app.clmmFeeEstimate("-5", "500", "40000", "100", "7", "50", "") === null);
check("CF rejects fee tier above 100%", app.clmmFeeEstimate("5", "5", "1", "10001", "1", "100", "") === null && app.clmmFeeEstimate("5", "5", "1", "-1", "1", "100", "") === null);
check("CF rejects time in range outside 0-100", app.clmmFeeEstimate("5", "5", "1", "25", "1", "101", "") === null && app.clmmFeeEstimate("5", "5", "1", "25", "1", "-1", "") === null);
check("CF rejects zero days / negative volume", app.clmmFeeEstimate("5", "5", "1", "25", "0", "100", "") === null && app.clmmFeeEstimate("5", "5", "-1", "25", "1", "100", "") === null);
check("CF rejects non-positive position value when given", app.clmmFeeEstimate("5", "5", "1", "25", "1", "100", "0") === null && app.clmmFeeEstimate("5", "5", "1", "25", "1", "100", "-3") === null);
check("CF rejects junk / empty", app.clmmFeeEstimate("x", "5", "1", "25", "1", "100", "") === null && app.clmmFeeEstimate("5", "", "1", "25", "1", "100", "") === null && app.clmmFeeEstimate("5", "5", "", "25", "1", "100", "") === null);
check("CLMM fee calculator present in index.html", html.includes('id="cfee-calc"') && html.includes('id="cfee-result"'));

/* ---------- 14 · CLMM wallet-balance deposit planner ---------- */
/* headline: range 0.8–1.25 at price 1 splits evenly (Tool 8: 100 A needs
   100 B, L = 947.2135955), so balances 100/100 fund exactly that, both used */
const wp1 = app.clmmWalletPlan("1", "0.8", "1.25", "100", "100");
near("WP balanced balances liquidity", wp1.liquidity, 947.2135955, 0.000001);
near("WP balanced used A", wp1.usedA, 100, 1e-9);
near("WP balanced used B", wp1.usedB, 100, 1e-9);
near("WP balanced leftover A", wp1.leftoverA, 0, 1e-9);
near("WP balanced leftover B", wp1.leftoverB, 0, 1e-9);
check("WP balanced limiting is both, in range", wp1.limiting === "both" && wp1.status === "in" && wp1.inRange === true);
/* B is scarcer: 100 A / 50 B => L halves, A used halves, 50 A left over */
const wp2 = app.clmmWalletPlan("1", "0.8", "1.25", "100", "50");
near("WP B-limited liquidity", wp2.liquidity, 473.6067977, 0.000001);
near("WP B-limited used A", wp2.usedA, 50, 1e-9);
near("WP B-limited used B", wp2.usedB, 50, 1e-9);
near("WP B-limited leftover A", wp2.leftoverA, 50, 1e-9);
check("WP B-limited limiting is B", wp2.limiting === "B");
/* A is scarcer: 25 A / 100 B => used 25/25, 75 B left over */
const wp3 = app.clmmWalletPlan("1", "0.8", "1.25", "25", "100");
near("WP A-limited used B", wp3.usedB, 25, 1e-9);
near("WP A-limited leftover B", wp3.leftoverB, 75, 1e-9);
check("WP A-limited limiting is A", wp3.limiting === "A");
/* consistency with Tool 9: the used amounts are exactly what a position
   with the funded liquidity holds at the current price */
for (const [price, ba, bb] of [["1", "100", "50"], ["1.2", "100", "100"], ["0.9", "40", "90"]]) {
  const wp = app.clmmWalletPlan(price, "0.8", "1.25", ba, bb);
  const pos = app.clmmPositionAtPrice(String(wp.liquidity), "0.8", "1.25", price);
  check("WP used amounts match Tool 9 @" + price + " " + ba + "/" + bb,
    Math.abs(wp.usedA - pos.amountA) < 1e-9 && Math.abs(wp.usedB - pos.amountB) < 1e-9);
}
/* at 1.2 the position skews to B, so equal balances are B-limited with
   most of the A left over (L from B: 100/(sqrt(1.2)-sqrt(0.8))) */
const wpSkew = app.clmmWalletPlan("1.2", "0.8", "1.25", "100", "100");
near("WP skewed liquidity", wpSkew.liquidity, 497.4680765, 0.000001);
near("WP skewed used B in full", wpSkew.usedB, 100, 1e-9);
check("WP skewed limiting is B, A mostly left", wpSkew.limiting === "B" && wpSkew.leftoverA > 90);
/* used + leftover always rebuilds the balances, and neither exceeds them */
for (const [price, ba, bb] of [["1", "100", "100"], ["1", "100", "50"], ["0.5", "100", "999"], ["2", "999", "100"], ["1.1", "7", "13"]]) {
  const wp = app.clmmWalletPlan(price, "0.8", "1.25", ba, bb);
  check("WP used+leftover = balances @" + price + " " + ba + "/" + bb,
    wp !== null && Math.abs(wp.usedA + wp.leftoverA - Number(ba)) < 1e-9 && Math.abs(wp.usedB + wp.leftoverB - Number(bb)) < 1e-9 && wp.usedA <= Number(ba) + 1e-9 && wp.usedB <= Number(bb) + 1e-9);
}
/* below the range: entirely A — L from the range edges (Tool 8's below
   case, 447.2135955 for 100 A), the whole B balance is leftover */
const wpBelow = app.clmmWalletPlan("0.5", "0.8", "1.25", "100", "999");
near("WP below-range liquidity", wpBelow.liquidity, 447.2135955, 0.000001);
check("WP below-range uses only A", wpBelow.usedA === 100 && wpBelow.usedB === 0 && wpBelow.leftoverB === 999 && wpBelow.status === "below" && wpBelow.limiting === "A");
check("WP below-range B balance may be zero", app.clmmWalletPlan("0.5", "0.8", "1.25", "100", "0") !== null);
/* at/above the top: entirely B, symmetrically */
const wpAbove = app.clmmWalletPlan("2", "0.8", "1.25", "999", "100");
near("WP above-range liquidity", wpAbove.liquidity, 447.2135955, 0.000001);
check("WP above-range uses only B", wpAbove.usedB === 100 && wpAbove.usedA === 0 && wpAbove.leftoverA === 999 && wpAbove.status === "above" && wpAbove.limiting === "B");
check("WP above-range A balance may be zero", app.clmmWalletPlan("2", "0.8", "1.25", "0", "100") !== null);
/* funding a Tool 8 plan exactly: Tool 8 says 100 A at price 1 needs
   100 B — those balances fund Tool 8's own liquidity, nothing left */
const plan8wp = app.clmmRangePlan("1", "0.8", "1.25", "100");
const wpRound = app.clmmWalletPlan("1", "0.8", "1.25", "100", String(plan8wp.requiredB));
near("WP round-trips Tool 8 liquidity", wpRound.liquidity, plan8wp.liquidity, 1e-9);
check("WP rejects zero balance on a needed side", app.clmmWalletPlan("1", "0.8", "1.25", "0", "100") === null && app.clmmWalletPlan("1", "0.8", "1.25", "100", "0") === null && app.clmmWalletPlan("0.5", "0.8", "1.25", "0", "100") === null && app.clmmWalletPlan("2", "0.8", "1.25", "100", "0") === null);
check("WP rejects inverted / empty range", app.clmmWalletPlan("1", "1.25", "0.8", "100", "100") === null && app.clmmWalletPlan("1", "1", "1", "100", "100") === null);
check("WP rejects zero / negative / junk", app.clmmWalletPlan("0", "0.8", "1.25", "100", "100") === null && app.clmmWalletPlan("1", "0.8", "1.25", "-5", "100") === null && app.clmmWalletPlan("1", "0.8", "1.25", "100", "-5") === null && app.clmmWalletPlan("x", "0.8", "1.25", "100", "100") === null);
check("WP rejects empty fields", app.clmmWalletPlan("", "0.8", "1.25", "100", "100") === null && app.clmmWalletPlan("1", "0.8", "1.25", "", "100") === null && app.clmmWalletPlan("1", "0.8", "1.25", "100", "") === null);
check("wallet planner present in index.html", html.includes('id="wp-calc"') && html.includes('id="wp-result"'));

console.log(failures === 0 ? "\nALL TESTS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
