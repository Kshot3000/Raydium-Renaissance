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
check("all break-even-days controls labelled",
  ["bed-l", "bed-lower", "bed-upper", "bed-entry", "bed-check", "bed-total", "bed-volume", "bed-bps", "bed-inrange", "bed-out"]
    .every(id => html.includes(`for="${id}"`)));
check("cache keys present", html.includes("styles.css?v=1") && html.includes("app.js?v=24"));
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

/* ---------- 15 · CLMM break-even days (Tools 12 + 13 joined) ---------- */
/* headline: Tools 8/9's position (range 0.8–1.25, L = 947.2135955, entered
   at 1) checked at the upper edge — Tool 12's hurdle is 13.19660113 B.
   Total active liquidity is exactly 10x the position's (10% share);
   1,000,000 B/day at 25 bps is 2,500 B of pool fees, so the position
   earns 250 B/day at 100% in range: 13.19660113 / 250 = 0.0527864045 days */
const beL = "947.2135954999579";
const bed1 = app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472.135954999579", "1000000", "25", "");
near("BED headline fees needed (Tool 12 hurdle)", bed1.feesNeededInB, 13.19660113, 0.000001);
near("BED headline fees per day (Tool 13 rate)", bed1.feesPerDay, 250, 1e-9);
near("BED headline share pct", bed1.sharePct, 10, 1e-9);
near("BED headline days to break even", bed1.daysToBreakEven, 0.0527864045, 0.000000001);
near("BED headline pct vs hold", bed1.vsHoldPct, -5.86515606, 0.000001);
/* consistency, exactly: the hurdle IS Tool 12's and the rate IS Tool 13's
   for the same inputs, so the day count is their ratio with no drift */
const vhForBed = app.clmmVsHold(beL, "0.8", "1.25", "1", "1.25");
const cfForBed = app.clmmFeeEstimate(beL, "9472.135954999579", "1000000", "25", "1", "", "");
check("BED hurdle equals Tool 12 exactly", bed1.feesNeededInB === vhForBed.feesNeededInB);
check("BED rate equals Tool 13 exactly", bed1.feesPerDay === cfForBed.feesPerDay);
check("BED days equal hurdle / rate exactly", bed1.daysToBreakEven === vhForBed.feesNeededInB / cfForBed.feesPerDay);
/* 80% time in range cuts the rate to 200/day and stretches the days */
const bed80 = app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472.135954999579", "1000000", "25", "80");
near("BED 80% in range fees per day", bed80.feesPerDay, 200, 1e-9);
near("BED 80% in range days", bed80.daysToBreakEven, 0.06598300563, 0.00000001);
/* the lower edge's hurdle is Tool 12's reciprocal-symmetric 10.5572809 B */
const bedLo = app.clmmBreakEven(beL, "0.8", "1.25", "1", "0.8", "9472.135954999579", "1000000", "25", "");
near("BED lower edge fees needed", bedLo.feesNeededInB, 10.5572809, 0.000001);
near("BED lower edge days", bedLo.daysToBreakEven, 0.0422291236, 0.000000001);
/* doubling volume (or the fee tier, or the share) halves the day count */
const bedDbl = app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472.135954999579", "2000000", "25", "");
check("BED doubling volume halves days", Math.abs(bedDbl.daysToBreakEven - bed1.daysToBreakEven / 2) < 1e-12);
/* the honest edges: no gap at the entry price is 0 days even at a zero
   fee rate; a real gap at a zero rate is Infinity, never a big number */
check("BED at entry price is 0 days even with zero volume",
  app.clmmBreakEven(beL, "0.8", "1.25", "1", "1", "9472.135954999579", "0", "25", "").daysToBreakEven === 0);
check("BED gap with zero volume never breaks even",
  app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472.135954999579", "0", "25", "").daysToBreakEven === Infinity);
check("BED gap with zero fee tier never breaks even",
  app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472.135954999579", "1000000", "0", "").daysToBreakEven === Infinity);
check("BED gap with 0% time in range never breaks even",
  app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472.135954999579", "1000000", "25", "0").daysToBreakEven === Infinity);
/* the bigger the price travel, the bigger the hurdle and the longer the wait */
check("BED further check price = more days",
  app.clmmBreakEven(beL, "0.8", "1.25", "1", "2", "9472.135954999579", "1000000", "25", "").daysToBreakEven > bed1.daysToBreakEven);
check("BED rejects your L above total active", app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "500", "1000000", "25", "") === null);
check("BED rejects zero liquidity / prices", app.clmmBreakEven("0", "0.8", "1.25", "1", "1.25", "9472", "1000000", "25", "") === null && app.clmmBreakEven(beL, "0.8", "1.25", "0", "1.25", "9472", "1000000", "25", "") === null && app.clmmBreakEven(beL, "0.8", "1.25", "1", "0", "9472", "1000000", "25", "") === null);
check("BED rejects inverted / empty range", app.clmmBreakEven(beL, "1.25", "0.8", "1", "1.25", "9472", "1000000", "25", "") === null && app.clmmBreakEven(beL, "1", "1", "1", "1.25", "9472", "1000000", "25", "") === null);
check("BED rejects fee tier above 100% / negative", app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "1000000", "10001", "") === null && app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "1000000", "-1", "") === null);
check("BED rejects time in range outside 0-100", app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "1000000", "25", "101") === null && app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "1000000", "25", "-1") === null);
check("BED rejects negative volume", app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "-5", "25", "") === null);
check("BED rejects junk / empty", app.clmmBreakEven("x", "0.8", "1.25", "1", "1.25", "9472", "1000000", "25", "") === null && app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "", "25", "") === null && app.clmmBreakEven(beL, "0.8", "1.25", "1", "1.25", "9472", "1000000", "", "") === null && app.clmmBreakEven(beL, "0.8", "1.25", "", "1.25", "9472", "1000000", "25", "") === null);
check("break-even days calculator present in index.html", html.includes('id="bed-calc"') && html.includes('id="bed-result"'));

/* CP arbitrage — known values: reserves at Pe are sqrt(k/Pe), sqrt(k*Pe) */
/* 1000/1000, Pe 4, no fee: pay 1000 B, take 500 A, profit 500*4-1000 = 1000 B */
const a1 = app.cpArbitrage("1000", "1000", "4", 0);
check("ARB buy-a direction", a1.direction === "buy-a" && a1.inToken === "B" && a1.outToken === "A");
near("ARB buy-a net in", a1.netIn, 1000, 1e-9);
near("ARB buy-a gross in (no fee)", a1.grossIn, 1000, 1e-9);
near("ARB buy-a amount out", a1.amountOut, 500, 1e-9);
near("ARB buy-a profit", a1.profitInB, 1000, 1e-9);
near("ARB buy-a gap pct", a1.priceGapPct, 300, 1e-9);
near("ARB post-trade spot is the external price", a1.postTradeSpot, 4, 1e-12);
/* mirror: Pe 0.25 — pay 1000 A, take 500 B, profit 500 - 1000*0.25 = 250 B */
const a2 = app.cpArbitrage("1000", "1000", "0.25", 0);
check("ARB sell-a direction", a2.direction === "sell-a" && a2.inToken === "A" && a2.outToken === "B");
near("ARB sell-a net in", a2.netIn, 1000, 1e-9);
near("ARB sell-a amount out", a2.amountOut, 500, 1e-9);
near("ARB sell-a profit", a2.profitInB, 250, 1e-9);
near("ARB sell-a gap pct", a2.priceGapPct, -75, 1e-9);
/* fee grosses the input up: buy case at 25bps gross = 1000/0.9975, profit = 2000 - gross */
const a3 = app.cpArbitrage("1000", "1000", "4", 25);
near("ARB 25bps gross in", a3.grossIn, 1002.5062656641603, 1e-9);
near("ARB 25bps profit", a3.profitInB, 997.4937343358397, 1e-9);
check("ARB fee lowers profit both directions", a3.profitInB < a1.profitInB && app.cpArbitrage("1000", "1000", "0.25", 25).profitInB < a2.profitInB);
/* no gap, no trade — including at an asymmetric spot price */
const a0 = app.cpArbitrage("2000", "500", "0.25", 25);
check("ARB at spot is none", a0.direction === "none" && a0.profitInB === 0 && a0.amountOut === 0 && a0.grossIn === 0);
/* a gap smaller than the fee is honestly unprofitable; without the fee it is not */
check("ARB tiny gap eaten by fee", app.cpArbitrage("1000", "1000", "1.001", 25).profitInB < 0);
check("ARB tiny gap profitable at zero fee", app.cpArbitrage("1000", "1000", "1.001", 0).profitInB > 0);
/* consistency: Tool 1 swapping the gross input yields the modelled amount out */
for (const [ra, rb, pe, f] of [["1000", "1000", "4", 0], ["1000", "1000", "4", 25], ["1000", "1000", "0.25", 25], ["2000000", "500000", "0.5", 25]]) {
  const arb = app.cpArbitrage(ra, rb, pe, f);
  const rin = arb.inToken === "B" ? rb : ra, rout = arb.inToken === "B" ? ra : rb;
  const sw = app.cpSwap(rin, rout, arb.grossIn.toFixed(9), f);
  check("ARB Tool-1 consistency " + ra + "/" + rb + " Pe " + pe + " @" + f + "bps", sw !== null && Math.abs(parseFloat(sw.out) - arb.amountOut) < 0.001);
}
/* reciprocal symmetry: swapping the tokens and inverting the price models the same trade */
const aSym = app.cpArbitrage("1000", "1000", "0.25", 0);
near("ARB reciprocal profit equivalence (valued in B)", aSym.profitInB * 4, a1.profitInB, 1e-9);
check("ARB larger gap = larger profit", app.cpArbitrage("1000", "1000", "9", 25).profitInB > a3.profitInB);
check("ARB rejects zero reserves / price", app.cpArbitrage("0", "1000", "1", 25) === null && app.cpArbitrage("1000", "0", "1", 25) === null && app.cpArbitrage("1000", "1000", "0", 25) === null && app.cpArbitrage("1000", "1000", "-1", 25) === null);
check("ARB rejects bad fee", app.cpArbitrage("1000", "1000", "2", 10000) === null && app.cpArbitrage("1000", "1000", "2", -1) === null);
check("ARB rejects junk / empty", app.cpArbitrage("x", "1000", "2", 25) === null && app.cpArbitrage("1000", "1000", "", 25) === null && app.cpArbitrage("1000", "1000", "2", "") === null && app.cpArbitrage("", "1000", "2", 25) === null);
check("all arbitrage controls labelled", ["arb-ra", "arb-rb", "arb-ext", "arb-fee", "arb-out"].every(id => html.includes(`for="${id}"`)));
check("arbitrage tool present in index.html", html.includes('id="arb-calc"') && html.includes('id="arb-result"'));
check("arbitrage honesty: external price is user input", html.includes("not a live feed") && html.includes("not financial advice"));

/* Price-impact sizer — grossIn = reserveIn*(p-fee)/((1-p)*(1-fee)) */
/* 1000/1000, cap 10%, no fee: in = 1000*0.1/0.9 = 111.111…, out = 100 exactly */
const pi1 = app.priceImpactSizer("1000", "1000", "10", 0);
check("PI feasible at zero fee", pi1.feasible === true);
near("PI zero-fee max in", pi1.maxAmountIn, 111.11111111111111, 1e-9);
near("PI zero-fee amount out", pi1.amountOut, 100, 1e-9);
near("PI zero-fee actual impact is the cap", pi1.actualImpactPct, 10, 1e-9);
near("PI zero-fee post-trade spot", pi1.postTradeSpotPrice, 0.81, 1e-9);
/* 25bps fee, cap 1%: in = 1000*0.0075/(0.99*0.9975) ≈ 7.5947, impact lands on the cap */
const pi2 = app.priceImpactSizer("1000", "1000", "1", 25);
check("PI feasible above the fee floor", pi2.feasible === true);
near("PI 25bps max in", pi2.maxAmountIn, 7.594744436849699, 1e-9);
near("PI 25bps actual impact is the cap", pi2.actualImpactPct, 1, 1e-9);
near("PI fee impact reported", pi2.feeImpactPct, 0.25, 1e-12);
/* consistency: Tool 1 swapping the sized input reports the capped impact,
   and a 1%-larger trade crosses the cap while a 1%-smaller one stays under */
for (const [rin, rout, cap, f] of [["1000", "1000", "10", 0], ["1000", "1000", "1", 25], ["2000000", "500000", "5", 25], ["500", "2000", "2.5", 100]]) {
  const pi = app.priceImpactSizer(rin, rout, cap, f);
  const at = app.cpSwap(rin, rout, pi.maxAmountIn.toFixed(9), f);
  check("PI Tool-1 consistency " + rin + "/" + rout + " cap " + cap + " @" + f + "bps",
    at !== null && Math.abs(at.priceImpactPct - Number(cap)) < 0.01);
  const over = app.cpSwap(rin, rout, (pi.maxAmountIn * 1.01).toFixed(9), f);
  const under = app.cpSwap(rin, rout, (pi.maxAmountIn * 0.99).toFixed(9), f);
  check("PI bracket " + rin + "/" + rout + " cap " + cap + " @" + f + "bps",
    over !== null && under !== null && over.priceImpactPct > Number(cap) && under.priceImpactPct < Number(cap));
}
/* the honest fee floor: a cap at or below the fee admits no positive trade */
check("PI cap equal to fee is infeasible", app.priceImpactSizer("1000", "1000", "0.25", 25).feasible === false && app.priceImpactSizer("1000", "1000", "0.25", 25).maxAmountIn === 0);
check("PI cap below fee is infeasible", app.priceImpactSizer("1000", "1000", "0.1", 25).feasible === false);
check("PI cap just above fee is a small positive trade", (() => { const r = app.priceImpactSizer("1000", "1000", "0.26", 25); return r.feasible === true && r.maxAmountIn > 0 && r.maxAmountIn < 1; })());
/* depth is the point: the same cap in a 10x deeper pool sizes a 10x trade */
const piDeep = app.priceImpactSizer("10000", "10000", "10", 0);
near("PI 10x deeper pool = 10x trade", piDeep.maxAmountIn, pi1.maxAmountIn * 10, 1e-6);
near("PI 10x deeper pool = 10x out", piDeep.amountOut, pi1.amountOut * 10, 1e-6);
check("PI larger cap = larger trade", app.priceImpactSizer("1000", "1000", "20", 25).maxAmountIn > app.priceImpactSizer("1000", "1000", "10", 25).maxAmountIn);
check("PI higher fee = smaller trade at same cap", app.priceImpactSizer("1000", "1000", "5", 100).maxAmountIn < app.priceImpactSizer("1000", "1000", "5", 25).maxAmountIn);
check("PI rejects zero reserves", app.priceImpactSizer("0", "1000", "1", 25) === null && app.priceImpactSizer("1000", "0", "1", 25) === null);
check("PI rejects cap at/above 100 or at/below 0", app.priceImpactSizer("1000", "1000", "100", 25) === null && app.priceImpactSizer("1000", "1000", "0", 25) === null && app.priceImpactSizer("1000", "1000", "-1", 25) === null);
check("PI rejects bad fee", app.priceImpactSizer("1000", "1000", "1", 10000) === null && app.priceImpactSizer("1000", "1000", "1", -1) === null && app.priceImpactSizer("1000", "1000", "1", 12.5) === null);
check("PI rejects junk / empty", app.priceImpactSizer("x", "1000", "1", 25) === null && app.priceImpactSizer("1000", "1000", "", 25) === null && app.priceImpactSizer("1000", "1000", "1", "") === null && app.priceImpactSizer("", "1000", "1", 25) === null);
check("all price-impact controls labelled", ["pi-rin", "pi-rout", "pi-cap", "pi-fee", "pi-out"].every(id => html.includes(`for="${id}"`)));
check("price-impact tool present in index.html", html.includes('id="pi-calc"') && html.includes('id="pi-result"'));
check("price-impact honesty: fee floor + model label", html.includes("admits no positive trade at all") && html.includes("not a live quote, not financial advice"));

/* LP-token share & value — known values: amount = reserve * yours / supply, floored */
/* reserves 1,000,000 A / 500,000 B, supply 100,000, yours 1,000 => 1% share, 10,000 A / 5,000 B, value 5,000 + 10,000*0.5 = 10,000 B */
const lp1 = app.lpTokenValue("1000000", "500000", "100000", "1000");
near("LP share pct", lp1.sharePct, 1, 1e-12);
check("LP redeem amounts exact", lp1.amountA === "10000" && lp1.amountB === "5000");
check("LP remaining reserves", lp1.remainingReserveA === "990000" && lp1.remainingReserveB === "495000");
near("LP price B per A", lp1.priceBperA, 0.5, 1e-12);
near("LP value in B at pool spot", lp1.valueInB, 10000, 1e-9);
/* holding the whole supply redeems the whole pool, no more and no less */
const lpSole = app.lpTokenValue("1000", "250", "500", "500");
check("LP sole holder redeems everything", lpSole.amountA === "1000" && lpSole.amountB === "250" && lpSole.remainingReserveA === "0" && lpSole.remainingReserveB === "0");
near("LP sole holder share is 100", lpSole.sharePct, 100, 1e-12);
near("LP sole holder value in B", lpSole.valueInB, 500, 1e-9);
/* fractional: reserves 3 A / 1 B, supply 2, yours 1 => 1.5 A / 0.5 B, value 0.5 + 1.5/3 = 1 B */
const lpFrac = app.lpTokenValue("3", "1", "2", "1");
check("LP fractional exact", lpFrac.amountA === "1.5" && lpFrac.amountB === "0.5");
near("LP fractional value in B", lpFrac.valueInB, 1, 1e-9);
/* consistency with Tool 7: redeeming a count is withdrawing that share in full */
for (const [ra, rb, sup, yours] of [["1000000", "500000", "100000", "1000"], ["1000", "250", "500", "125"], ["3", "1", "2", "1"]]) {
  const lp = app.lpTokenValue(ra, rb, sup, yours);
  const wd = app.withdrawPlan(ra, rb, lp.sharePct.toFixed(9), "100");
  check("LP matches Tool 7 full exit " + ra + "/" + rb + " " + yours + "/" + sup,
    wd !== null && lp.amountA === wd.outA && lp.amountB === wd.outB);
}
/* consistency with Tool 5: the share a deposit earns is the share its LP count would show.
   Deposit 10,000 A into 1,000,000/500,000 (Tool 5: share 0.990099...%) — a supply of
   1,000,000 growing pro-rata mints 10,000 new tokens, so yours 10,000 of 1,010,000 total */
const lpDep = app.lpTokenValue("1010000", "505000", "1010000", "10000");
near("LP deposit share matches Tool 5", lpDep.sharePct, app.depositPlan("1000000", "500000", "10000").sharePct, 1e-9);
check("LP deposit redeems the deposit back", lpDep.amountA === "10000" && lpDep.amountB === "5000");
/* dilution is the point: the same 1,000 tokens are 1% of a 100,000 supply but 0.5% of 200,000 */
check("LP share halves when supply doubles", Math.abs(app.lpTokenValue("1000000", "500000", "200000", "1000").sharePct - lp1.sharePct / 2) < 1e-12);
/* value scales with the count: double the tokens, double the redemption and the value */
const lpDbl = app.lpTokenValue("1000000", "500000", "100000", "2000");
check("LP double tokens = double redemption", lpDbl.amountA === "20000" && lpDbl.amountB === "10000" && Math.abs(lpDbl.valueInB - 2 * lp1.valueInB) < 1e-9);
check("LP rejects yours above supply", app.lpTokenValue("1000", "1000", "100", "101") === null && app.lpTokenValue("1000", "1000", "100", "100.000000001") === null);
check("LP rejects zero reserves / supply / yours", app.lpTokenValue("0", "1000", "100", "1") === null && app.lpTokenValue("1000", "0", "100", "1") === null && app.lpTokenValue("1000", "1000", "0", "1") === null && app.lpTokenValue("1000", "1000", "100", "0") === null);
check("LP rejects junk / negative / empty", app.lpTokenValue("abc", "1000", "100", "1") === null && app.lpTokenValue("1000", "1000", "100", "-1") === null && app.lpTokenValue("1000", "1000", "", "1") === null && app.lpTokenValue("1000", "1000", "100", "") === null && app.lpTokenValue("", "1000", "100", "1") === null);
check("LP rejects dust that floors to zero", app.lpTokenValue("0.000000001", "1000", "1000000", "1") === null);
check("all LP-token controls labelled", ["lp-ra", "lp-rb", "lp-supply", "lp-yours", "lp-outa", "lp-outb"].every(id => html.includes(`for="${id}"`)));
check("LP-token tool present in index.html", html.includes('id="lp-calc"') && html.includes('id="lp-result"'));
check("LP-token honesty: share shrinks as supply grows", html.includes("shrinks as new LPs deposit") && html.includes("not a live quote, not financial advice"));

/* Single-sided zap-in — zero-fee known values: s = sqrt(Ra*(Ra+X)) - Ra */
const zap0 = app.zapInPlan("1000", "1000", "100", 0);
near("ZAP zero-fee swap split", zap0.swapIn, 48.80884817015158, 1e-9);
near("ZAP zero-fee swap out", zap0.swapOut, 46.53741075440771, 1e-9);
near("ZAP zero-fee deposit A", zap0.depositA, 51.19115182984842, 1e-9);
check("ZAP deposit B is the swap out", zap0.depositB === zap0.swapOut);
near("ZAP zero-fee share pct", zap0.sharePct, 4.653741075440766, 1e-9);
/* fee 25 on the same pool: the swap leg is less efficient, so it swaps slightly more */
const zapF = app.zapInPlan("1000", "1000", "100", 25);
near("ZAP fee25 swap split", zapF.swapIn, 48.872780544104785, 1e-9);
near("ZAP fee25 swap out", zapF.swapOut, 46.48445365195502, 1e-9);
check("ZAP larger fee swaps more", zapF.swapIn > zap0.swapIn && app.zapInPlan("1000", "1000", "100", 100).swapIn > zapF.swapIn);
/* headline asymmetric pool */
const zapBig = app.zapInPlan("1000000", "500000", "10000", 25);
near("ZAP big-pool swap split", zapBig.swapIn, 4993.835366421276, 1e-6);
near("ZAP big-pool swap out", zapBig.swapOut, 2478.32995813749, 1e-6);
for (const [label, z] of [["zero-fee", zap0], ["fee25", zapF], ["big", zapBig]]) {
  near("ZAP " + label + " deposit ratio matches post-swap pool ratio", z.depositB / z.depositA, z.postSwapReserveB / z.postSwapReserveA, 1e-9);
  near("ZAP " + label + " final B reserve returns to start", z.finalReserveB, z.reserveB, 1e-6);
  near("ZAP " + label + " share same on both sides", z.depositB / z.finalReserveB * 100, z.sharePct, 1e-9);
  check("ZAP " + label + " split uses the whole holding", Math.abs(z.swapIn + z.depositA - z.amountA) < 1e-9 && z.swapIn > 0 && z.swapIn < z.amountA);
}
/* consistency with Tool 1: the swap leg is exactly Tool 1's model at the solved split */
near("ZAP swap leg matches Tool 1", Number(app.cpSwap("1000", "1000", zapF.swapIn.toFixed(9), 25).out), zapF.swapOut, 1e-4);
/* consistency with Tool 5: depositing the remaining A into the post-swap pool needs the swap's B */
near("ZAP deposit leg matches Tool 5", Number(app.depositPlan(zapF.postSwapReserveA.toFixed(6), zapF.postSwapReserveB.toFixed(6), zapF.depositA.toFixed(6)).requiredB), zapF.depositB, 1e-3);
check("ZAP rejects zero / negative reserves and holding", app.zapInPlan("0", "1000", "100", 25) === null && app.zapInPlan("1000", "0", "100", 25) === null && app.zapInPlan("1000", "1000", "0", 25) === null && app.zapInPlan("1000", "1000", "-5", 25) === null);
check("ZAP rejects bad fees", app.zapInPlan("1000", "1000", "100", -1) === null && app.zapInPlan("1000", "1000", "100", 10000) === null && app.zapInPlan("1000", "1000", "100", 2.5) === null);
check("ZAP rejects junk / empty", app.zapInPlan("abc", "1000", "100", 25) === null && app.zapInPlan("1000", "1000", "", 25) === null && app.zapInPlan("", "1000", "100", 25) === null && app.zapInPlan("1000", "1000", "100", "") === null);
check("all zap controls labelled", ["zap-ra", "zap-rb", "zap-aa", "zap-fee", "zap-swap", "zap-depb"].every(id => html.includes(`for="${id}"`)));
check("zap tool present in index.html", html.includes('id="zap-calc"') && html.includes('id="zap-result"'));
check("zap honesty: post-swap ratio and not-live labels", html.includes("post-swap") && html.includes("not a live quote, not financial advice"));

/* Single-sided zap-out — zero-fee known values: withdraw 10% of 1000/1000 in full
   (100 A + 100 B, 900/900 left), then swap the 100 B into the shallower pool:
   out = 900*100/1000 = 90 A, total 190 A against a 200 A spot value (cost 10 A, 5%) */
const zo0 = app.zapOutPlan("1000", "1000", "10", "100", 0);
check("ZOUT zero-fee feasible", zo0.feasible === true);
check("ZOUT zero-fee withdrawal leg", zo0.withdrawA === "100" && zo0.withdrawB === "100" && zo0.postWithdrawReserveA === "900" && zo0.postWithdrawReserveB === "900");
check("ZOUT zero-fee swap out", zo0.swapOutA === "90" && zo0.swapInB === "100");
check("ZOUT zero-fee total A", zo0.totalA === "190");
near("ZOUT zero-fee spot value", zo0.valueAtSpotA, 200, 1e-9);
near("ZOUT zero-fee consolidation cost", zo0.consolidationCostA, 10, 1e-9);
near("ZOUT zero-fee consolidation cost pct", zo0.consolidationCostPct, 5, 1e-9);
near("ZOUT zero-fee swap impact", zo0.priceImpactPct, 10, 1e-9);
/* fee 25 on the same exit: the swap leg nets 99.75 B in, out = 900*99.75/999.75 */
const zoF = app.zapOutPlan("1000", "1000", "10", "100", 25);
check("ZOUT fee25 swap out", zoF.swapOutA === "89.797449362" && zoF.totalA === "189.797449362");
near("ZOUT fee25 consolidation cost pct", zoF.consolidationCostPct, 5.101275319, 1e-6);
check("ZOUT larger fee costs more", zoF.consolidationCostA > zo0.consolidationCostA && app.zapOutPlan("1000", "1000", "10", "100", 100).consolidationCostA > zoF.consolidationCostA);
/* partial withdrawal: half of the same position leaves 950/950, swap 50 B -> 47.5 A */
const zoP = app.zapOutPlan("1000", "1000", "10", "50", 0);
check("ZOUT partial withdrawal leg", zoP.withdrawA === "50" && zoP.withdrawB === "50" && zoP.postWithdrawReserveA === "950");
check("ZOUT partial totals", zoP.swapOutA === "47.5" && zoP.totalA === "97.5");
/* the cost grows with your share: exiting half the whole pool costs 25% of spot value */
const zoBig = app.zapOutPlan("1000", "1000", "50", "100", 0);
check("ZOUT big-share totals", zoBig.swapOutA === "250" && zoBig.totalA === "750");
near("ZOUT big-share cost pct", zoBig.consolidationCostPct, 25, 1e-9);
check("ZOUT bigger share costs a bigger share", zoBig.consolidationCostPct > zo0.consolidationCostPct && zo0.consolidationCostPct > zoP.consolidationCostPct);
/* asymmetric pool: same percentages at 1,000,000/500,000 — spot 0.5 B per A */
const zoA = app.zapOutPlan("1000000", "500000", "10", "100", 25);
check("ZOUT asymmetric swap out", zoA.swapOutA === "89797.44936234" && zoA.totalA === "189797.44936234");
near("ZOUT asymmetric spot", zoA.spotPrice, 0.5, 1e-12);
near("ZOUT asymmetric spot value", zoA.valueAtSpotA, 200000, 1e-6);
/* consistency: the withdrawal leg IS Tool 7 and the swap leg IS Tool 1, unchanged */
for (const [label, z, args] of [["zero-fee", zo0, ["1000", "1000", "10", "100"]], ["fee25", zoF, ["1000", "1000", "10", "100"]], ["asym", zoA, ["1000000", "500000", "10", "100"]]]) {
  const wd = app.withdrawPlan(args[0], args[1], args[2], args[3]);
  check("ZOUT " + label + " withdrawal leg matches Tool 7", z.withdrawA === wd.outA && z.withdrawB === wd.outB && z.postWithdrawReserveA === wd.remainingReserveA && z.postWithdrawReserveB === wd.remainingReserveB);
  check("ZOUT " + label + " swap leg matches Tool 1", app.cpSwap(z.postWithdrawReserveB, z.postWithdrawReserveA, z.withdrawB, z.feeBps).out === z.swapOutA);
  near("ZOUT " + label + " total is withdrawal A plus swap A", Number(z.totalA), Number(z.withdrawA) + Number(z.swapOutA), 1e-9);
  check("ZOUT " + label + " consolidation never pays you", z.totalA !== null && Number(z.totalA) < z.valueAtSpotA && z.consolidationCostPct > 0 && z.consolidationCostPct < z.priceImpactPct);
}
/* honest edge: withdrawing all of a pool you own entirely leaves no pool to swap in */
const zoFull = app.zapOutPlan("1000", "1000", "100", "100", 25);
check("ZOUT full-pool exit is not feasible", zoFull.feasible === false && zoFull.swapOutA === null && zoFull.totalA === null && zoFull.withdrawA === "1000" && zoFull.withdrawB === "1000");
check("ZOUT rejects share / withdraw out of range", app.zapOutPlan("1000", "1000", "101", "100", 25) === null && app.zapOutPlan("1000", "1000", "0", "100", 25) === null && app.zapOutPlan("1000", "1000", "10", "0", 25) === null && app.zapOutPlan("1000", "1000", "10", "101", 25) === null);
check("ZOUT rejects zero reserves", app.zapOutPlan("0", "1000", "10", "100", 25) === null && app.zapOutPlan("1000", "0", "10", "100", 25) === null);
check("ZOUT rejects bad fees", app.zapOutPlan("1000", "1000", "10", "100", -1) === null && app.zapOutPlan("1000", "1000", "10", "100", 10000) === null && app.zapOutPlan("1000", "1000", "10", "100", 2.5) === null);
check("ZOUT rejects junk / empty", app.zapOutPlan("abc", "1000", "10", "100", 25) === null && app.zapOutPlan("1000", "1000", "", "100", 25) === null && app.zapOutPlan("1000", "1000", "10", "100", "") === null && app.zapOutPlan("", "1000", "10", "100", 25) === null);
check("all zout controls labelled", ["zout-ra", "zout-rb", "zout-share", "zout-pct", "zout-fee", "zout-swapout", "zout-totala"].every(id => html.includes(`for="${id}"`)));
check("zout tool present in index.html", html.includes('id="zout-calc"') && html.includes('id="zout-result"'));
check("zout honesty: post-withdrawal reserves and not-live labels", html.includes("post-withdrawal reserves") && html.includes("not a live quote, not financial advice"));

/* IL tolerance band — the exact inverse of Tool 4: its shortfall fraction is
   (sqrt(r) - 1)^2 / 2, so the edges are sqrt(r) = 1 +/- sqrt(2f).
   Headline known values: fees of 125 on a 1000 position are f = 12.5%,
   sqrt(2f) = 0.5 exactly, so the band is exactly [0.25x, 2.25x] */
const band125 = app.ilToleranceBand("1000", "125");
check("BAND 12.5% bounded both sides", band125.downUnbounded === false && band125.deposit === 1000 && band125.feesEarned === 125);
near("BAND 12.5% fee pct", band125.feePctOfDeposit, 12.5, 1e-12);
near("BAND 12.5% high edge is 2.25x", band125.priceRatioHigh, 2.25, 1e-12);
near("BAND 12.5% low edge is 0.25x", band125.priceRatioLow, 0.25, 1e-12);
near("BAND 12.5% move up", band125.moveUpPct, 125, 1e-9);
near("BAND 12.5% move down", band125.moveDownPct, 75, 1e-9);
/* small fees: f = 2% -> sqrt(2f) = 0.2 exactly -> band [0.64x, 1.44x] */
const band2 = app.ilToleranceBand("1000", "20");
near("BAND 2% high edge", band2.priceRatioHigh, 1.44, 1e-12);
near("BAND 2% low edge", band2.priceRatioLow, 0.64, 1e-12);
near("BAND 2% move up", band2.moveUpPct, 44, 1e-9);
near("BAND 2% move down", band2.moveDownPct, 36, 1e-9);
/* f = 5% on a different deposit: [0.46754446796632404x, 1.732455532033676x] */
const band5 = app.ilToleranceBand("5000", "250");
near("BAND 5% high edge", band5.priceRatioHigh, 1.732455532033676, 1e-9);
near("BAND 5% low edge", band5.priceRatioLow, 0.46754446796632404, 1e-9);
near("BAND 5% move up", band5.moveUpPct, 73.2455532033676, 1e-6);
near("BAND 5% move down", band5.moveDownPct, 53.24555320336759, 1e-6);
/* f = 0.5% -> sqrt(2f) = 0.1 exactly -> band [0.81x, 1.21x] */
const bandTiny = app.ilToleranceBand("2000", "10");
near("BAND 0.5% high edge", bandTiny.priceRatioHigh, 1.21, 1e-12);
near("BAND 0.5% low edge", bandTiny.priceRatioLow, 0.81, 1e-12);
/* the band depends only on the fee fraction, not the position size */
near("BAND scale-free", app.ilToleranceBand("250", "31.25").priceRatioHigh, band125.priceRatioHigh, 1e-12);
/* consistency with Tool 4 at both edges of every band: the fees Tool 4 says
   are needed there equal the fees given — the band can never drift from it */
for (const [label, b] of [["12.5%", band125], ["2%", band2], ["5%", band5], ["0.5%", bandTiny]]) {
  near("BAND " + label + " fees needed at high edge (Tool 4)", app.breakEvenFees(b.priceRatioHigh, String(b.deposit)).feesNeeded, b.feesEarned, 1e-6);
  near("BAND " + label + " fees needed at low edge (Tool 4)", app.breakEvenFees(b.priceRatioLow, String(b.deposit)).feesNeeded, b.feesEarned, 1e-6);
  near("BAND " + label + " symmetric in sqrt(price)", Math.sqrt(b.priceRatioHigh) - 1, 1 - Math.sqrt(b.priceRatioLow), 1e-12);
  check("BAND " + label + " band straddles the entry price", b.priceRatioLow < 1 && b.priceRatioHigh > 1);
}
/* inside the band Tool 4's shortfall is smaller than the fees; outside, larger */
check("BAND inside/outside vs Tool 4", app.breakEvenFees(1.2, "1000").feesNeeded < 20 && app.breakEvenFees(2, "1000").feesNeeded > 20 && app.breakEvenFees(0.5, "1000").feesNeeded > 20);
/* more fees always buy a wider band */
check("BAND wider with more fees", bandTiny.priceRatioHigh < band2.priceRatioHigh && band2.priceRatioHigh < band5.priceRatioHigh && band5.priceRatioHigh < band125.priceRatioHigh && band125.priceRatioLow < band5.priceRatioLow && band5.priceRatioLow < band2.priceRatioLow && band2.priceRatioLow < bandTiny.priceRatioLow);
/* honest edges: zero fees collapse the band to the entry price */
const band0 = app.ilToleranceBand("1000", "0");
check("BAND zero fees collapse to entry", band0.downUnbounded === false && band0.priceRatioHigh === 1 && band0.priceRatioLow === 1 && band0.moveUpPct === 0 && band0.moveDownPct === 0);
/* the downside caps at half the deposit: fees >= 50% can never be eaten by a
   fall (even to zero), while the upside edge stays finite and exact */
const band50 = app.ilToleranceBand("1000", "500");
check("BAND 50% fees: downside unbounded, upside exactly 4x", band50.downUnbounded === true && band50.priceRatioLow === null && band50.moveDownPct === null && Math.abs(band50.priceRatioHigh - 4) < 1e-12);
near("BAND 50% fees needed at upside edge (Tool 4)", app.breakEvenFees(band50.priceRatioHigh, "1000").feesNeeded, 500, 1e-6);
const band72 = app.ilToleranceBand("1000", "720");
check("BAND 72% fees: downside unbounded, upside 4.84x", band72.downUnbounded === true && Math.abs(band72.priceRatioHigh - 4.84) < 1e-9);
/* even a fall to (near) zero costs less than 50% of the deposit vs holding */
check("BAND downside shortfall caps at half the deposit (Tool 4)", app.breakEvenFees(0.000000001, "1000").feesNeeded < 500);
/* just under the cap the downside edge is finite but nearly zero */
const band499 = app.ilToleranceBand("1000", "499");
check("BAND 49.9% fees bounded but low edge near zero", band499.downUnbounded === false && band499.priceRatioLow > 0 && band499.priceRatioLow < 1e-5 && band499.priceRatioHigh > 3.9);
check("BAND rejects non-positive deposit", app.ilToleranceBand("0", "10") === null && app.ilToleranceBand("-100", "10") === null);
check("BAND rejects negative fees", app.ilToleranceBand("1000", "-1") === null);
check("BAND rejects junk / empty", app.ilToleranceBand("abc", "10") === null && app.ilToleranceBand("1000", "xyz") === null && app.ilToleranceBand("", "10") === null && app.ilToleranceBand("1000", "") === null && app.ilToleranceBand(null, "10") === null);
check("all band controls labelled", ["band-dep", "band-fees", "band-high", "band-low"].every(id => html.includes(`for="${id}"`)));
check("band tool present in index.html", html.includes('id="band-calc"') && html.includes('id="band-result"'));
check("band honesty: sqrt-price band and not-live labels", html.includes("square root") && html.includes("not a live quote, not financial advice"));

/* ---------- 22 · CLMM symmetric-range (±%) planner ---------- */
/* headline: price 1, ±25% width, 100 A — the multiplicative range is
   exactly Tool 8's headline 0.8–1.25, so the plan must be Tool 8's own */
const sym1 = app.clmmSymmetricRange("1", "25", "100", "");
near("SYM headline lower is 0.8", sym1.effLower, 0.8, 1e-12);
near("SYM headline upper is 1.25", sym1.effUpper, 1.25, 1e-12);
near("SYM headline required B", sym1.requiredB, 100, 1e-9);
near("SYM headline liquidity", sym1.liquidity, 947.2135955, 0.000001);
check("SYM headline ticks", sym1.tickLower === -2232 && sym1.tickUpper === 2231);
check("SYM headline not snapped without spacing", sym1.snapped === false && sym1.spacing === null);
near("SYM headline up room is +25%", sym1.upRoomPct, 25, 1e-9);
near("SYM headline down room is -20%, not -25%", sym1.downRoomPct, 20, 1e-9);
/* consistency with Tool 8, exactly: the plan IS clmmRangePlan on the
   effective range, at headline and arbitrary inputs alike */
for (const [p, w, a] of [["1", "25", "100"], ["2", "25", "50"], ["0.5", "10", "250"], ["150.5", "40", "3"]]) {
  const sym = app.clmmSymmetricRange(p, w, a, "");
  const t8 = app.clmmRangePlan(p, String(sym.effLower), String(sym.effUpper), a);
  check("SYM plan equals Tool 8 @" + p + " ±" + w + "%", sym !== null && t8 !== null && sym.requiredB === t8.requiredB && sym.liquidity === t8.liquidity);
  check("SYM range straddles price multiplicatively @" + p + " ±" + w + "%",
    Math.abs(sym.effUpper / Number(p) - Number(p) / sym.effLower) < 1e-9 && sym.effLower < Number(p) && Number(p) < sym.effUpper);
}
/* ±100% width: range 0.5–2, the wide-range liquidity of Tool 8's checks */
const sym100 = app.clmmSymmetricRange("1", "100", "100", "");
near("SYM 100% lower/upper", sym100.effLower + sym100.effUpper, 2.5, 1e-12);
near("SYM 100% liquidity", sym100.liquidity, 341.4213562, 0.000001);
near("SYM 100% down room is -50%", sym100.downRoomPct, 50, 1e-9);
/* wider width = more room both sides, less liquidity for the same deposit */
const sym10 = app.clmmSymmetricRange("1", "10", "100", "");
check("SYM wider range = more room, lower liquidity", sym10.upRoomPct < sym1.upRoomPct && sym100.upRoomPct > sym1.upRoomPct && sym10.liquidity > sym1.liquidity && sym1.liquidity > sym100.liquidity);
/* price scale-invariance: at price 2 the same ±25% / half the A deposit
   needs the same B (100) — the range scales with the price */
near("SYM price-2 required B", app.clmmSymmetricRange("2", "25", "50", "").requiredB, 100, 1e-9);
/* tick spacing: edges snap OUTWARD (lower down, upper up) to spacing
   multiples before planning — 0.8/-2232 -> -2240, 1.25/2231 -> 2240 —
   and the plan equals Tool 8 on the snapped range's tick prices */
const symSnap = app.clmmSymmetricRange("1", "25", "100", "10");
check("SYM snapped flag and ticks", symSnap.snapped === true && symSnap.spacing === 10 && symSnap.tickLower === -2240 && symSnap.tickUpper === 2240);
near("SYM snapped lower price", symSnap.effLower, 0.7993240861522392, 1e-12);
near("SYM snapped upper price", symSnap.effUpper, 1.2510570084454333, 1e-12);
check("SYM snapping widens the range", symSnap.effLower < sym1.effLower && symSnap.effUpper > sym1.effUpper);
const t8Snap = app.clmmRangePlan("1", String(app.tickToPrice(-2240)), String(app.tickToPrice(2240)), "100");
check("SYM snapped plan equals Tool 8 on snapped range", symSnap.requiredB === t8Snap.requiredB && symSnap.liquidity === t8Snap.liquidity);
near("SYM snapped liquidity", symSnap.liquidity, 943.8348765987731, 1e-9);
/* spacing 1 leaves the ticks themselves unchanged */
const symS1 = app.clmmSymmetricRange("1", "25", "100", "1");
check("SYM spacing 1 not flagged snapped", symS1.snapped === false && symS1.tickLower === -2232 && symS1.tickUpper === 2231);
check("SYM rejects zero / negative width", app.clmmSymmetricRange("1", "0", "100", "") === null && app.clmmSymmetricRange("1", "-5", "100", "") === null);
check("SYM rejects zero price / deposit", app.clmmSymmetricRange("0", "25", "100", "") === null && app.clmmSymmetricRange("1", "25", "0", "") === null);
check("SYM rejects width beyond the standard tick range", app.clmmSymmetricRange("1", "1e30", "100", "") === null);
check("SYM rejects bad spacing", app.clmmSymmetricRange("1", "25", "100", "0") === null && app.clmmSymmetricRange("1", "25", "100", "-10") === null && app.clmmSymmetricRange("1", "25", "100", "2.5") === null && app.clmmSymmetricRange("1", "25", "100", "x") === null);
check("SYM rejects junk / empty", app.clmmSymmetricRange("x", "25", "100", "") === null && app.clmmSymmetricRange("1", "x", "100", "") === null && app.clmmSymmetricRange("", "25", "100", "") === null && app.clmmSymmetricRange("1", "", "100", "") === null && app.clmmSymmetricRange("1", "25", "", "") === null);
check("all sym controls labelled", ["sym-price", "sym-width", "sym-aa", "sym-spacing", "sym-reqb"].every(id => html.includes(`for="${id}"`)));
check("sym tool present in index.html", html.includes('id="sym-calc"') && html.includes('id="sym-result"'));
check("sym honesty: multiplicative range and not-live labels", html.includes("multiplicatively") && html.includes("not a live quote, not financial advice"));

/* ---------- 23 · Two-hop swap model ---------- */
/* headline vectors verified against Tool 1 in a clean foreground run
   BEFORE these tests were written: 100 A into 1000/1000 (25 bps) pays
   90.70243237 M; that into 1000/2000 (25 bps) pays 165.937999822 C */
const hop1 = app.twoHopSwap("1000", "1000", "1000", "2000", "100", 25, 25);
check("HOP headline mid out", hop1.midOut === "90.70243237");
check("HOP headline final out", hop1.out === "165.937999822");
near("HOP headline combined spot is the product", hop1.spotPrice, 2, 1e-12);
near("HOP headline effective price", hop1.effectivePrice, 1.65937999822, 1e-12);
near("HOP headline hop1 impact", hop1.hop1ImpactPct, 9.29756763, 1e-9);
near("HOP headline hop2 impact", hop1.hop2ImpactPct, 8.526157741231478, 1e-9);
near("HOP headline combined impact", hop1.priceImpactPct, 17.031000089, 1e-9);
/* combined impact is exactly the composition of the hops' impacts:
   1 - (1 - i1)(1 - i2), and so worse than either hop alone */
near("HOP combined impact composes the hops", hop1.priceImpactPct, (1 - (1 - hop1.hop1ImpactPct / 100) * (1 - hop1.hop2ImpactPct / 100)) * 100, 1e-9);
check("HOP combined worse than either hop", hop1.priceImpactPct > hop1.hop1ImpactPct && hop1.priceImpactPct > hop1.hop2ImpactPct);
/* both legs ARE Tool 1, exactly: midOut is cpSwap on pool 1 and the
   final out is cpSwap on pool 2 fed that exact string, at headline
   and arbitrary inputs alike */
for (const [r1i, r1o, r2i, r2o, a, f1, f2] of [["1000", "1000", "1000", "2000", "100", 25, 25], ["5000", "2500", "800", "4000", "37.5", 25, 100], ["100000", "100000", "100000", "100000", "1000", 5, 5], ["250", "1000", "3000", "750", "12.25", 0, 30]]) {
  const route = app.twoHopSwap(r1i, r1o, r2i, r2o, a, f1, f2);
  const leg1 = app.cpSwap(r1i, r1o, a, f1);
  const leg2 = app.cpSwap(r2i, r2o, leg1.out, f2);
  check("HOP legs equal Tool 1 @" + a + " in", route !== null && route.midOut === leg1.out && route.out === leg2.out);
  near("HOP combined composes @" + a + " in", route.priceImpactPct, (1 - (1 - route.hop1ImpactPct / 100) * (1 - route.hop2ImpactPct / 100)) * 100, 1e-9);
}
/* zero fees on both hops: 100 -> 90.909090909 -> 83.333333333 */
const hop0 = app.twoHopSwap("1000", "1000", "1000", "1000", "100", 0, 0);
check("HOP zero-fee mid / out", hop0.midOut === "90.909090909" && hop0.out === "83.333333333");
near("HOP zero-fee combined impact", hop0.priceImpactPct, 16.666666667, 1e-9);
/* a shallow second pool dominates the route: hop 2's impact dwarfs
   hop 1's and the combined impact follows it */
const hopShallow = app.twoHopSwap("1000", "1000", "10", "10", "100", 25, 25);
check("HOP shallow hop2 out", hopShallow.out === "9.004734243");
check("HOP shallow hop2 dominates", hopShallow.hop2ImpactPct > 90 && hopShallow.hop2ImpactPct > hopShallow.hop1ImpactPct && hopShallow.priceImpactPct > hopShallow.hop2ImpactPct);
/* deeper pools on both hops route the same trade with less impact */
const hopDeep = app.twoHopSwap("10000", "10000", "10000", "20000", "100", 25, 25);
check("HOP deeper pools = less combined impact", hopDeep.priceImpactPct < hop1.priceImpactPct && Number(hopDeep.out) > Number(hop1.out));
/* raising only pool 2's fee leaves hop 1 untouched and worsens hop 2 */
const hopFee2 = app.twoHopSwap("1000", "1000", "1000", "2000", "100", 25, 100);
check("HOP fee2 leaves hop 1 alone, worsens the route", hopFee2.midOut === hop1.midOut && Number(hopFee2.out) < Number(hop1.out));
check("HOP rejects zero / negative reserves or amount", app.twoHopSwap("0", "1000", "1000", "2000", "100", 25, 25) === null && app.twoHopSwap("1000", "1000", "1000", "0", "100", 25, 25) === null && app.twoHopSwap("1000", "1000", "1000", "2000", "0", 25, 25) === null);
check("HOP rejects bad fees on either hop", app.twoHopSwap("1000", "1000", "1000", "2000", "100", 10000, 25) === null && app.twoHopSwap("1000", "1000", "1000", "2000", "100", 25, -1) === null && app.twoHopSwap("1000", "1000", "1000", "2000", "100", 25, 2.5) === null);
check("HOP rejects dust that hop 1 rounds to zero", app.twoHopSwap("1000", "1000", "1000", "2000", "0.000000001", 25, 25) === null);
check("HOP rejects junk / empty", app.twoHopSwap("x", "1000", "1000", "2000", "100", 25, 25) === null && app.twoHopSwap("1000", "1000", "1000", "2000", "", 25, 25) === null && app.twoHopSwap("1000", "", "1000", "2000", "100", 25, 25) === null);
check("all hop controls labelled", ["hop-r1in", "hop-r1out", "hop-r2in", "hop-r2out", "hop-ain", "hop-fee1", "hop-fee2", "hop-mid", "hop-aout"].every(id => html.includes(`for="${id}"`)));
check("hop tool present in index.html", html.includes('id="hop-calc"') && html.includes('id="hop-result"'));
check("hop honesty: routed model and not-live labels", html.includes("no routing search is done") && html.includes("not a live quote, not financial advice"));

/* ---------- 24 · Net LP return calculator ---------- */
/* headline vectors verified in a clean foreground run BEFORE these
   tests were written: r=2, deposit $1000 — hold $1500, LP
   $1414.2135623730951, fees needed $85.7864376269049 (Tool 4) */
const net0 = app.netLpReturn(2, "1000", "0");
near("NET no-fees hold value", net0.holdValue, 1500, 1e-9);
near("NET no-fees LP value", net0.lpValue, 1414.2135623730951, 1e-9);
near("NET no-fees hurdle", net0.feesNeeded, 85.7864376269049, 1e-9);
near("NET no-fees net vs hold", net0.netVsHold, -85.7864376269049, 1e-9);
near("NET no-fees net vs hold pct", net0.netVsHoldPct, -5.71909584179366, 1e-9);
check("NET no-fees verdict is behind", net0.verdict === "behind");
near("NET no-fees coverage is 0%", net0.feesCoveragePct, 0, 1e-12);
/* the honest twist the tool exists to surface: UP on the deposit
   (+41.42%) and still BEHIND holding at the same time */
near("NET no-fees return on deposit is +41.42%", net0.netReturnPct, 41.42135623730951, 1e-9);
check("NET up on deposit yet behind holding", net0.netReturnPct > 0 && net0.netVsHold < 0);
/* $200 of fees flips the same move ahead: net $1614.21, +$114.21 */
const net200 = app.netLpReturn(2, "1000", "200");
near("NET $200 fees net LP value", net200.netLpValue, 1614.2135623730951, 1e-9);
near("NET $200 fees net vs hold", net200.netVsHold, 114.2135623730951, 1e-9);
near("NET $200 fees net vs hold pct", net200.netVsHoldPct, 7.614237491539673, 1e-9);
near("NET $200 fees coverage", net200.feesCoveragePct, 233.13708498984775, 1e-6);
check("NET $200 fees verdict is ahead", net200.verdict === "ahead");
/* earning exactly Tool 4's hurdle settles exactly even */
const hurdle = app.breakEvenFees(2, "1000");
const netEven = app.netLpReturn(2, "1000", String(hurdle.feesNeeded));
check("NET fees = Tool 4 hurdle settles even", netEven.verdict === "even" && Math.abs(netEven.netVsHold) < 1e-6);
near("NET even coverage is 100%", netEven.feesCoveragePct, 100, 1e-6);
/* half the hurdle: behind by the other half, coverage 50% */
const netHalf = app.netLpReturn(2, "1000", String(hurdle.feesNeeded / 2));
near("NET half-hurdle coverage is 50%", netHalf.feesCoveragePct, 50, 1e-6);
near("NET half-hurdle shortfall is half the hurdle", netHalf.netVsHold, -hurdle.feesNeeded / 2, 1e-6);
check("NET half-hurdle verdict is behind", netHalf.verdict === "behind");
/* no price move: no hurdle at all — $0 fees is even, any fees ahead,
   and coverage is honestly null (there is nothing to cover) */
const netFlat0 = app.netLpReturn(1, "1000", "0");
check("NET flat move, no fees: even, coverage null", netFlat0.verdict === "even" && netFlat0.feesNeeded === 0 && netFlat0.feesCoveragePct === null);
const netFlat = app.netLpReturn(1, "1000", "50");
check("NET flat move, $50 fees: ahead by the fees", netFlat.verdict === "ahead" && netFlat.netVsHold === 50 && netFlat.netReturnPct === 5);
/* 4x move: hold $2500, LP $2000, hurdle $500 — $500 of fees is even */
const net4 = app.netLpReturn(4, "1000", "500");
check("NET 4x with $500 fees settles even", net4.verdict === "even" && net4.holdValue === 2500 && net4.lpValue === 2000);
/* composition, exactly: hold/LP values ARE Tool 2's and the verdict IS
   fees minus Tool 4's hurdle, at headline and arbitrary inputs alike */
for (const [r, d, f] of [[2, "1000", "200"], [0.5, "1000", "10"], [3.7, "2500", "123.45"], [0.25, "750", "0"], [1.5, "10000", "999.99"]]) {
  const net = app.netLpReturn(r, d, f);
  const il = app.impermanentLoss(r, d);
  const be = app.breakEvenFees(r, d);
  check("NET composes Tools 2+4 @" + r + "x", net !== null && net.holdValue === il.holdValue && net.lpValue === il.lpValue &&
    Math.abs(net.netVsHold - (Number(f) - be.feesNeeded)) < 1e-6 && Math.abs(net.netLpValue - (il.lpValue + Number(f))) < 1e-9);
}
/* IL symmetry carries through: a halving costs exactly what a doubling
   costs at the same deposit fraction — same IL%, mirrored values */
const netDown = app.netLpReturn(0.5, "1000", "0");
near("NET halving IL% equals doubling IL%", netDown.ilPct, net0.ilPct, 1e-9);
near("NET halving hurdle", netDown.feesNeeded, 42.89321881345245, 1e-9);
/* more fees never moves the hurdle or the hold/LP values — only the verdict */
const netMore = app.netLpReturn(2, "1000", "100000");
check("NET fees don't move hold/LP/hurdle", netMore.holdValue === net0.holdValue && netMore.lpValue === net0.lpValue && netMore.feesNeeded === net0.feesNeeded && netMore.verdict === "ahead");
check("NET rejects bad price multiple", app.netLpReturn(0, "1000", "10") === null && app.netLpReturn(-2, "1000", "10") === null && app.netLpReturn("x", "1000", "10") === null);
check("NET rejects bad deposit", app.netLpReturn(2, "0", "10") === null && app.netLpReturn(2, "", "10") === null && app.netLpReturn(2, "abc", "10") === null);
check("NET rejects bad fees", app.netLpReturn(2, "1000", "-1") === null && app.netLpReturn(2, "1000", "xyz") === null && app.netLpReturn(2, "1000", "") === null && app.netLpReturn(2, "1000", null) === null);
check("all net controls labelled", ["net-ratio", "net-deposit", "net-fees", "net-out"].every(id => html.includes(`for="${id}"`)));
check("net tool present in index.html", html.includes('id="net-calc"') && html.includes('id="net-result"'));
check("net honesty: still-behind-holding and not-live labels", html.includes("still behind holding") && html.includes("not a live quote, not financial advice"));

/* ---------- 25 · CLMM capital-efficiency calculator ---------- */
/* headline vectors verified in a clean foreground run BEFORE these
   tests were written: L=1000 in 0.8-1.25 at price 1 — ranged position
   holds 105.57280900008415 of each token (Tool 9), worth
   211.1456180001683 B; a full-range position with the same L holds
   1000 of each, worth 2000 B; efficiency 9.472135954999576 */
const eff1 = app.clmmCapitalEfficiency("1000", "0.8", "1.25", "1");
near("EFF headline ranged amount A", eff1.rangeAmountA, 105.57280900008415, 1e-9);
near("EFF headline ranged amount B", eff1.rangeAmountB, 105.57280900008415, 1e-9);
near("EFF headline ranged value", eff1.rangeValueB, 211.1456180001683, 1e-9);
near("EFF headline full amount A", eff1.fullAmountA, 1000, 1e-12);
near("EFF headline full amount B", eff1.fullAmountB, 1000, 1e-12);
near("EFF headline full value", eff1.fullValueB, 2000, 1e-9);
near("EFF headline efficiency", eff1.efficiency, 9.472135954999576, 1e-9);
near("EFF headline capital saved", eff1.capitalSavedPct, 89.44271909999159, 1e-9);
/* the closed form for a geometrically centred range: upper = P*m,
   lower = P/m gives efficiency exactly 1 / (1 - 1/sqrt(m)) */
near("EFF matches closed form 1/(1-1/sqrt(m))", eff1.efficiency, 1 / (1 - 1 / Math.sqrt(1.25)), 1e-12);
/* the same multiple at a different price scale: 1.6-2.5 at price 2 is
   the same m = 1.25 geometry, so the efficiency is the same number */
const effGeo = app.clmmCapitalEfficiency("500", "1.6", "2.5", "2");
near("EFF geometric scaling keeps efficiency", effGeo.efficiency, eff1.efficiency, 1e-9);
/* efficiency is a property of the range and price, not of L: the same
   range at L=250 quotes the same multiple as at L=1000 */
const effSmall = app.clmmCapitalEfficiency("250", "0.8", "1.25", "1");
near("EFF efficiency independent of L", effSmall.efficiency, eff1.efficiency, 1e-12);
near("EFF capital scales with L", effSmall.rangeValueB, eff1.rangeValueB / 4, 1e-9);
/* composition: the ranged holdings ARE Tool 9's at the same inputs,
   and feeding Tool 8's own planned liquidity returns Tool 8's exact
   deposit amounts — the tool can never drift from its own forms */
for (const [l, lo, up, p] of [["1000", "0.8", "1.25", "1"], ["500", "1.6", "2.5", "2"], ["777.5", "0.5", "3", "1.1"], ["250", "90", "110", "100"]]) {
  const e = app.clmmCapitalEfficiency(l, lo, up, p);
  const pos = app.clmmPositionAtPrice(l, lo, up, p);
  check("EFF composes Tool 9 @" + p, e !== null && pos !== null && e.rangeAmountA === pos.amountA && e.rangeAmountB === pos.amountB && e.rangeValueB === pos.valueInB);
}
const effPlan = app.clmmRangePlan("1", "0.8", "1.25", "100");
const effFromPlan = app.clmmCapitalEfficiency(String(effPlan.liquidity), "0.8", "1.25", "1");
check("EFF Tool 8 liquidity returns Tool 8 deposits", effFromPlan.rangeAmountA === effPlan.amountA && effFromPlan.rangeAmountB === effPlan.requiredB);
/* full-range holdings are the ranged formulas at the limits: exactly
   L/sqrt(P) of A and L*sqrt(P) of B, worth 2*L*sqrt(P) in B */
for (const [l, lo, up, p] of [["1000", "0.8", "1.25", "1"], ["500", "1.6", "2.5", "2"], ["250", "90", "110", "100"]]) {
  const e = app.clmmCapitalEfficiency(l, lo, up, p);
  near("EFF full-range identity @" + p, e.fullValueB, 2 * Number(l) * Math.sqrt(Number(p)), 1e-6);
  check("EFF full range always costs more @" + p, e.efficiency > 1 && e.capitalSavedPct > 0 && e.capitalSavedPct < 100);
}
/* narrower range = more efficiency, wider = less, and a very wide
   range tends to the full-range 1x: 0.01-100 at price 1 is 10/9 */
const effNarrow = app.clmmCapitalEfficiency("1000", "0.9", "1.111111111", "1");
const effWide = app.clmmCapitalEfficiency("1000", "0.01", "100", "1");
check("EFF narrower range is more efficient", effNarrow.efficiency > eff1.efficiency && eff1.efficiency > effWide.efficiency);
near("EFF wide-range efficiency tends to 1", effWide.efficiency, 10 / 9, 1e-9);
/* off-centre inside the range still quotes, and differs from centred:
   at price 1.1 in 0.8-1.25 the multiple is 9.564161970472108 */
const effOff = app.clmmCapitalEfficiency("1000", "0.8", "1.25", "1.1");
near("EFF off-centre efficiency", effOff.efficiency, 9.564161970472108, 1e-9);
check("EFF rejects price at or outside the edges", app.clmmCapitalEfficiency("1000", "0.8", "1.25", "0.8") === null && app.clmmCapitalEfficiency("1000", "0.8", "1.25", "1.25") === null && app.clmmCapitalEfficiency("1000", "0.8", "1.25", "0.5") === null && app.clmmCapitalEfficiency("1000", "0.8", "1.25", "2") === null);
check("EFF rejects bad liquidity", app.clmmCapitalEfficiency("0", "0.8", "1.25", "1") === null && app.clmmCapitalEfficiency("-5", "0.8", "1.25", "1") === null && app.clmmCapitalEfficiency("", "0.8", "1.25", "1") === null);
check("EFF rejects bad range / price", app.clmmCapitalEfficiency("1000", "1.25", "0.8", "1") === null && app.clmmCapitalEfficiency("1000", "1", "1", "1") === null && app.clmmCapitalEfficiency("1000", "0", "1.25", "1") === null && app.clmmCapitalEfficiency("1000", "0.8", "1.25", "0") === null);
check("EFF rejects junk", app.clmmCapitalEfficiency("x", "0.8", "1.25", "1") === null && app.clmmCapitalEfficiency("1000", "x", "1.25", "1") === null && app.clmmCapitalEfficiency("1000", "0.8", "1.25", "") === null);
check("all eff controls labelled", ["eff-l", "eff-lower", "eff-upper", "eff-price", "eff-out"].every(id => html.includes(`for="${id}"`)));
check("eff tool present in index.html", html.includes('id="eff-calc"') && html.includes('id="eff-result"'));
check("eff honesty: not-free-money and not-live labels", html.includes("not free money") && html.includes("no efficiency is quoted"));

/* ---------- 26 · Pool depth planner ---------- */
/* headline vectors verified in a clean foreground run BEFORE these
   tests were written: trade 100 at a 10% cap, spot 2, fee 25 bps —
   reserveIn 920.7692307692308, reserveOut 1841.5384615384617, and the
   trade returns exactly 180 (effective price = spot x (1 - cap)) */
const dep1 = app.poolDepthPlan("100", "10", "2", 25);
check("DEPTH headline feasible", dep1 !== null && dep1.feasible === true);
near("DEPTH headline reserveIn", dep1.reserveIn, 920.7692307692308, 1e-9);
near("DEPTH headline reserveOut", dep1.reserveOut, 1841.5384615384617, 1e-9);
near("DEPTH headline amountOut", dep1.amountOut, 180, 1e-9);
near("DEPTH headline effective price", dep1.effectivePrice, 1.8, 1e-12);
near("DEPTH headline actual impact is the cap", dep1.actualImpactPct, 10, 1e-9);
near("DEPTH headline post-trade spot", dep1.postTradeSpotPrice, 1.6281304765673583, 1e-9);
near("DEPTH reserveOut is reserveIn x spot", dep1.reserveOut, dep1.reserveIn * 2, 1e-9);
near("DEPTH total value in input terms", dep1.totalValueIn, dep1.reserveIn + dep1.reserveOut / dep1.spotPrice, 1e-9);
/* clean zero-fee vectors: cap 10% at spot 1 needs 900/900 and returns
   exactly 90; cap 50% at spot 4 needs 50/200 and returns exactly 100 */
const depZero = app.poolDepthPlan("100", "10", "1", 0);
near("DEPTH zero-fee reserveIn", depZero.reserveIn, 900, 1e-12);
near("DEPTH zero-fee reserveOut", depZero.reserveOut, 900, 1e-12);
near("DEPTH zero-fee amountOut", depZero.amountOut, 90, 1e-12);
const depHalf = app.poolDepthPlan("50", "50", "4", 0);
near("DEPTH 50% cap reserveIn", depHalf.reserveIn, 50, 1e-12);
near("DEPTH 50% cap reserveOut", depHalf.reserveOut, 200, 1e-12);
near("DEPTH 50% cap amountOut", depHalf.amountOut, 100, 1e-12);
/* composition: a pool funded to the planned depth, traded through
   Tool 1's own model, lands on the cap; and Tool 17 sized against
   that same pool hands the original trade amount back — the two
   tools can never drift from each other */
for (const [amt, cap, spot, fee] of [["100", "10", "2", 25], ["100", "10", "1", 0], ["50", "50", "4", 0], ["10", "1", "0.5", 25], ["1000", "5", "0.02", 100]]) {
  const d = app.poolDepthPlan(amt, cap, spot, fee);
  const sw = app.cpSwap(d.reserveIn.toFixed(9), d.reserveOut.toFixed(9), amt, fee);
  check("DEPTH Tool 1 lands on cap @" + cap + "/" + spot, sw !== null && Math.abs(sw.priceImpactPct - Number(cap)) < 1e-6);
  const sz = app.priceImpactSizer(d.reserveIn.toFixed(9), d.reserveOut.toFixed(9), cap, fee);
  check("DEPTH Tool 17 inverts it @" + cap + "/" + spot, sz !== null && sz.feasible && Math.abs(sz.maxAmountIn - Number(amt)) < 1e-6);
}
/* depth scales linearly with the trade, and a tighter cap needs a
   deeper pool for the same trade */
const depDouble = app.poolDepthPlan("200", "10", "2", 25);
near("DEPTH doubling the trade doubles reserveIn", depDouble.reserveIn, dep1.reserveIn * 2, 1e-9);
near("DEPTH doubling the trade doubles reserveOut", depDouble.reserveOut, dep1.reserveOut * 2, 1e-9);
const depTight = app.poolDepthPlan("100", "1", "2", 25);
check("DEPTH tighter cap needs deeper pool", depTight.reserveIn > dep1.reserveIn && depTight.reserveOut > dep1.reserveOut);
/* a cap at or below the fee admits no trade at any depth */
check("DEPTH cap equal to fee is infeasible", app.poolDepthPlan("100", "0.25", "2", 25).feasible === false);
check("DEPTH cap below fee is infeasible", app.poolDepthPlan("100", "0.1", "2", 25).feasible === false && app.poolDepthPlan("100", "0.1", "2", 25).reserveIn === 0);
check("DEPTH rejects bad trade amount", app.poolDepthPlan("0", "10", "2", 25) === null && app.poolDepthPlan("-5", "10", "2", 25) === null && app.poolDepthPlan("", "10", "2", 25) === null);
check("DEPTH rejects bad cap", app.poolDepthPlan("100", "0", "2", 25) === null && app.poolDepthPlan("100", "100", "2", 25) === null && app.poolDepthPlan("100", "-1", "2", 25) === null);
check("DEPTH rejects bad spot", app.poolDepthPlan("100", "10", "0", 25) === null && app.poolDepthPlan("100", "10", "-2", 25) === null && app.poolDepthPlan("100", "10", "", 25) === null);
check("DEPTH rejects bad fee", app.poolDepthPlan("100", "10", "2", -1) === null && app.poolDepthPlan("100", "10", "2", 10000) === null && app.poolDepthPlan("100", "10", "2", 2.5) === null);
check("DEPTH rejects junk", app.poolDepthPlan("x", "10", "2", 25) === null && app.poolDepthPlan("100", "x", "2", 25) === null && app.poolDepthPlan("100", "10", "2", null) === null);
check("all depth controls labelled", ["depth-ain", "depth-cap", "depth-spot", "depth-fee", "depth-rin", "depth-rout"].every(id => html.includes(`for="${id}"`)));
check("depth tool present in index.html", html.includes('id="depth-calc"') && html.includes('id="depth-result"'));
check("depth honesty: not-a-safe-pool and not-live labels", html.includes("a deeper pool is not a safe pool") && html.includes("not a live quote, not financial advice"));

console.log(failures === 0 ? "\nALL TESTS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
