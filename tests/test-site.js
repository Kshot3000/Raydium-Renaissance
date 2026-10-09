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
check("cache keys present", html.includes("styles.css?v=1") && html.includes("app.js?v=63"));
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

/* ---------- 27 · Post-move reserves calculator ---------- */
/* known values: reserves 1000/1000, price x4 => A 1000/2=500, B 1000*2=2000,
   new price 4, pool value 500*4+2000=4000 B vs hold 1000*4+1000=5000 B */
const mv1 = app.cpReservesAfterMove("1000", "1000", 4);
near("MOVE headline new reserve A", mv1.newReserveA, 500, 1e-12);
near("MOVE headline new reserve B", mv1.newReserveB, 2000, 1e-12);
near("MOVE headline delta A", mv1.deltaA, -500, 1e-12);
near("MOVE headline delta B", mv1.deltaB, 1000, 1e-12);
near("MOVE headline start price", mv1.startPrice, 1, 1e-12);
near("MOVE headline new price", mv1.newPrice, 4, 1e-12);
near("MOVE headline LP value in B", mv1.lpValueInB, 4000, 1e-9);
near("MOVE headline hold value in B", mv1.holdValueInB, 5000, 1e-9);
near("MOVE headline IL matches Tool 2 at 4x", mv1.ilPct, -20, 1e-9);
near("MOVE k preserved at 4x", mv1.newK, mv1.k, 1e-6);
/* no move: reserves untouched */
const mv0 = app.cpReservesAfterMove("1000", "1000", 1);
near("MOVE no move keeps reserve A", mv0.newReserveA, 1000, 1e-12);
near("MOVE no move keeps reserve B", mv0.newReserveB, 1000, 1e-12);
near("MOVE no move IL is 0", mv0.ilPct, 0, 1e-12);
/* halving mirrors quadrupling: 1000/1000 @0.25 => 2000 A / 500 B, same -20% */
const mvH = app.cpReservesAfterMove("1000", "1000", 0.25);
near("MOVE quarter new reserve A", mvH.newReserveA, 2000, 1e-12);
near("MOVE quarter new reserve B", mvH.newReserveB, 500, 1e-12);
near("MOVE quarter IL equals 4x IL", mvH.ilPct, mv1.ilPct, 1e-9);
/* doubling: 1000/1000 @2 => 707.106... A / 1414.213... B */
const mv2 = app.cpReservesAfterMove("1000", "1000", 2);
near("MOVE double new reserve A", mv2.newReserveA, 707.1067811865474, 1e-9);
near("MOVE double new reserve B", mv2.newReserveB, 1414.213562373095, 1e-9);
/* asymmetric reserves 2,000,000 / 500,000 (spot 0.25) @2 => spot 0.5 */
const mvA = app.cpReservesAfterMove("2000000", "500000", 2);
near("MOVE asymmetric start price", mvA.startPrice, 0.25, 1e-12);
near("MOVE asymmetric new price", mvA.newPrice, 0.5, 1e-12);
near("MOVE asymmetric new reserve A", mvA.newReserveA, 1414213.562373095, 1e-6);
near("MOVE asymmetric new reserve B", mvA.newReserveB, 707106.7811865476, 1e-6);
near("MOVE asymmetric LP value in B", mvA.lpValueInB, 1414213.5623730952, 1e-6);
near("MOVE asymmetric hold value in B", mvA.holdValueInB, 1500000, 1e-9);
/* clean small vector: reserves 3/1 @9 => exactly 1 A / 3 B, IL -40% */
const mv9 = app.cpReservesAfterMove("3", "1", 9);
near("MOVE 9x new reserve A exact", mv9.newReserveA, 1, 1e-12);
near("MOVE 9x new reserve B exact", mv9.newReserveB, 3, 1e-12);
near("MOVE 9x IL", mv9.ilPct, -40, 1e-9);
/* composition: lpVsHold and ilPct are Tool 2's own figures at every move,
   and the new reserves sit exactly on x*y=k at the new price */
for (const r of [0.1, 0.25, 0.5, 1.5, 2, 3.7, 4, 10]) {
  const m = app.cpReservesAfterMove("12345", "6789", r);
  const t2 = app.impermanentLoss(r);
  check("MOVE composes Tool 2 @" + r, m !== null && Math.abs(m.lpVsHold - t2.lpVsHold) < 1e-12 && Math.abs(m.ilPct - t2.ilPct) < 1e-12);
  check("MOVE k preserved @" + r, Math.abs(m.newK - m.k) / m.k < 1e-12);
  check("MOVE new reserves price at new price @" + r, Math.abs(m.newReserveB / m.newReserveA - m.newPrice) / m.newPrice < 1e-12);
}
/* direction: a rise sells A and gains B; a fall buys A and spends B */
check("MOVE rise sells A, gains B", mv2.deltaA < 0 && mv2.deltaB > 0);
check("MOVE fall buys A, spends B", app.cpReservesAfterMove("1000", "1000", 0.5).deltaA > 0 && app.cpReservesAfterMove("1000", "1000", 0.5).deltaB < 0);
/* scaling all reserves scales the result, not the IL */
near("MOVE 10x reserves IL unchanged", app.cpReservesAfterMove("10000", "10000", 2).ilPct, mv2.ilPct, 1e-12);
near("MOVE 10x reserves new A scaled", app.cpReservesAfterMove("10000", "10000", 2).newReserveA, mv2.newReserveA * 10, 1e-6);
check("MOVE rejects bad reserves", app.cpReservesAfterMove("0", "1000", 2) === null && app.cpReservesAfterMove("1000", "0", 2) === null && app.cpReservesAfterMove("-5", "1000", 2) === null && app.cpReservesAfterMove("", "1000", 2) === null);
check("MOVE rejects bad multiple", app.cpReservesAfterMove("1000", "1000", 0) === null && app.cpReservesAfterMove("1000", "1000", -2) === null && app.cpReservesAfterMove("1000", "1000", "") === null);
check("MOVE rejects junk", app.cpReservesAfterMove("x", "1000", 2) === null && app.cpReservesAfterMove("1000", "1000", "x") === null && app.cpReservesAfterMove("1000", "1000", null) === null);
check("all move controls labelled", ["move-ra", "move-rb", "move-ratio", "move-na", "move-nb"].every(id => html.includes(`for="${id}"`)));
check("move tool present in index.html", html.includes('id="move-calc"') && html.includes('id="move-result"'));
check("move honesty: not-what-you-deposited and not-live labels", html.includes("are not what you deposited") && html.includes("not a live quote, not financial advice"));

/* ---------- Tool 28: split-route swap planner (SPLIT) ---------- */
/* vectors verified in a clean foreground run BEFORE these tests were
   written; every leg must equal Tool 1's own cpSwap for that leg */
const sp1 = app.splitSwap("1000", "1000", "1000", "1000", "100", 0, 0);
check("SPLIT identical pools split near evenly", sp1 !== null && sp1.splitPct1 > 45 && sp1.splitPct1 < 55);
near("SPLIT identical pools total out", Number(sp1.totalOut), 95.238095238, 1e-6);
near("SPLIT identical pools best single", Number(sp1.bestSingleOut), 90.909090909, 1e-9);
check("SPLIT identical pools gain positive", sp1.gainVsBestSingle > 4.3 && sp1.gainVsBestSingle < 4.33);
check("SPLIT amounts sum to the trade", app.parseScaled(sp1.amount1) + app.parseScaled(sp1.amount2) === app.parseScaled("100"));
check("SPLIT leg outs sum to total out", app.parseScaled(sp1.out1) + app.parseScaled(sp1.out2) === app.parseScaled(sp1.totalOut));
check("SPLIT legs are Tool 1 verbatim", app.cpSwap("1000", "1000", sp1.amount1, 0).out === sp1.out1 && app.cpSwap("1000", "1000", sp1.amount2, 0).out === sp1.out2);
const spA = app.splitSwap("1000", "1000", "10000", "10000", "100", 0, 0);
check("SPLIT deeper pool takes the larger share", spA !== null && spA.splitPct1 < 20 && Number(spA.amount2) > 80);
check("SPLIT asym beats best single", Number(spA.totalOut) > Number(spA.bestSingleOut) && Number(spA.bestSingleOut) === 99.00990099);
const spF = app.splitSwap("1000", "1000", "1000", "1000", "100", 25, 100);
check("SPLIT cheaper-fee twin takes larger share", spF !== null && spF.splitPct1 > 50 && spF.splitPct1 < 60);
const spP = app.splitSwap("1000", "2000", "1000", "2000", "100", 25, 25);
near("SPLIT priced pools total out", Number(spP.totalOut), 190.022621738, 1e-6);
/* the split never does worse than the best single route */
for (const [r1i, r1o, r2i, r2o, amt, f1, f2] of [
  ["500", "800", "5000", "3000", "250", 25, 25],
  ["100000", "50000", "2000", "9000", "1000", 30, 5],
  ["1000", "1000", "1000", "1000", "1", 25, 25],
  ["42", "17", "900", "3600", "13.5", 100, 0]
]) {
  const s = app.splitSwap(r1i, r1o, r2i, r2o, amt, f1, f2);
  check("SPLIT never worse than best single " + amt, s !== null && app.parseScaled(s.totalOut) >= app.parseScaled(s.bestSingleOut));
  check("SPLIT amounts conserve " + amt, s !== null && app.parseScaled(s.amount1) + app.parseScaled(s.amount2) === app.parseScaled(amt));
}
/* one unusable pool: everything routes through the other */
const spD = app.splitSwap("1000", "1000", "0.000000001", "0.000000001", "100", 0, 0);
check("SPLIT dust pool falls back to single route", spD !== null && spD.amount2 === "0" && spD.totalOut === spD.single1Out && spD.gainVsBestSingle === 0);
check("SPLIT rejects bad amount", app.splitSwap("1000", "1000", "1000", "1000", "0", 0, 0) === null && app.splitSwap("1000", "1000", "1000", "1000", "", 0, 0) === null && app.splitSwap("1000", "1000", "1000", "1000", "1.0000000001", 0, 0) === null);
check("SPLIT rejects both pools unusable", app.splitSwap("0", "1000", "0", "1000", "100", 0, 0) === null && app.splitSwap("x", "1000", "y", "1000", "100", 0, 0) === null && app.splitSwap("1000", "1000", "1000", "1000", "100", -1, 10000) === null);
check("SPLIT one bad-fee pool falls back to the other", (() => { const s = app.splitSwap("1000", "1000", "1000", "1000", "100", -1, 0); return s !== null && s.amount1 === "0" && s.totalOut === s.single2Out; })());
check("all split controls labelled", ["split-r1in", "split-r1out", "split-fee1", "split-r2in", "split-r2out", "split-fee2", "split-ain", "split-a1", "split-a2"].every(id => html.includes(`for="${id}"`)));
check("split tool present in index.html", html.includes('id="split-calc"') && html.includes('id="split-result"'));
check("split honesty: parallel-not-series and not-live labels", html.includes("parallel move aggregators also make") && html.includes("an extra leg are not modelled") && html.includes("not a live quote, not financial advice"));


/* ---------- Tool 29: CLMM net return calculator (CNET) ---------- */
const cn1 = app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "1.25", "0");
near("CNET entry value", cn1.entryValueInB, 200, 1e-6);
near("CNET position value at upper edge", cn1.positionValueInB, 211.80339887, 1e-6);
near("CNET hold value at upper edge", cn1.holdValueInB, 225, 1e-9);
near("CNET hurdle at upper edge", cn1.feesNeededInB, 13.19660113, 1e-6);
near("CNET no fees net vs hold", cn1.netVsHoldInB, -13.19660113, 1e-6);
near("CNET no fees vs hold pct", cn1.netVsHoldPct, -5.865156, 1e-4);
near("CNET honest twist: up on entry yet behind hold", cn1.returnOnEntryPct, 5.901699, 1e-4);
check("CNET zero fees coverage is 0, not null", cn1.coveragePct === 0);
const cnExact = app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "1.25", "13.19660113");
near("CNET fees = hurdle settles exactly even (upper)", cnExact.netVsHoldInB, 0, 1e-6);
near("CNET fees = hurdle coverage 100 (upper)", cnExact.coveragePct, 100, 1e-6);
const cnLow = app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "0.8", "10.5572809");
near("CNET fees = hurdle settles exactly even (lower)", cnLow.netVsHoldInB, 0, 1e-6);
near("CNET lower edge return on entry", cnLow.returnOnEntryPct, -10, 1e-4);
const cnEntry = app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "1", "50");
check("CNET entry price coverage honestly null", cnEntry.coveragePct === null && cnEntry.feesNeededInB === 0);
near("CNET entry price fees are pure gain vs hold", cnEntry.netVsHoldInB, 50, 1e-9);
const cnOut = app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "2", "0");
near("CNET out-of-range hurdle", cnOut.feesNeededInB, 88.19660113, 1e-6);
near("CNET out-of-range vs hold pct", cnOut.netVsHoldPct, -29.398867, 1e-4);
const cn2x = app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "1.25", "26.39320226");
near("CNET double hurdle coverage 200", cn2x.coveragePct, 200, 1e-4);
near("CNET double hurdle net vs hold", cn2x.netVsHoldInB, 13.19660113, 1e-6);
/* composition: every CNET figure must equal Tool 12's own values */
[["1", "1.25"], ["1", "0.8"], ["1", "1"], ["1", "2"], ["0.9", "1.1"]].forEach(([e, c]) => {
  const vh = app.clmmVsHold("947.2135955", "0.8", "1.25", e, c);
  const cn = app.clmmNetReturn("947.2135955", "0.8", "1.25", e, c, "7.5");
  check("CNET is Tool 12 verbatim " + e + "->" + c, cn !== null && cn.positionValueInB === vh.positionValueInB && cn.holdValueInB === vh.holdValueInB && cn.feesNeededInB === vh.feesNeededInB && Math.abs(cn.netVsHoldInB - (7.5 - vh.feesNeededInB)) < 1e-9);
});
check("CNET rejects negative or blank fees", app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "1.25", "-1") === null && app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "1.25", "") === null);
check("CNET rejects bad position inputs", app.clmmNetReturn("0", "0.8", "1.25", "1", "1.25", "5") === null && app.clmmNetReturn("947.2135955", "1.25", "0.8", "1", "1.25", "5") === null && app.clmmNetReturn("947.2135955", "0.8", "1.25", "1", "0", "5") === null);
check("all cnet controls labelled", ["cnet-l", "cnet-lower", "cnet-upper", "cnet-entry", "cnet-check", "cnet-fees", "cnet-out"].every(id => html.includes(`for="${id}"`)));
check("cnet tool present in index.html", html.includes('id="cnet-calc"') && html.includes('id="cnet-result"'));
check("cnet honesty: both bottom lines and not-live labels", html.includes("different bottom line, reported alongside rather than instead") && html.includes("nothing-to-cover rather than a percentage") && html.includes("not a live quote, not financial advice"));

/* ---------- Tool 30: CLMM IL tolerance band (CBAND) ---------- */
/* headline: fees equal to Tool 12's hurdle at a range edge put the band
   edge exactly on that range edge */
const cbUp = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "13.19660113");
near("CBAND upper-edge fees put high edge on range top", cbUp.priceHigh, 1.25, 1e-6);
near("CBAND upper-edge fees move up pct", cbUp.moveUpPct, 25, 1e-4);
const cbDn = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "10.5572809");
near("CBAND lower-edge fees put low edge on range bottom", cbDn.priceLow, 0.8, 1e-6);
check("CBAND lower edge flagged on range boundary", cbDn.lowInRange === true && cbDn.downUnbounded === false);
near("CBAND lower-edge fees move down pct", cbDn.moveDownPct, 20, 1e-4);
/* clean mid vector (pre-verified against Tool 12 in a foreground prototype) */
const cb50 = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "50");
near("CBAND fees 50 high edge", cb50.priceHigh, 1.618033986, 1e-6);
near("CBAND fees 50 low edge", cb50.priceLow, 0.447213598, 1e-6);
check("CBAND fees 50 edges both outside range", cb50.highInRange === false && cb50.lowInRange === false);
near("CBAND entry value", cb50.entryValueInB, 200, 1e-6);
near("CBAND down cap is entry B amount", cb50.downCapInB, 100, 1e-6);
/* the defining property: Tool 12's own hurdle at each edge equals the fees */
for (const fees of ["0.5", "5", "13.19660113", "50", "88.19660113", "200"]) {
  const b = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", fees);
  near("CBAND hurdle at high edge = fees " + fees, app.clmmVsHold("947.2135955", "0.8", "1.25", "1", String(b.priceHigh)).feesNeededInB, Number(fees), 1e-6);
  check("CBAND band straddles entry " + fees, b.priceHigh > 1 && (b.downUnbounded || (b.priceLow !== null && b.priceLow < 1)));
  if (!b.downUnbounded) near("CBAND hurdle at low edge = fees " + fees, app.clmmVsHold("947.2135955", "0.8", "1.25", "1", String(b.priceLow)).feesNeededInB, Number(fees), 1e-6);
}
/* composition holds at another entry inside the range too */
const cbOff = app.clmmIlBand("947.2135955", "0.8", "1.25", "1.1", "5");
near("CBAND off-centre hurdle at high edge", app.clmmVsHold("947.2135955", "0.8", "1.25", "1.1", String(cbOff.priceHigh)).feesNeededInB, 5, 1e-6);
near("CBAND off-centre hurdle at low edge", app.clmmVsHold("947.2135955", "0.8", "1.25", "1.1", String(cbOff.priceLow)).feesNeededInB, 5, 1e-6);
/* bigger fees defend a strictly wider band on both sides */
const cb5 = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "5");
const cb20 = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "20");
check("CBAND wider fees, wider band", cb20.priceHigh > cb5.priceHigh && cb20.priceLow < cb5.priceLow);
check("CBAND small-fees edges flagged inside the range", cb5.highInRange === true && cb5.lowInRange === true);
/* downside cap: fees at/above the entry B amount can never be consumed by a fall */
const cbCap = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "100");
check("CBAND fees = cap is down-unbounded", cbCap.downUnbounded === true && cbCap.priceLow === null && cbCap.moveDownPct === null && cbCap.lowInRange === null);
check("CBAND fees above cap still has a finite high edge", cbCap.priceHigh > 1 && app.clmmVsHold("947.2135955", "0.8", "1.25", "1", String(cbCap.priceHigh)).feesNeededInB > 99.999999);
const cbNearCap = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "99.9");
check("CBAND just below cap has a near-zero low edge", cbNearCap.downUnbounded === false && cbNearCap.priceLow > 0 && cbNearCap.priceLow < 0.01);
/* zero fees collapse the band to the entry price */
const cb0 = app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "0");
check("CBAND zero fees collapse to entry", cb0.priceHigh === 1 && cb0.priceLow === 1 && cb0.moveUpPct === 0 && cb0.moveDownPct === 0 && cb0.downUnbounded === false);
check("CBAND rejects negative or blank fees", app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "-1") === null && app.clmmIlBand("947.2135955", "0.8", "1.25", "1", "") === null);
check("CBAND rejects entry outside the range", app.clmmIlBand("947.2135955", "0.8", "1.25", "2", "5") === null && app.clmmIlBand("947.2135955", "0.8", "1.25", "0.5", "5") === null);
check("CBAND rejects entry exactly on either range edge (single-token position)", app.clmmIlBand("947.2135955", "0.8", "1.25", "0.8", "5") === null && app.clmmIlBand("947.2135955", "0.8", "1.25", "1.25", "5") === null && app.clmmIlBand("947.2135955", "0.8", "1.25", "0.8", "0") === null);
check("CBAND accepts entry just inside either edge", app.clmmIlBand("947.2135955", "0.8", "1.25", "0.800001", "5") !== null && app.clmmIlBand("947.2135955", "0.8", "1.25", "1.249999", "5") !== null);
check("CBAND rejects bad position inputs", app.clmmIlBand("0", "0.8", "1.25", "1", "5") === null && app.clmmIlBand("947.2135955", "1.25", "0.8", "1", "5") === null && app.clmmIlBand("947.2135955", "0.8", "1.25", "0", "5") === null);
check("all cband controls labelled", ["cband-l", "cband-lower", "cband-upper", "cband-entry", "cband-fees", "cband-out"].every(id => html.includes(`for="${id}"`)));
check("cband tool present in index.html", html.includes('id="cband-calc"') && html.includes('id="cband-result"'));
check("cband honesty: cap asymmetry and not-live labels", html.includes("most a fall can ever cost vs holding is the token B the position held at entry") && html.includes("no two-sided band") && html.includes("not a live quote, not financial advice"));

/* ---------- Tool 31: CLMM required-volume planner (RVOL) ---------- */
const L31 = "947.2135955", T31 = "9472.135955";
const rv1 = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "1", "100");
near("RVOL headline hurdle = Tool 12 hurdle", rv1.feesNeededInB, 13.196601125011057, 1e-9);
near("RVOL headline required fees per day", rv1.requiredFeesPerDay, 13.196601125011057, 1e-9);
near("RVOL headline required volume", rv1.requiredVolumePerDay, 52786.40450004423, 1e-4);
near("RVOL headline required pool fees per day", rv1.requiredPoolFeesPerDay, 131.96601125011057, 1e-7);
check("RVOL headline feasible + share reported", rv1.feasible === true && rv1.sharePct === 10 && rv1.inRangePct === 100);
const rv10 = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "10", "100");
near("RVOL ten days needs a tenth of the volume", rv10.requiredVolumePerDay, 5278.640450004422, 1e-5);
const rvLow = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "0.8", T31, 100, "2", "50");
near("RVOL lower-edge hurdle", rvLow.feesNeededInB, 10.557280900008863, 1e-9);
near("RVOL lower-edge required volume", rvLow.requiredVolumePerDay, 10557.280900008862, 1e-4);
/* the inverse must round-trip through Tools 13 and 15 exactly */
for (const [nm, rv, days] of [["headline", rv1, "1"], ["ten-day", rv10, "10"], ["lower-edge", rvLow, "2"]]) {
  const fwd = app.clmmFeeEstimate(rv.liquidity, rv.totalActiveLiquidity, String(rv.requiredVolumePerDay), rv.feeBps, days, String(rv.inRangePct), "");
  near("RVOL Tool 13 at required volume earns the hurdle (" + nm + ")", fwd.feesForPeriod, rv.feesNeededInB, 1e-6);
  const bed = app.clmmBreakEven(rv.liquidity, rv.lowerPrice, rv.upperPrice, rv.entryPrice, rv.checkPrice, rv.totalActiveLiquidity, String(rv.requiredVolumePerDay), rv.feeBps, String(rv.inRangePct));
  near("RVOL Tool 15 at required volume breaks even in the days allowed (" + nm + ")", bed.daysToBreakEven, Number(days), 1e-6);
}
/* composition: hurdle and share are the source tools' own numbers */
for (const chk of ["0.9", "1", "1.1", "1.25", "0.8", "1.6"]) {
  const r = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", chk, T31, 25, "7", "80");
  near("RVOL hurdle = Tool 12 at check " + chk, r.feesNeededInB, app.clmmVsHold(L31, "0.8", "1.25", "1", chk).feesNeededInB, 1e-12);
  check("RVOL share/in-range = Tool 13 at check " + chk, r.sharePct === 10 && r.inRangePct === 80);
}
/* scaling: double the fee tier or double the share, half the volume */
const rvFee2 = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 50, "1", "100");
near("RVOL double fee tier halves volume", rvFee2.requiredVolumePerDay, rv1.requiredVolumePerDay / 2, 1e-4);
const rvShare2 = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", "4736.0679775", 25, "1", "100");
near("RVOL double share halves volume", rvShare2.requiredVolumePerDay, rv1.requiredVolumePerDay / 2, 1e-4);
const rvRange2 = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "1", "50");
near("RVOL half the time in range doubles volume", rvRange2.requiredVolumePerDay, rv1.requiredVolumePerDay * 2, 1e-4);
/* honest edges */
const rv0 = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1", T31, 25, "5", "100");
check("RVOL entry price needs zero volume", rv0.feasible === true && rv0.requiredVolumePerDay === 0 && rv0.feesNeededInB <= 1e-12);
const rv0Fee = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1", T31, 0, "5", "100");
check("RVOL entry price needs zero volume even at a zero fee tier", rv0Fee.feasible === true && rv0Fee.requiredVolumePerDay === 0);
const rvNoFee = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 0, "5", "100");
check("RVOL zero fee tier with a real hurdle is not feasible", rvNoFee.feasible === false && rvNoFee.requiredVolumePerDay === Infinity && rvNoFee.requiredFeesPerDay > 0);
const rvOut = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "5", "0");
check("RVOL 0% time in range with a real hurdle is not feasible", rvOut.feasible === false && rvOut.requiredVolumePerDay === Infinity);
const rvBlank = app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "1", "");
near("RVOL blank time-in-range defaults to 100 like Tool 13", rvBlank.requiredVolumePerDay, rv1.requiredVolumePerDay, 1e-9);
/* rejections */
check("RVOL rejects blank or non-positive days", app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "", "100") === null && app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "0", "100") === null && app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "-3", "100") === null);
check("RVOL rejects total active liquidity below own L (Tool 13 rule)", app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", "900", 25, "1", "100") === null);
check("RVOL rejects fee tier above 10000 bps and in-range above 100", app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 10001, "1", "100") === null && app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "1.25", T31, 25, "1", "101") === null);
check("RVOL rejects bad position inputs", app.clmmRequiredVolume("0", "0.8", "1.25", "1", "1.25", T31, 25, "1", "100") === null && app.clmmRequiredVolume(L31, "1.25", "0.8", "1", "1.25", T31, 25, "1", "100") === null && app.clmmRequiredVolume(L31, "0.8", "1.25", "1", "0", T31, 25, "1", "100") === null);
check("all rvol controls labelled", ["rvol-l", "rvol-lower", "rvol-upper", "rvol-entry", "rvol-check", "rvol-total", "rvol-bps", "rvol-days", "rvol-inrange", "rvol-out"].every(id => html.includes(`for="${id}"`)));
check("rvol tool present in index.html", html.includes('id="rvol-calc"') && html.includes('id="rvol-result"'));
check("rvol honesty: whole-pool volume and not-live labels", html.includes("whole pool's trading in token B per day") && html.includes("reported as not feasible") && html.includes("not a volume forecast, not financial advice"));
check("README lists fifty-three tools", readme.includes("fifty-three pool tools") || readme.includes("all fifty-three"));

/* ---------- Tool 32: Constant-product required-volume planner (CPVOL) ---------- */
const cpv1 = app.cpRequiredVolume(2, "1000", "10000", "1000000", 25, "10");
near("CPVOL headline hurdle = Tool 4 hurdle", cpv1.feesNeeded, 85.7864376269049, 1e-9);
near("CPVOL headline required fees per day", cpv1.requiredFeesPerDay, 8.57864376269049, 1e-9);
near("CPVOL headline required volume", cpv1.requiredVolumePerDay, 343145.7505076196, 1e-4);
near("CPVOL headline required pool fees per day", cpv1.requiredPoolFeesPerDay, 857.864376269049, 1e-7);
check("CPVOL headline feasible + share reported", cpv1.feasible === true && cpv1.sharePct === 1 && cpv1.feePct === 0.25);
const cpv4 = app.cpRequiredVolume(4, "1000", "50000", "1000000", 25, "5");
near("CPVOL 4x hurdle", cpv4.feesNeeded, 500, 1e-9);
near("CPVOL 4x required volume", cpv4.requiredVolumePerDay, 800000, 1e-6);
const cpvHalf = app.cpRequiredVolume(0.5, "1000", "10000", "1000000", 25, "10");
near("CPVOL halving hurdle", cpvHalf.feesNeeded, 42.89321881345245, 1e-9);
near("CPVOL halving required volume", cpvHalf.requiredVolumePerDay, 171572.8752538098, 1e-4);
/* the inverse must round-trip through Tools 3 and 4 exactly */
for (const [nm, cpv, ratio, dep, your, tvl, bps, days] of [["headline", cpv1, 2, "1000", "10000", "1000000", 25, "10"], ["4x", cpv4, 4, "1000", "50000", "1000000", 25, "5"], ["halving", cpvHalf, 0.5, "1000", "10000", "1000000", 25, "10"]]) {
  const fwd = app.lpFees(String(cpv.requiredVolumePerDay), bps, your, tvl);
  near("CPVOL Tool 3 at required volume earns the hurdle in the days allowed (" + nm + ")", fwd.dailyFees * Number(days), cpv.feesNeeded, 1e-6);
  const be = app.breakEvenFees(ratio, dep, String(fwd.dailyFees));
  near("CPVOL Tool 4 at that daily rate breaks even in the days allowed (" + nm + ")", be.daysToBreakEven, Number(days), 1e-6);
}
/* composition: hurdle and share are the source tools' own numbers */
for (const r of [0.25, 0.5, 0.8, 1.25, 2, 4]) {
  const x = app.cpRequiredVolume(r, "2500", "12345", "987654", 30, "30");
  near("CPVOL hurdle = Tool 4 at ratio " + r, x.feesNeeded, app.breakEvenFees(r, "2500").feesNeeded, 1e-9);
  check("CPVOL share = Tool 3 at ratio " + r, x.sharePct === app.lpFees("1", 30, "12345", "987654").sharePct);
}
/* scaling: double the fee tier, the share or the days, half the volume */
near("CPVOL double fee tier halves volume", app.cpRequiredVolume(2, "1000", "10000", "1000000", 50, "10").requiredVolumePerDay, cpv1.requiredVolumePerDay / 2, 1e-4);
near("CPVOL double share halves volume", app.cpRequiredVolume(2, "1000", "20000", "1000000", 25, "10").requiredVolumePerDay, cpv1.requiredVolumePerDay / 2, 1e-4);
near("CPVOL double days halves volume", app.cpRequiredVolume(2, "1000", "10000", "1000000", 25, "20").requiredVolumePerDay, cpv1.requiredVolumePerDay / 2, 1e-4);
/* honest edges */
const cpv0 = app.cpRequiredVolume(1, "1000", "10000", "1000000", 25, "10");
check("CPVOL no price move needs zero volume", cpv0.feasible === true && cpv0.requiredVolumePerDay === 0 && cpv0.feesNeeded === 0);
const cpv0Fee = app.cpRequiredVolume(1, "1000", "10000", "1000000", 0, "10");
check("CPVOL no price move needs zero volume even at a zero fee tier", cpv0Fee.feasible === true && cpv0Fee.requiredVolumePerDay === 0);
const cpvNoFee = app.cpRequiredVolume(2, "1000", "10000", "1000000", 0, "10");
check("CPVOL zero fee tier with a real hurdle is not feasible", cpvNoFee.feasible === false && cpvNoFee.requiredVolumePerDay === Infinity && cpvNoFee.requiredFeesPerDay > 0 && cpvNoFee.requiredPoolFeesPerDay > 0);
/* rejections */
check("CPVOL rejects blank or non-positive days", app.cpRequiredVolume(2, "1000", "10000", "1000000", 25, "") === null && app.cpRequiredVolume(2, "1000", "10000", "1000000", 25, "0") === null && app.cpRequiredVolume(2, "1000", "10000", "1000000", 25, "-3") === null);
check("CPVOL rejects your liquidity above TVL (Tool 3 rule)", app.cpRequiredVolume(2, "1000", "2000000", "1000000", 25, "10") === null);
check("CPVOL rejects fee tier above 10000 bps and non-integer tiers", app.cpRequiredVolume(2, "1000", "10000", "1000000", 10001, "10") === null && app.cpRequiredVolume(2, "1000", "10000", "1000000", "25.5", "10") === null);
check("CPVOL rejects bad move or deposit inputs", app.cpRequiredVolume(0, "1000", "10000", "1000000", 25, "10") === null && app.cpRequiredVolume(2, "", "10000", "1000000", 25, "10") === null && app.cpRequiredVolume(2, "0", "10000", "1000000", 25, "10") === null);
check("all cpvol controls labelled", ["cpvol-ratio", "cpvol-deposit", "cpvol-your", "cpvol-tvl", "cpvol-bps", "cpvol-days", "cpvol-out"].every(id => html.includes(`for="${id}"`)));
check("cpvol tool present in index.html", html.includes('id="cpvol-calc"') && html.includes('id="cpvol-result"'));
check("cpvol honesty: whole-pool volume and not-live labels", html.includes("whole pool's trading per day") && html.includes("reported as not feasible") && html.includes("not a volume forecast, not financial advice"));

/* ---------- Tool 33: CLMM single-sided zap-in planner (CZAP) ---------- */
const cz1 = app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", 25);
check("CZAP headline in range", cz1.status === "in" && cz1.inRange === true);
near("CZAP headline ratio is 1 at the centred price", cz1.ratioBperA, 1, 1e-12);
near("CZAP headline swap split", cz1.swapIn, 51.310156586, 1e-9);
near("CZAP headline swap return", cz1.swapOut, 48.689843413, 1e-9);
near("CZAP headline deposit A", cz1.depositA, 48.689843413, 1e-9);
near("CZAP headline deposit B", cz1.depositB, 48.689843413, 1e-9);
check("CZAP headline B fully used, A leftover is dust", cz1.leftoverB === 0 && cz1.leftoverA >= 0 && cz1.leftoverA < 1e-6 && cz1.limiting === "B");
near("CZAP headline liquidity", cz1.liquidity, 461.19681643557664, 1e-9);
near("CZAP accounting: swap + deposit + leftover = holding", cz1.swapIn + cz1.depositA + cz1.leftoverA, 100, 1e-9);
/* both legs are the source tools verbatim */
check("CZAP swap leg = Tool 1 on the reported split", Number(app.cpSwap("1000", "1000", cz1.swapIn.toFixed(9), 25).out) === cz1.swapOut);
const czRp = app.clmmRangePlan("1", "0.8", "1.25", String(cz1.depositA));
near("CZAP deposit = Tool 8 plan for the deposited A (required B)", czRp.requiredB, cz1.depositB, 1e-9);
near("CZAP liquidity = Tool 8 liquidity for the deposited A", czRp.liquidity, cz1.liquidity, 1e-9);
const czWp = app.clmmWalletPlan("1", "0.8", "1.25", String(100 - cz1.swapIn), String(cz1.swapOut));
near("CZAP deposit = Tool 14 settlement (liquidity)", czWp.liquidity, cz1.liquidity, 1e-12);
check("CZAP deposit = Tool 14 settlement (used amounts)", czWp.usedA === cz1.depositA && czWp.usedB === cz1.depositB);
/* zero fee: the split is the closed-form root of s^2 + 1900 s - 100000 = 0 */
const cz0 = app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", 0);
near("CZAP zero-fee split = closed form", cz0.swapIn, (-1900 + Math.sqrt(4010000)) / 2, 1e-9);
/* a higher swap fee leaks more, so the split swaps more */
const cz100 = app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", 100);
check("CZAP higher fee swaps more", cz100.swapIn > cz1.swapIn && cz100.swapIn < 100);
/* geometric centre of any range: ratio = price, deposit value-balanced */
const czC = app.clmmZapIn("2000", "1000", "2", "1.6", "2.5", "50", 25);
near("CZAP centred ratio = price", czC.ratioBperA, 2, 1e-9);
near("CZAP centred deposit ratio", czC.depositB / czC.depositA, 2, 1e-9);
const czA = app.clmmZapIn("500", "2000", "4", "3.2", "5", "40", 25);
near("CZAP asymmetric pool centred ratio = price", czA.ratioBperA, 4, 1e-9);
near("CZAP asymmetric deposit ratio", czA.depositB / czA.depositA, 4, 1e-9);
/* near the top edge almost everything must be swapped */
const czTop = app.clmmZapIn("1000", "1000", "1.24", "0.8", "1.25", "100", 25);
check("CZAP near-upper split swaps over 98% of the holding", czTop.swapIn > 98 && czTop.swapIn < 100 && czTop.depositB / czTop.depositA > 60);
/* composition sweep: Tool 8 must require exactly the B deposited, B never left over */
for (const [cur, lo, hi, x, bps] of [["1", "0.8", "1.25", "100", 25], ["2", "1.6", "2.5", "50", 25], ["0.9", "0.5", "2", "250", 30], ["3", "2", "4.5", "75", 5], ["1", "0.8", "1.25", "1000", 100]]) {
  const z = app.clmmZapIn("1000", "1000", cur, lo, hi, x, bps);
  check("CZAP sweep settles in range at price " + cur + " x " + x, z !== null && z.status === "in" && z.leftoverB === 0 && z.leftoverA >= 0 && z.leftoverA < Math.max(1e-6, Number(x) * 1e-7));
  near("CZAP sweep Tool 8 requires the deposited B at price " + cur + " x " + x, app.clmmRangePlan(cur, lo, hi, String(z.depositA)).requiredB, z.depositB, 1e-6);
  near("CZAP sweep deposit ratio = range ratio at price " + cur + " x " + x, z.depositB / z.depositA, z.ratioBperA, 1e-9);
}
/* range edges: no swap maths, Tool 14's one-token cases */
const czBelow = app.clmmZapIn("1000", "1000", "0.7", "0.8", "1.25", "100", 25);
check("CZAP below range swaps nothing", czBelow.status === "below" && czBelow.swapIn === 0 && czBelow.swapOut === 0 && czBelow.depositA === 100 && czBelow.depositB === 0 && czBelow.ratioBperA === null);
check("CZAP below range = Tool 14 below case", czBelow.liquidity === app.clmmWalletPlan("0.7", "0.8", "1.25", "100", "0").liquidity);
const czAtLow = app.clmmZapIn("1000", "1000", "0.8", "0.8", "1.25", "100", 25);
check("CZAP at the lower edge is the below case", czAtLow.status === "below" && czAtLow.swapIn === 0);
const czAbove = app.clmmZapIn("1000", "1000", "1.3", "0.8", "1.25", "100", 25);
check("CZAP above range swaps everything", czAbove.status === "above" && czAbove.swapIn === 100 && czAbove.depositA === 0 && czAbove.ratioBperA === null);
check("CZAP above swap = Tool 1 all-in", czAbove.swapOut === Number(app.cpSwap("1000", "1000", "100", 25).out) && czAbove.depositB === czAbove.swapOut);
check("CZAP above range = Tool 14 above case", czAbove.liquidity === app.clmmWalletPlan("1.3", "0.8", "1.25", "0", String(czAbove.swapOut)).liquidity);
/* rejections */
check("CZAP rejects blank fields", app.clmmZapIn("", "1000", "1", "0.8", "1.25", "100", 25) === null && app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "", 25) === null && app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", "") === null);
check("CZAP rejects non-positive reserves, price or holding", app.clmmZapIn("0", "1000", "1", "0.8", "1.25", "100", 25) === null && app.clmmZapIn("1000", "1000", "0", "0.8", "1.25", "100", 25) === null && app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "0", 25) === null);
check("CZAP rejects inverted range and bad fee tiers", app.clmmZapIn("1000", "1000", "1", "1.25", "0.8", "100", 25) === null && app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", 10000) === null && app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", "25.5") === null);
check("CZAP rejects a holding too small for the swap to return anything", app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "0.000000001", 25) === null);
check("all czap controls labelled", ["czap-ra", "czap-rb", "czap-bps", "czap-cur", "czap-lower", "czap-upper", "czap-amt", "czap-out"].every(id => html.includes(`for="${id}"`)));
check("czap tool present in index.html", html.includes('id="czap-calc"') && html.includes('id="czap-result"'));
check("czap honesty: separate models and not-live labels", html.includes("modelled separately") && html.includes("not live pool state") && html.includes("not financial advice"));

/* ---------- Tool 34: CLMM single-sided zap-out planner (CZOUT) ---------- */
const L34 = String(app.clmmRangePlan("1", "0.8", "1.25", "100").liquidity);
const czo1 = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1", 25);
check("CZOUT headline in range", czo1.status === "in" && czo1.inRange === true);
near("CZOUT headline withdraw A = Tool 9 amount", czo1.withdrawA, 100, 1e-9);
near("CZOUT headline withdraw B = Tool 9 amount", czo1.withdrawB, 100, 1e-9);
near("CZOUT headline swap in is the whole B leg", czo1.swapIn, 100, 1e-12);
near("CZOUT headline swap return", czo1.swapOut, 90.70243237, 1e-9);
near("CZOUT headline total A", czo1.totalA, 190.70243237, 1e-9);
near("CZOUT headline value at spot", czo1.valueAtSpotA, 200, 1e-9);
near("CZOUT headline consolidation cost", czo1.consolidationCostA, 9.29756763, 1e-6);
near("CZOUT headline consolidation cost %", czo1.consolidationCostPct, 4.648783815, 1e-6);
/* both legs are the source tools verbatim */
const czoPos = app.clmmPositionAtPrice(L34, "0.8", "1.25", "1");
check("CZOUT withdrawal = Tool 9 verbatim", czo1.withdrawA === czoPos.amountA && czo1.withdrawB === czoPos.amountB);
check("CZOUT swap leg = Tool 1 on the floored B leg", Number(app.cpSwap("1000", "1000", czo1.swapIn.toFixed(9), 25).out) === czo1.swapOut);
near("CZOUT accounting: total = kept A + swap return", czo1.withdrawA + czo1.swapOut, czo1.totalA, 1e-12);
near("CZOUT accounting: cost = value at spot - total", czo1.valueAtSpotA - czo1.totalA, czo1.consolidationCostA, 1e-12);
/* zero fee: swap returns 1000*100/1100, cost is impact only */
const czo0 = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1", 0);
near("CZOUT zero-fee swap return", czo0.swapOut, 90.909090909, 1e-9);
near("CZOUT zero-fee total A", czo0.totalA, 190.909090909, 1e-9);
near("CZOUT zero-fee cost %", czo0.consolidationCostPct, 4.5454545455, 1e-6);
/* a higher swap fee costs more; a deeper swap pool costs less */
const czo100 = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1", 100);
check("CZOUT higher fee costs more", czo100.consolidationCostPct > czo1.consolidationCostPct && czo100.totalA < czo1.totalA);
const czoDeep = app.clmmZapOut("10000", "10000", L34, "0.8", "1.25", "1", 25);
check("CZOUT deeper swap pool costs less", czoDeep.consolidationCostPct < czo1.consolidationCostPct && czoDeep.consolidationCostPct > 0);
/* composition sweep: withdrawal is Tool 9, swap is Tool 1, total never beats spot value */
for (const [liq, lo, hi, cur, ra, rb, bps] of [[L34, "0.8", "1.25", "1.2", "1000", "1000", 25], ["500", "0.5", "2", "1.5", "2000", "500", 25], ["2000", "2", "8", "3", "100", "4000", 100], ["100", "0.9", "1.1", "1.05", "5000", "5000", 5]]) {
  const z = app.clmmZapOut(ra, rb, liq, lo, hi, cur, bps);
  const p = app.clmmPositionAtPrice(liq, lo, hi, cur);
  check("CZOUT sweep settles at price " + cur + " in " + ra + "/" + rb, z !== null && z.withdrawA === p.amountA && z.withdrawB === p.amountB && z.totalA <= z.valueAtSpotA + 1e-9 && z.consolidationCostA >= -1e-12);
  check("CZOUT sweep swap = Tool 1 at price " + cur + " in " + ra + "/" + rb, z.swapOut === Number(app.cpSwap(rb, ra, z.swapIn.toFixed(9), bps).out));
  near("CZOUT sweep total = kept A + swap return at price " + cur + " in " + ra + "/" + rb, z.withdrawA + z.swapOut, z.totalA, 1e-9);
}
/* range edges: below needs no swap; above swaps everything and cost % = impact */
const czoBelow = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "0.5", 25);
check("CZOUT below range swaps nothing", czoBelow.status === "below" && czoBelow.swapIn === 0 && czoBelow.swapOut === 0 && czoBelow.consolidationCostA === 0 && czoBelow.consolidationCostPct === 0);
near("CZOUT below range total is the whole A holding", czoBelow.totalA, 211.80339887, 1e-6);
near("CZOUT below range total = Tool 9 amount", czoBelow.totalA, app.clmmPositionAtPrice(L34, "0.8", "1.25", "0.5").amountA, 1e-12);
const czoAtLow = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "0.8", 25);
check("CZOUT at the lower edge is the below case", czoAtLow.status === "below" && czoAtLow.swapIn === 0);
const czoAbove = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "2", 25);
check("CZOUT above range is entirely B", czoAbove.status === "above" && czoAbove.withdrawA === 0 && czoAbove.swapIn > 0);
near("CZOUT above range withdraw B", czoAbove.withdrawB, 211.80339887, 1e-6);
near("CZOUT above range swap return", czoAbove.swapOut, 174.422888212, 1e-6);
near("CZOUT above range cost % = swap price impact", czoAbove.consolidationCostPct, czoAbove.swapPriceImpactPct, 1e-6);
const czoAtUp = app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1.25", 25);
check("CZOUT at the upper edge is the above case", czoAtUp.status === "above" && czoAtUp.withdrawA === 0);
/* rejections */
check("CZOUT rejects blank fields", app.clmmZapOut("", "1000", L34, "0.8", "1.25", "1", 25) === null && app.clmmZapOut("1000", "1000", "", "0.8", "1.25", "1", 25) === null && app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1", "") === null);
check("CZOUT rejects non-positive reserves, liquidity or price", app.clmmZapOut("0", "1000", L34, "0.8", "1.25", "1", 25) === null && app.clmmZapOut("1000", "1000", "0", "0.8", "1.25", "1", 25) === null && app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "0", 25) === null);
check("CZOUT rejects inverted range and bad fee tiers", app.clmmZapOut("1000", "1000", L34, "1.25", "0.8", "1", 25) === null && app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1", 10000) === null && app.clmmZapOut("1000", "1000", L34, "0.8", "1.25", "1", "25.5") === null);
check("CZOUT rejects a B leg too small to swap at 9 dp", app.clmmZapOut("1000", "1000", "0.000000001", "0.8", "1.25", "1", 25) === null);
check("all czout controls labelled", ["czout-ra", "czout-rb", "czout-bps", "czout-l", "czout-lower", "czout-upper", "czout-cur", "czout-out"].every(id => html.includes(`for="${id}"`)));
check("czout tool present in index.html", html.includes('id="czout-calc"') && html.includes('id="czout-result"'));
check("czout honesty: separate models and not-live labels", html.includes("Tool 33's exit mirror") && html.includes("modelled separately") && html.includes("not live pool state") && html.includes("not financial advice"));

/* ---------- Tool 35: CLMM token-B deposit planner (BDEP) ---------- */
const bd1 = app.clmmRangePlanB("1", "0.8", "1.25", "100");
check("BDEP headline in range", bd1.status === "in" && bd1.inRange === true);
near("BDEP headline required A mirrors Tool 8", bd1.requiredA, 100, 1e-9);
near("BDEP headline liquidity mirrors Tool 8", bd1.liquidity, 947.2135954999577, 1e-9);
near("BDEP headline A value share", bd1.aValuePct, 50, 1e-9);
near("BDEP headline B value share", bd1.bValuePct, 50, 1e-9);
check("BDEP headline ticks mirror Tool 8", bd1.tickLower === app.clmmRangePlan("1", "0.8", "1.25", "100").tickLower && bd1.tickUpper === app.clmmRangePlan("1", "0.8", "1.25", "100").tickUpper && bd1.tickCurrent === app.clmmRangePlan("1", "0.8", "1.25", "100").tickCurrent);
/* the mirror is exact: requiredA fed into Tool 8 returns the original B and the same L */
const bdBack = app.clmmRangePlan("1", "0.8", "1.25", String(bd1.requiredA));
near("BDEP round-trip Tool 8 returns the B deposited", bdBack.requiredB, 100, 1e-9);
near("BDEP round-trip Tool 8 returns the same liquidity", bdBack.liquidity, bd1.liquidity, 1e-9);
/* Tool 9 at the current price returns both deposited amounts for that L */
const bdPos = app.clmmPositionAtPrice(String(bd1.liquidity), "0.8", "1.25", "1");
near("BDEP Tool 9 returns the A required", bdPos.amountA, bd1.requiredA, 1e-9);
near("BDEP Tool 9 returns the B deposited", bdPos.amountB, 100, 1e-9);
/* off-centre inside the range: scarcer B side near the bottom demands much more A */
const bdOff = app.clmmRangePlanB("1.1", "0.8", "1.25", "50");
near("BDEP off-centre required A", bdOff.requiredA, 19.119952242959275, 1e-9);
near("BDEP off-centre liquidity", bdOff.liquidity, 323.87267319501103, 1e-9);
near("BDEP off-centre round-trip via Tool 8", app.clmmRangePlan("1.1", "0.8", "1.25", String(bdOff.requiredA)).requiredB, 50, 1e-9);
const bdLow = app.clmmRangePlanB("0.81", "0.8", "1.25", "10");
near("BDEP near-lower required A", bdLow.requiredA, 388.8235180999792, 1e-6);
check("BDEP near the lower edge the A share dominates", bdLow.aValuePct > 90);
/* geometric scaling: the 1.6-2.5 range at price 2 is the headline range scaled */
const bdScaled = app.clmmRangePlanB("2", "1.6", "2.5", "200");
near("BDEP scaled required A", bdScaled.requiredA, 100, 1e-9);
near("BDEP scaled round-trip via Tool 8", app.clmmRangePlan("2", "1.6", "2.5", String(bdScaled.requiredA)).requiredB, 200, 1e-9);
/* composition sweep: Tool 8 and Tool 9 agree at every combo */
for (const [cur, lo, hi, b] of [["1", "0.8", "1.25", "100"], ["2", "1.6", "2.5", "200"], ["0.9", "0.5", "2", "250"], ["3", "2", "4.5", "75"], ["1.05", "0.9", "1.1", "42.5"]]) {
  const p = app.clmmRangePlanB(cur, lo, hi, b);
  check("BDEP sweep settles in range at price " + cur + " B " + b, p !== null && p.status === "in");
  near("BDEP sweep Tool 8 round-trip at price " + cur + " B " + b, app.clmmRangePlan(cur, lo, hi, String(p.requiredA)).requiredB, Number(b), 1e-6);
  const pos = app.clmmPositionAtPrice(String(p.liquidity), lo, hi, cur);
  near("BDEP sweep Tool 9 A at price " + cur + " B " + b, pos.amountA, p.requiredA, 1e-6);
  near("BDEP sweep Tool 9 B at price " + cur + " B " + b, pos.amountB, Number(b), 1e-6);
  near("BDEP sweep value shares sum to 100 at price " + cur + " B " + b, p.aValuePct + p.bValuePct, 100, 1e-9);
}
/* range edges: at/above the top the position is entirely B; at/below the bottom a B deposit is rejected */
const bdAbove = app.clmmRangePlanB("2", "0.8", "1.25", "211.8033988749895");
check("BDEP above range is entirely B", bdAbove.status === "above" && bdAbove.inRange === false && bdAbove.requiredA === 0);
near("BDEP above range liquidity", bdAbove.liquidity, 947.2135954999577, 1e-9);
near("BDEP above range Tool 9 returns the B", app.clmmPositionAtPrice(String(bdAbove.liquidity), "0.8", "1.25", "2").amountB, 211.8033988749895, 1e-9);
const bdAtUp = app.clmmRangePlanB("1.25", "0.8", "1.25", "100");
check("BDEP at the upper edge is the above case", bdAtUp.status === "above" && bdAtUp.requiredA === 0);
near("BDEP at-upper liquidity", bdAtUp.liquidity, 447.21359549995776, 1e-9);
check("BDEP at or below the lower edge is rejected", app.clmmRangePlanB("0.8", "0.8", "1.25", "100") === null && app.clmmRangePlanB("0.5", "0.8", "1.25", "100") === null);
/* Tool 8's mirror rejection holds too: an A deposit at/above the top */
check("BDEP mirror: Tool 8 rejects an A deposit at the upper edge", app.clmmRangePlan("1.25", "0.8", "1.25", "100") === null);
/* rejections */
check("BDEP rejects blank fields", app.clmmRangePlanB("", "0.8", "1.25", "100") === null && app.clmmRangePlanB("1", "", "1.25", "100") === null && app.clmmRangePlanB("1", "0.8", "1.25", "") === null);
check("BDEP rejects non-positive price, range or deposit", app.clmmRangePlanB("0", "0.8", "1.25", "100") === null && app.clmmRangePlanB("1", "0", "1.25", "100") === null && app.clmmRangePlanB("1", "0.8", "1.25", "0") === null && app.clmmRangePlanB("1", "0.8", "1.25", "-5") === null);
check("BDEP rejects inverted range and non-numeric input", app.clmmRangePlanB("1", "1.25", "0.8", "100") === null && app.clmmRangePlanB("1", "0.8", "0.8", "100") === null && app.clmmRangePlanB("abc", "0.8", "1.25", "100") === null);
check("all bdep controls labelled", ["bdep-cur", "bdep-lower", "bdep-upper", "bdep-ab", "bdep-out"].every(id => html.includes(`for="${id}"`)));
check("bdep tool present in index.html", html.includes('id="bdep-calc"') && html.includes('id="bdep-result"'));
check("bdep honesty: mirror and not-live labels", html.includes("Tool 8's mirror") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers the B-side deposit", guide.includes("from the token you actually hold first"));

/* ---------- Tool 36: CLMM re-centre / rebalance planner (REB) ---------- */
const L36 = "947.2135954999577";
/* identity: re-centring the 0.8-1.25 position at price 1 to +-25% is the same range */
const rbId = app.clmmRebalance(L36, "0.8", "1.25", "1", "25");
check("REB identity keeps the range", rbId.newLower === 0.8 && rbId.newUpper === 1.25);
near("REB identity keeps the liquidity", rbId.newLiquidity, 947.2135954999577, 1e-9);
check("REB identity needs no swap", rbId.swapSide === "none" && rbId.deltaA === 0 && rbId.deltaB === 0 && rbId.swapSellAmount === 0);
near("REB identity target is Tool 9's position", rbId.targetA, 100, 1e-9);
near("REB identity target B", rbId.targetB, 100, 1e-9);
/* price moved to 1.2 inside the old range: drifted mix re-centres to 0.96-1.5 */
const rb12 = app.clmmRebalance(L36, "0.8", "1.25", "1.2", "25");
near("REB moved new lower", rb12.newLower, 0.96, 1e-12);
near("REB moved new upper", rb12.newUpper, 1.5, 1e-12);
near("REB moved current A is Tool 9's", rb12.curA, app.clmmPositionAtPrice(L36, "0.8", "1.25", "1.2").amountA, 1e-9);
near("REB moved current B is Tool 9's", rb12.curB, app.clmmPositionAtPrice(L36, "0.8", "1.25", "1.2").amountB, 1e-9);
near("REB moved new liquidity", rb12.newLiquidity, 913.8457910361178, 1e-9);
near("REB moved target A", rb12.targetA, 88.07129250987332, 1e-9);
near("REB moved target B", rb12.targetB, 105.68555101184802, 1e-9);
near("REB moved target splits value 50/50", rb12.targetBValuePct, 50, 1e-9);
near("REB moved preserves total value", rb12.targetA * 1.2 + rb12.targetB, rb12.valueInB, 1e-9);
check("REB moved swap buys A with B", rb12.swapSide === "buyA" && rb12.swapSellToken === "B" && rb12.swapBuyToken === "A");
near("REB moved swap sells the B delta", rb12.swapSellAmount, -rb12.deltaB, 1e-9);
near("REB moved swap buys the A delta", rb12.swapBuyAmount, rb12.deltaA, 1e-9);
near("REB moved swap priced at spot", rb12.swapSellAmount, rb12.deltaA * 1.2, 1e-9);
near("REB moved up room", rb12.upRoomPct, 25, 1e-9);
near("REB moved down room", rb12.downRoomPct, 20, 1e-9);
/* Tool 9 at the new liquidity in the new range returns the target holdings */
const rb12Pos = app.clmmPositionAtPrice(String(rb12.newLiquidity), String(rb12.newLower), String(rb12.newUpper), "1.2");
near("REB Tool 9 returns target A", rb12Pos.amountA, rb12.targetA, 1e-9);
near("REB Tool 9 returns target B", rb12Pos.amountB, rb12.targetB, 1e-9);
/* price above the old range: entirely B, exactly half its value swaps into A */
const rbAbove = app.clmmRebalance(L36, "0.8", "1.25", "2", "25");
check("REB above range is entirely B", rbAbove.curStatus === "above" && rbAbove.curA === 0);
near("REB above current B", rbAbove.curB, 211.8033988749895, 1e-9);
near("REB above new liquidity", rbAbove.newLiquidity, 709.3096273622167, 1e-9);
near("REB above swaps half the value", rbAbove.swapSellAmount, rbAbove.valueInB / 2, 1e-9);
check("REB above swap buys A", rbAbove.swapSide === "buyA");
/* price below the old range: the mirror — entirely A, half its value swaps into B */
const rbBelow = app.clmmRebalance(L36, "0.8", "1.25", "0.5", "25");
check("REB below range is entirely A", rbBelow.curStatus === "below" && rbBelow.curB === 0);
near("REB below new liquidity mirrors above", rbBelow.newLiquidity, rbAbove.newLiquidity, 1e-9);
near("REB below target A mirrors above target B", rbBelow.targetA, rbAbove.targetB, 1e-9);
check("REB below swap sells A", rbBelow.swapSide === "sellA" && rbBelow.swapSellToken === "A" && rbBelow.swapBuyToken === "B");
near("REB below swap priced at spot", rbBelow.swapBuyAmount, rbBelow.swapSellAmount * 0.5, 1e-9);
/* a narrower re-centre at the same centre keeps the holdings, raises L */
const rbNarrow = app.clmmRebalance(L36, "0.8", "1.25", "1", "10");
near("REB narrower range raises liquidity", rbNarrow.newLiquidity, 2148.8088481701507, 1e-6);
check("REB narrower liquidity exceeds the old", rbNarrow.newLiquidity > 947.2135954999577);
near("REB narrower target A unchanged", rbNarrow.targetA, 100, 1e-6);
near("REB narrower target B unchanged", rbNarrow.targetB, 100, 1e-6);
near("REB narrower swap is ~zero", rbNarrow.swapSellAmount, 0, 1e-6);
check("REB narrower same-centre needs NO swap (dust delta is not a swap)", rbNarrow.swapSide === "none" && rbNarrow.deltaA === 0 && rbNarrow.deltaB === 0 && rbNarrow.swapSellAmount === 0 && rbNarrow.swapBuyAmount === 0);
const rbWide = app.clmmRebalance(L36, "0.8", "1.25", "1", "50");
check("REB wider same-centre needs NO swap", rbWide.swapSide === "none" && rbWide.swapSellAmount === 0);
near("REB wider target A unchanged", rbWide.targetA, 100, 1e-6);
near("REB wider target B unchanged", rbWide.targetB, 100, 1e-6);
/* composition sweep: value preserved, target 50/50, swap identity deltaB = -deltaA * P */
for (const [l, lo, hi, cur, w] of [[L36, "0.8", "1.25", "1.1", "20"], [L36, "0.8", "1.25", "0.9", "50"], ["500", "0.5", "2", "1.7", "10"], ["250", "2", "4.5", "3", "33"], [L36, "0.8", "1.25", "1.25", "25"]]) {
  const p = app.clmmRebalance(l, lo, hi, cur, w);
  check("REB sweep settles at L " + l + " price " + cur + " width " + w, p !== null);
  near("REB sweep preserves value at price " + cur + " width " + w, p.targetA * Number(cur) + p.targetB, p.valueInB, 1e-6);
  near("REB sweep target 50/50 at price " + cur + " width " + w, p.targetBValuePct, 50, 1e-9);
  near("REB sweep swap identity at price " + cur + " width " + w, p.deltaB + p.deltaA * Number(cur), 0, 1e-6);
  near("REB sweep range centred at price " + cur + " width " + w, Math.sqrt(p.newLower * p.newUpper), Number(cur), 1e-9);
}
/* rejections */
check("REB rejects blank fields", app.clmmRebalance("", "0.8", "1.25", "1", "25") === null && app.clmmRebalance(L36, "", "1.25", "1", "25") === null && app.clmmRebalance(L36, "0.8", "1.25", "1", "") === null);
check("REB rejects non-positive liquidity, price or width", app.clmmRebalance("0", "0.8", "1.25", "1", "25") === null && app.clmmRebalance(L36, "0.8", "1.25", "0", "25") === null && app.clmmRebalance(L36, "0.8", "1.25", "1", "0") === null && app.clmmRebalance(L36, "0.8", "1.25", "1", "-25") === null);
check("REB rejects inverted range and non-numeric input", app.clmmRebalance(L36, "1.25", "0.8", "1", "25") === null && app.clmmRebalance(L36, "0.8", "0.8", "1", "25") === null && app.clmmRebalance("abc", "0.8", "1.25", "1", "25") === null);
check("REB rejects a width whose range leaves the tick range", app.clmmRebalance(L36, "0.8", "1.25", "1", "1e30") === null);
check("all reb controls labelled", ["reb-l", "reb-lower", "reb-upper", "reb-cur", "reb-width", "reb-out"].every(id => html.includes(`for="${id}"`)));
check("reb tool present in index.html", html.includes('id="reb-calc"') && html.includes('id="reb-result"'));
check("reb honesty: spot-priced swap and not-live labels", html.includes("priced at the current spot price") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers re-centring a drifted position", guide.includes("Re-centre a position the price has drifted"));

/* ---------- Tool 37: CLMM withdrawal planner (CWD) ---------- */
const L37 = "947.2135954999577";
/* headline: withdrawing half the 0.8-1.25 position at price 1 pays half its holdings */
const cw50 = app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "50");
near("CWD headline pays half the A", cw50.outA, 50, 1e-9);
near("CWD headline pays half the B", cw50.outB, 50, 1e-9);
near("CWD headline halves the liquidity", cw50.remainingLiquidity, 473.60679774997885, 1e-9);
near("CWD headline leaves half the A", cw50.remainingA, 50, 1e-9);
near("CWD headline leaves half the B", cw50.remainingB, 50, 1e-9);
near("CWD headline payout value", cw50.outValueInB, 100, 1e-9);
check("CWD headline is not a full close", cw50.fullClose === false && cw50.status === "in" && cw50.inRange === true);
/* the payout and the remainder are tool 9's own amounts, split by the percentage */
const cwT9 = app.clmmPositionAtPrice(L37, "0.8", "1.25", "1");
near("CWD payout + remainder = tool 9 A", cw50.outA + cw50.remainingA, cwT9.amountA, 1e-9);
near("CWD payout + remainder = tool 9 B", cw50.outB + cw50.remainingB, cwT9.amountB, 1e-9);
near("CWD values sum to tool 9 value", cw50.outValueInB + cw50.remainingValueInB, cwT9.valueInB, 1e-9);
/* 100% is the full close: tool 9's amounts verbatim, nothing left */
const cw100 = app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "100");
near("CWD full close pays tool 9 A", cw100.outA, cwT9.amountA, 1e-9);
near("CWD full close pays tool 9 B", cw100.outB, cwT9.amountB, 1e-9);
check("CWD full close leaves nothing", cw100.fullClose === true && cw100.remainingLiquidity === 0 && cw100.remainingA === 0 && cw100.remainingB === 0 && cw100.remainingValueInB === 0);
/* price moved to 1.2: the drifted mix (tool 9) is what gets split */
const cw12 = app.clmmWithdrawPlan(L37, "0.8", "1.25", "1.2", "25");
const cw12T9 = app.clmmPositionAtPrice(L37, "0.8", "1.25", "1.2");
near("CWD moved position A is tool 9's", cw12.curA, cw12T9.amountA, 1e-9);
near("CWD moved position B is tool 9's", cw12.curB, cw12T9.amountB, 1e-9);
near("CWD moved pays a quarter of A", cw12.outA, 4.367539887885892, 1e-9);
near("CWD moved pays a quarter of B", cw12.outB, 47.60172764046092, 1e-9);
near("CWD moved remaining liquidity", cw12.remainingLiquidity, 710.4101966249683, 1e-9);
near("CWD moved payout value", cw12.outValueInB, 52.842775505923996, 1e-9);
/* the remainder is tool 9 at the reduced liquidity, same range and price */
const cw12Rem9 = app.clmmPositionAtPrice(String(cw12.remainingLiquidity), "0.8", "1.25", "1.2");
near("CWD remainder is tool 9 at reduced L (A)", cw12.remainingA, cw12Rem9.amountA, 1e-9);
near("CWD remainder is tool 9 at reduced L (B)", cw12.remainingB, cw12Rem9.amountB, 1e-9);
/* below the range the withdrawal is token A alone; above it, token B alone — and they mirror */
const cwBelow = app.clmmWithdrawPlan(L37, "0.8", "1.25", "0.5", "40");
check("CWD below range is entirely A", cwBelow.status === "below" && cwBelow.outB === 0 && cwBelow.remainingB === 0);
near("CWD below pays 40% of the A held", cwBelow.outA, 84.72135954999581, 1e-9);
near("CWD below leaves 60% of the A", cwBelow.remainingA, 127.08203932499369, 1e-9);
const cwAbove = app.clmmWithdrawPlan(L37, "0.8", "1.25", "2", "40");
check("CWD above range is entirely B", cwAbove.status === "above" && cwAbove.outA === 0 && cwAbove.remainingA === 0);
near("CWD above payout mirrors below", cwAbove.outB, cwBelow.outA, 1e-9);
near("CWD above remainder mirrors below", cwAbove.remainingB, cwBelow.remainingA, 1e-9);
/* composition sweep: payout is the percentage of tool 9, halves conserve, remainder is tool 9 reduced */
for (const [l, lo, hi, p, w] of [[L37, "0.8", "1.25", "1.1", "33.333"], ["500", "0.5", "2", "1.7", "75"], ["250", "2", "4.5", "3", "10"], [L37, "0.8", "1.25", "0.7", "99.9"], [L37, "0.8", "1.25", "1.25", "60"]]) {
  const r = app.clmmWithdrawPlan(l, lo, hi, p, w);
  const t9 = app.clmmPositionAtPrice(l, lo, hi, p);
  check("CWD sweep settles at L " + l + " price " + p + " pct " + w, r !== null);
  near("CWD sweep payout is pct of tool 9 A at price " + p + " pct " + w, r.outA, t9.amountA * Number(w) / 100, 1e-6);
  near("CWD sweep payout is pct of tool 9 B at price " + p + " pct " + w, r.outB, t9.amountB * Number(w) / 100, 1e-6);
  near("CWD sweep halves conserve A at price " + p + " pct " + w, r.outA + r.remainingA, t9.amountA, 1e-6);
  near("CWD sweep halves conserve B at price " + p + " pct " + w, r.outB + r.remainingB, t9.amountB, 1e-6);
  near("CWD sweep values conserve at price " + p + " pct " + w, r.outValueInB + r.remainingValueInB, t9.valueInB, 1e-6);
  const rem9 = app.clmmPositionAtPrice(String(r.remainingLiquidity), lo, hi, p);
  near("CWD sweep remainder is tool 9 reduced at price " + p + " pct " + w, r.remainingA + r.remainingB, rem9.amountA + rem9.amountB, 1e-6);
}
/* rejections */
check("CWD rejects blank fields", app.clmmWithdrawPlan("", "0.8", "1.25", "1", "50") === null && app.clmmWithdrawPlan(L37, "", "1.25", "1", "50") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", " ", "50") === null);
check("CWD rejects a percentage outside (0, 100]", app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "0") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "-10") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "100.5") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "101") === null);
check("CWD rejects non-positive liquidity or price", app.clmmWithdrawPlan("0", "0.8", "1.25", "1", "50") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", "0", "50") === null);
check("CWD rejects inverted range and non-numeric input", app.clmmWithdrawPlan(L37, "1.25", "0.8", "1", "50") === null && app.clmmWithdrawPlan(L37, "0.8", "0.8", "1", "50") === null && app.clmmWithdrawPlan("abc", "0.8", "1.25", "1", "50") === null && app.clmmWithdrawPlan(L37, "0.8", "1.25", "1", "abc") === null);
check("all cwd controls labelled", ["cwd-l", "cwd-lower", "cwd-upper", "cwd-price", "cwd-pct", "cwd-outb"].every(id => html.includes(`for="${id}"`)));
check("cwd tool present in index.html", html.includes('id="cwd-calc"') && html.includes('id="cwd-result"'));
check("cwd honesty: fees-separate and not-live labels", html.includes("collects accrued fees separately") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers sizing a CLMM withdrawal", guide.includes("Size a CLMM exit before you make it"));

/* ---------- 38 · constant-product wallet-balance deposit planner ---------- */
/* headline: balanced pool, balanced balances — both used in full */
const cpw1 = app.cpWalletPlan("1000", "1000", "100", "100");
check("CPW balanced settles", cpw1 !== null);
check("CPW balanced uses both in full", cpw1.usedA === "100" && cpw1.usedB === "100" && cpw1.leftoverA === "0" && cpw1.leftoverB === "0");
check("CPW balanced limiting is both", cpw1.limiting === "both");
near("CPW balanced share", cpw1.sharePct, 9.090909090909092, 1e-9);
check("CPW balanced new reserves", cpw1.newReserveA === "1100" && cpw1.newReserveB === "1100");
/* A-limited: 1000/500 pool, 100 A needs only 50 B of the 100 B held */
const cpw2 = app.cpWalletPlan("1000", "500", "100", "100");
check("CPW A-limited settles", cpw2 !== null && cpw2.limiting === "A");
check("CPW A-limited uses A in full, B partly", cpw2.usedA === "100" && cpw2.usedB === "50" && cpw2.leftoverA === "0" && cpw2.leftoverB === "50");
check("CPW A-limited new reserves", cpw2.newReserveA === "1100" && cpw2.newReserveB === "550");
/* B-limited mirror: only 25 B held caps the deposit at 50 A */
const cpw3 = app.cpWalletPlan("1000", "500", "100", "25");
check("CPW B-limited settles", cpw3 !== null && cpw3.limiting === "B");
check("CPW B-limited uses B in full, A partly", cpw3.usedA === "50" && cpw3.usedB === "25" && cpw3.leftoverA === "50" && cpw3.leftoverB === "0");
near("CPW B-limited share", cpw3.sharePct, 4.761904761904762, 1e-9);
/* exact-ratio balances on an asymmetric pool are used in full */
const cpw4 = app.cpWalletPlan("2000", "1000", "40", "20");
check("CPW exact-ratio limiting is both", cpw4 !== null && cpw4.limiting === "both" && cpw4.leftoverA === "0" && cpw4.leftoverB === "0");
/* the 9dp dust case: B-limited at 3000/700 with 10 B leaves exactly one scaled unit of B */
const cpwDust = app.cpWalletPlan("3000", "700", "123.456", "10");
check("CPW dust settles B-limited", cpwDust !== null && cpwDust.limiting === "B");
check("CPW dust used amounts", cpwDust.usedA === "42.857142857" && cpwDust.usedB === "9.999999999");
check("CPW dust leftover is exactly one unit of B", cpwDust.leftoverB === "0.000000001" && cpwDust.leftoverA === "80.598857143");
/* composition sweep: legs are tool 5 verbatim, balances conserve in scaled BigInt, limiting side behaves */
for (const [ra, rb, ba, bb] of [["1000", "1000", "100", "100"], ["1000", "500", "100", "25"], ["5000", "1234", "77.7", "3.3"], ["250", "4000", "999", "1"], ["123456", "654321", "111.111", "222.222"], ["1000000", "500000", "10000", "4000"], ["3000", "700", "10", "123.456"]]) {
  const r = app.cpWalletPlan(ra, rb, ba, bb);
  check("CPW sweep settles at " + ra + "/" + rb + " bal " + ba + "/" + bb, r !== null);
  const dp = app.depositPlan(ra, rb, r.usedA);
  check("CPW sweep used B is tool 5 requiredB at " + ra + "/" + rb + " bal " + ba + "/" + bb, dp.requiredB === r.usedB);
  near("CPW sweep share is tool 5 share at " + ra + "/" + rb + " bal " + ba + "/" + bb, r.sharePct, dp.sharePct, 1e-12);
  check("CPW sweep A conserves at " + ra + "/" + rb + " bal " + ba + "/" + bb, app.parseScaled(r.usedA) + app.parseScaled(r.leftoverA) === app.parseScaled(ba));
  check("CPW sweep B conserves at " + ra + "/" + rb + " bal " + ba + "/" + bb, app.parseScaled(r.usedB) + app.parseScaled(r.leftoverB) === app.parseScaled(bb));
  check("CPW sweep new reserves are tool 5 at " + ra + "/" + rb + " bal " + ba + "/" + bb, r.newReserveA === dp.newReserveA && r.newReserveB === dp.newReserveB);
  if (r.limiting === "A") check("CPW sweep A-limited leaves A empty, B over at " + ra + "/" + rb, r.leftoverA === "0" && app.parseScaled(r.leftoverB) > 0n);
  if (r.limiting === "B") check("CPW sweep B-limited leaves A over, B flooring-dust only at " + ra + "/" + rb, app.parseScaled(r.leftoverA) > 0n && app.parseScaled(r.leftoverB) <= BigInt(Math.ceil(Number(rb) / Number(ra)) + 1));
  if (r.limiting === "both") check("CPW sweep both leaves nothing at " + ra + "/" + rb, r.leftoverA === "0" && r.leftoverB === "0");
}
/* rejections */
check("CPW rejects blank fields", app.cpWalletPlan("", "1000", "100", "100") === null && app.cpWalletPlan("1000", "1000", "", "100") === null && app.cpWalletPlan("1000", "1000", "100", " ") === null);
check("CPW rejects a zero balance on either side", app.cpWalletPlan("1000", "1000", "0", "100") === null && app.cpWalletPlan("1000", "1000", "100", "0") === null);
check("CPW rejects zero reserves", app.cpWalletPlan("0", "1000", "100", "100") === null && app.cpWalletPlan("1000", "0", "100", "100") === null);
check("CPW rejects junk and negatives", app.cpWalletPlan("1000", "1000", "abc", "100") === null && app.cpWalletPlan("1000", "1000", "-5", "100") === null && app.cpWalletPlan("1000", "1000", "100", "1.0000000001") === null);
check("CPW rejects a deposit whose other leg floors to zero", app.cpWalletPlan("1000000", "1", "0.000000001", "100") === null);
check("all cpw controls labelled", ["cpw-ra", "cpw-rb", "cpw-bal-a", "cpw-bal-b", "cpw-outb"].every(id => html.includes(`for="${id}"`)));
check("cpw tool present in index.html", html.includes('id="cpw-calc"') && html.includes('id="cpw-result"'));
check("cpw honesty: dust and not-live labels", html.includes("smallest units of token B behind as dust") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers planning a CP deposit from a wallet", guide.includes("Plan a constant-product deposit from your wallet"));

/* ---------- 39 · two-hop exact-out swap model ---------- */
/* headline: balanced 1000/1000 pools, 25 bps both, exactly 100 C wanted */
const hxo1 = app.twoHopExactOut("1000", "1000", "1000", "1000", "100", 25, 25);
check("HXO headline settles", hxo1 !== null);
check("HXO headline amounts", hxo1.amountIn === "125.666720863" && hxo1.midIn === "111.389585075" && hxo1.out === "100");
check("HXO out is canonical for padded spellings", app.twoHopExactOut("1000", "1000", "1000", "1000", "100.00", 25, 25).out === "100" && app.twoHopExactOut("1000", "1000", "1000", "1000", " 100 ", 25, 25).out === "100" && app.twoHopExactOut("1000", "1000", "1000", "1000", "0100", 25, 25).out === "100");
near("HXO headline combined impact", hxo1.priceImpactPct, 20.42443750162103, 1e-9);
near("HXO headline spot is product of hops", hxo1.spotPrice, 1, 1e-12);
check("HXO combined impact worse than either hop", hxo1.priceImpactPct > hxo1.hop1ImpactPct && hxo1.priceImpactPct > hxo1.hop2ImpactPct);
/* zero fee: closed form — hop 2 needs 1000/9 M, hop 1 needs 125 A (plus ceiling dust) */
const hxo0 = app.twoHopExactOut("1000", "1000", "1000", "1000", "100", 0, 0);
check("HXO zero-fee amounts", hxo0 !== null && hxo0.amountIn === "125.000000002" && hxo0.midIn === "111.111111112");
near("HXO zero-fee impact is exactly the two 10% legs compounded", hxo0.priceImpactPct, 20, 1e-6);
/* asymmetric pools and fees */
const hxo2 = app.twoHopExactOut("2000", "500", "3000", "9000", "450", 25, 100);
check("HXO asym amounts", hxo2 !== null && hxo2.amountIn === "939.115939743" && hxo2.midIn === "159.489633175");
near("HXO asym spot", hxo2.spotPrice, 0.75, 1e-12);
near("HXO asym combined impact", hxo2.priceImpactPct, 36.110125000732396, 1e-9);
/* composition sweep: legs are tool 6 verbatim, round-trip through tool 23 returns at least the target */
for (const [r1i, r1o, r2i, r2o, t, f1, f2] of [["1000", "1000", "1000", "1000", "100", 25, 25], ["2000", "500", "3000", "9000", "450", 25, 100], ["500", "5000", "800", "200", "50", 0, 50], ["10000", "2000", "400", "4000", "300", 100, 25], ["1000", "1000", "1000", "1000", "0.5", 25, 25]]) {
  const r = app.twoHopExactOut(r1i, r1o, r2i, r2o, t, f1, f2);
  check("HXO sweep settles at target " + t, r !== null);
  check("HXO sweep mid is tool 6 hop-2 verbatim at target " + t, r.midIn === app.cpSwapExactOut(r2i, r2o, t, f2).amountIn);
  check("HXO sweep in is tool 6 hop-1 verbatim at target " + t, r.amountIn === app.cpSwapExactOut(r1i, r1o, r.midIn, f1).amountIn);
  const fwd = app.twoHopSwap(r1i, r1o, r2i, r2o, r.amountIn, f1, f2);
  check("HXO sweep round-trip returns at least the target at " + t, fwd !== null && Number(fwd.out) >= Number(t) && Number(fwd.out) - Number(t) <= 0.000001);
  near("HXO sweep spot is product of hop spots at target " + t, r.spotPrice, app.cpSwapExactOut(r1i, r1o, r.midIn, f1).spotPrice * app.cpSwapExactOut(r2i, r2o, t, f2).spotPrice, 1e-12);
}
/* a bigger target costs more in; hop 1's fee never changes the M hop 2 needs */
const hxoSmall = app.twoHopExactOut("1000", "1000", "1000", "1000", "10", 25, 25);
check("HXO larger target needs larger input", Number(hxoSmall.amountIn) < Number(hxo1.amountIn));
check("HXO hop-1 fee leaves mid unchanged", app.twoHopExactOut("1000", "1000", "1000", "1000", "100", 100, 25).midIn === hxo1.midIn);
/* rejections */
check("HXO rejects blank fields", app.twoHopExactOut("", "1000", "1000", "1000", "100", 25, 25) === null && app.twoHopExactOut("1000", "1000", "1000", "1000", " ", 25, 25) === null);
check("HXO rejects target at or above pool 2 out reserve", app.twoHopExactOut("1000", "1000", "1000", "1000", "1000", 25, 25) === null && app.twoHopExactOut("1000", "1000", "1000", "1000", "1001", 25, 25) === null);
check("HXO rejects a route whose mid need drains pool 1", app.twoHopExactOut("1000", "50", "1000", "1000", "100", 25, 25) === null);
check("HXO rejects zero target, junk and negatives", app.twoHopExactOut("1000", "1000", "1000", "1000", "0", 25, 25) === null && app.twoHopExactOut("1000", "1000", "abc", "1000", "100", 25, 25) === null && app.twoHopExactOut("1000", "1000", "1000", "1000", "-5", 25, 25) === null);
check("HXO rejects bad fees on either hop", app.twoHopExactOut("1000", "1000", "1000", "1000", "100", 10000, 25) === null && app.twoHopExactOut("1000", "1000", "1000", "1000", "100", 25, -1) === null);
check("all hxo controls labelled", ["hxo-r1in", "hxo-r1out", "hxo-r2in", "hxo-r2out", "hxo-aout", "hxo-fee1", "hxo-fee2", "hxo-ain"].every(id => html.includes(`for="${id}"`)));
check("hxo tool present in index.html", html.includes('id="hxo-calc"') && html.includes('id="hxo-result"'));
check("hxo honesty: backwards legs and not-live labels", html.includes("works backwards with tool 6's own maths") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers two-hop exact-out", guide.includes("Price a routed trade backwards from the amount you need"));

/* ---------- Tool 40: Constant-product break-even days calculator (CPBED) ---------- */
const cpbed1 = app.cpBreakEvenDays(2, "1000", "1000000", 25, "10000", "1000000");
check("CPBED headline settles", cpbed1 !== null);
near("CPBED headline hurdle", cpbed1.feesNeeded, 85.7864376269049, 1e-9);
near("CPBED headline daily fees", cpbed1.dailyFees, 25, 1e-12);
check("CPBED headline share pct", cpbed1.sharePct === 1);
near("CPBED headline days", cpbed1.daysToBreakEven, 3.431457505076196, 1e-12);
check("CPBED hurdle equals Tool 4 exactly", cpbed1.feesNeeded === app.breakEvenFees(2, "1000").feesNeeded);
check("CPBED rate equals Tool 3 exactly", cpbed1.dailyFees === app.lpFees("1000000", 25, "10000", "1000000").dailyFees);
check("CPBED days equal Tool 4 fed Tool 3's daily exactly", cpbed1.daysToBreakEven === app.breakEvenFees(2, "1000", String(app.lpFees("1000000", 25, "10000", "1000000").dailyFees)).daysToBreakEven);
near("CPBED Tool 32 backwards from headline days returns headline volume", app.cpRequiredVolume(2, "1000", "10000", "1000000", 25, String(cpbed1.daysToBreakEven)).requiredVolumePerDay, 1000000, 1e-6);
const cpbed4 = app.cpBreakEvenDays(4, "1000", "800000", 25, "10000", "1000000");
near("CPBED 4x hurdle", cpbed4.feesNeeded, 500, 1e-9);
near("CPBED 4x days", cpbed4.daysToBreakEven, 25, 1e-12);
near("CPBED halving days", app.cpBreakEvenDays(0.5, "1000", "1000000", 25, "10000", "1000000").daysToBreakEven, 1.715728752538098, 1e-12);
for (const r of [0.25, 0.5, 1.5, 2, 4]) {
  const x = app.cpBreakEvenDays(r, "2500", "777777", 30, "12345", "987654");
  near("CPBED sweep hurdle = Tool 4 at ratio " + r, x.feesNeeded, app.breakEvenFees(r, "2500").feesNeeded, 1e-9);
  check("CPBED sweep daily = Tool 3 at ratio " + r, x.dailyFees === app.lpFees("777777", 30, "12345", "987654").dailyFees);
  check("CPBED sweep days = hurdle / daily at ratio " + r, x.daysToBreakEven === x.feesNeeded / x.dailyFees);
}
near("CPBED doubling volume halves days", app.cpBreakEvenDays(2, "1000", "2000000", 25, "10000", "1000000").daysToBreakEven, cpbed1.daysToBreakEven / 2, 1e-12);
near("CPBED doubling share halves days", app.cpBreakEvenDays(2, "1000", "1000000", 25, "20000", "1000000").daysToBreakEven, cpbed1.daysToBreakEven / 2, 1e-12);
check("CPBED no price move is 0 days", app.cpBreakEvenDays(1, "1000", "1000000", 25, "10000", "1000000").daysToBreakEven === 0);
check("CPBED no price move is 0 days even at zero volume and zero fee tier",
  app.cpBreakEvenDays(1, "1000", "0", 0, "10000", "1000000").daysToBreakEven === 0);
check("CPBED real hurdle with zero volume never breaks even", app.cpBreakEvenDays(2, "1000", "0", 25, "10000", "1000000").daysToBreakEven === Infinity);
check("CPBED real hurdle with zero fee tier never breaks even", app.cpBreakEvenDays(2, "1000", "1000000", 0, "10000", "1000000").daysToBreakEven === Infinity);
check("CPBED rejects blank fields", app.cpBreakEvenDays(2, "", "1000000", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", " ", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", "", "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", 25, "", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", 25, "10000", "") === null);
check("CPBED rejects your liquidity above TVL", app.cpBreakEvenDays(2, "1000", "1000000", 25, "1000001", "1000000") === null);
check("CPBED rejects zero or negative share as no position, not never", app.cpBreakEvenDays(2, "1000", "1000000", 25, "0", "1000000") === null && app.cpBreakEvenDays(1, "1000", "1000000", 25, "0", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", 25, "-5", "1000000") === null);
check("CPBED rejects zero or negative deposit and volume", app.cpBreakEvenDays(2, "0", "1000000", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "-5", "1000000", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "-1", 25, "10000", "1000000") === null);
check("CPBED rejects bad ratio, junk and bad fee tier", app.cpBreakEvenDays(0, "1000", "1000000", 25, "10000", "1000000") === null && app.cpBreakEvenDays(-2, "1000", "1000000", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "abc", "1000000", 25, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", 10001, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", -1, "10000", "1000000") === null && app.cpBreakEvenDays(2, "1000", "1000000", 25.5, "10000", "1000000") === null);
check("all cpbed controls labelled", ["cpbed-ratio", "cpbed-deposit", "cpbed-volume", "cpbed-bps", "cpbed-your", "cpbed-tvl", "cpbed-out"].every(id => html.includes(`for="${id}"`)));
check("cpbed tool present in index.html", html.includes('id="cpbed-calc"') && html.includes('id="cpbed-result"'));
check("cpbed honesty: joined tools and not-live labels", html.includes("This joins them") && html.includes("not live pool state") && html.includes("not a forecast") && html.includes("never breaks even"));
check("guide covers CP break-even days", guide.includes("Ask how long break-even takes, in days"));

/* ---------- Tool 41: Split-route exact-out swap model (SXO) ---------- */
const sxo1 = app.splitExactOut("1000", "1000", "1000", "1000", "100", 25, 25);
check("SXO headline settles", sxo1 !== null);
check("SXO headline amounts", sxo1.totalIn === "105.526975335" && sxo1.in1 === "52.762998935" && sxo1.in2 === "52.7639764" && sxo1.out1 === "49.999560021" && sxo1.out2 === "50.000439979");
check("SXO headline total out is the canonical target", sxo1.totalOut === "100" && app.splitExactOut("1000", "1000", "1000", "1000", "100.00", 25, 25).totalOut === "100");
check("SXO headline singles and best single", sxo1.single1In === "111.389585075" && sxo1.single2In === "111.389585075" && sxo1.bestSingleIn === "111.389585075");
near("SXO headline saving vs best single", sxo1.savingVsBestSingle, 5.86260974, 1e-9);
near("SXO headline split is about even", sxo1.splitPct1, 49.999560021, 1e-9);
check("SXO headline legs are Tool 6 verbatim", app.cpSwapExactOut("1000", "1000", sxo1.out1, 25).amountIn === sxo1.in1 && app.cpSwapExactOut("1000", "1000", sxo1.out2, 25).amountIn === sxo1.in2);
check("SXO headline leg outs sum exactly to the target", app.parseScaled(sxo1.out1) + app.parseScaled(sxo1.out2) === app.parseScaled("100"));
check("SXO headline leg ins sum exactly to the total in", app.parseScaled(sxo1.in1) + app.parseScaled(sxo1.in2) === app.parseScaled(sxo1.totalIn));
check("SXO headline round-trip: paying each leg's in forward returns at least its out",
  app.parseScaled(app.cpSwap("1000", "1000", sxo1.in1, 25).out) >= app.parseScaled(sxo1.out1) &&
  app.parseScaled(app.cpSwap("1000", "1000", sxo1.in2, 25).out) >= app.parseScaled(sxo1.out2));
const sxo0 = app.splitExactOut("1000", "1000", "1000", "1000", "100", 0, 0);
check("SXO zero-fee amounts", sxo0 !== null && sxo0.totalIn === "105.263157896" && sxo0.bestSingleIn === "111.111111112");
near("SXO zero-fee total is the closed form plus ceiling dust", Number(sxo0.totalIn), 2 * 1000 * 50 / 950, 2e-9);
const sxoDeep = app.splitExactOut("1000", "1000", "10000", "10000", "100", 25, 25);
check("SXO deep pool takes most of the target", sxoDeep !== null && sxoDeep.splitPct1 < 10 && sxoDeep.totalIn === "101.170357088" && sxoDeep.bestSingleIn === "101.263259159");
const sxoDeep500 = app.splitExactOut("1000", "1000", "10000", "10000", "500", 25, 25);
check("SXO deep pool at target 500", sxoDeep500 !== null && sxoDeep500.totalIn === "525.122329636" && sxoDeep500.bestSingleIn === "527.634876666" && sxoDeep500.splitPct1 > 9 && sxoDeep500.splitPct1 < 9.2);
const sxoFee = app.splitExactOut("1000", "1000", "1000", "1000", "100", 25, 100);
check("SXO cheaper-fee pool takes the larger share", sxoFee !== null && sxoFee.splitPct1 > 51 && sxoFee.splitPct1 < 53 && sxoFee.totalIn === "105.919156749");
const sxoSpot = app.splitExactOut("500", "2000", "2000", "500", "200", 30, 5);
check("SXO much better spot price takes the whole target", sxoSpot !== null && sxoSpot.out1 === "200" && sxoSpot.out2 === "0" && sxoSpot.totalIn === "55.722723728" && sxoSpot.totalIn === sxoSpot.single1In);
const sxoOnly = app.splitExactOut("1000", "1000", "1000", "1000", "1500", 25, 25);
check("SXO target no single pool can supply still settles split", sxoOnly !== null && sxoOnly.out1 === "750" && sxoOnly.out2 === "750" && sxoOnly.totalIn === "6015.037593986");
check("SXO split-only case honestly has no single-pool comparison", sxoOnly.single1In === null && sxoOnly.single2In === null && sxoOnly.bestSingleIn === null && sxoOnly.savingVsBestSingle === null);
const sxoDrain = app.splitExactOut("1000", "1000", "1000", "1000", "1999", 25, 25);
check("SXO near-drain target settles evenly", sxoDrain !== null && sxoDrain.splitPct1 === 50 && sxoDrain.bestSingleIn === null);
const sxoBand = app.splitExactOut("1176.977373", "1113.301880", "3852.772630", "4812.490857", "4671.588778", 100, 100);
check("SXO narrow feasible band finds the split optimum, not the endpoint", sxoBand !== null && sxoBand.totalIn === "18846.924178173" && sxoBand.out1 === "849.906200105" && app.parseScaled(sxoBand.totalIn) < app.parseScaled(sxoBand.bestSingleIn) / 6n);
const sxoUnique = app.splitExactOut("1000", "100", "1000", "150", "249.999999998", 25, 25);
check("SXO single-point feasible band settles on the unique split", sxoUnique !== null && sxoUnique.out1 === "99.999999999" && sxoUnique.out2 === "149.999999999");
check("SXO max feasible combined target is two units below the combined reserves",
  app.splitExactOut("1000", "60", "1000", "60", "119.999999998", 25, 25) !== null &&
  app.splitExactOut("1000", "60", "1000", "60", "119.999999999", 25, 25) === null);
check("SXO target at or above the combined reserves is rejected, not priced",
  app.splitExactOut("1000", "1000", "1000", "1000", "2000", 25, 25) === null &&
  app.splitExactOut("1000", "1000", "1000", "1000", "2500", 25, 25) === null);
const sxoFallback = app.splitExactOut("1000", "1000", "1000", "1000", "100", 10000, 25);
check("SXO unusable pool is routed around entirely", sxoFallback !== null && sxoFallback.out1 === "0" && sxoFallback.in1 === "0" && sxoFallback.totalIn === sxoFallback.single2In);
check("SXO blank pool falls back, blank target is rejected",
  app.splitExactOut("", "1000", "1000", "1000", "100", 25, 25).totalIn === "111.389585075" &&
  app.splitExactOut("1000", "1000", "1000", "1000", "", 25, 25) === null &&
  app.splitExactOut("1000", "1000", "1000", "1000", " ", 25, 25) === null);
check("SXO both pools unusable is rejected", app.splitExactOut("1000", "1000", "1000", "1000", "100", 10000, -1) === null);
const sxoDust = app.splitExactOut("1000", "1000", "1000", "1000", "0.000000001", 25, 25);
check("SXO dust target settles through one leg", sxoDust !== null && sxoDust.totalIn === "0.000000003" && app.parseScaled(sxoDust.out1) + app.parseScaled(sxoDust.out2) === 1n);
check("SXO rejects zero, negative and junk targets", app.splitExactOut("1000", "1000", "1000", "1000", "0", 25, 25) === null && app.splitExactOut("1000", "1000", "1000", "1000", "-5", 25, 25) === null && app.splitExactOut("1000", "1000", "1000", "1000", "abc", 25, 25) === null);
for (const [r1in, r1out, r2in, r2out, tgt, f1, f2] of [
  ["1000", "1000", "1000", "1000", "100", 25, 25],
  ["1000", "1000", "10000", "10000", "500", 25, 25],
  ["1234", "987", "5555", "4444", "321", 30, 10],
  ["500", "2000", "2000", "500", "200", 30, 5],
  ["777", "3333", "2222", "888", "250", 5, 60]
]) {
  const x = app.splitExactOut(r1in, r1out, r2in, r2out, tgt, f1, f2);
  const tag = "SXO sweep " + tgt + " @" + r1in + "/" + r1out + "+" + r2in + "/" + r2out;
  check(tag + " settles", x !== null);
  check(tag + " outs sum exactly to target", app.parseScaled(x.out1) + app.parseScaled(x.out2) === app.parseScaled(tgt));
  check(tag + " ins sum exactly to total", app.parseScaled(x.in1) + app.parseScaled(x.in2) === app.parseScaled(x.totalIn));
  check(tag + " leg 1 is Tool 6 verbatim", x.out1 === "0" || app.cpSwapExactOut(r1in, r1out, x.out1, f1).amountIn === x.in1);
  check(tag + " leg 2 is Tool 6 verbatim", x.out2 === "0" || app.cpSwapExactOut(r2in, r2out, x.out2, f2).amountIn === x.in2);
  check(tag + " never costs more than the best single pool", x.bestSingleIn === null || app.parseScaled(x.totalIn) <= app.parseScaled(x.bestSingleIn));
  const rt1 = x.in1 === "0" ? 0n : app.parseScaled(app.cpSwap(r1in, r1out, x.in1, f1).out);
  const rt2 = x.in2 === "0" ? 0n : app.parseScaled(app.cpSwap(r2in, r2out, x.in2, f2).out);
  check(tag + " round-trip returns at least each leg's out", rt1 >= app.parseScaled(x.out1) && rt2 >= app.parseScaled(x.out2));
}
check("all sxo controls labelled", ["sxo-r1in", "sxo-r1out", "sxo-fee1", "sxo-r2in", "sxo-r2out", "sxo-fee2", "sxo-aout", "sxo-ain", "sxo-o1", "sxo-o2"].every(id => html.includes(`for="${id}"`)));
check("sxo tool present in index.html", html.includes('id="sxo-calc"') && html.includes('id="sxo-result"'));
check("sxo honesty: composed tools and not-live labels", html.includes("splits the target across them") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("network and transaction costs are not modelled"));
check("guide covers split-route exact-out", guide.includes("Split the target, don't just split the payment"));

/* ---------- Tool 42: CLMM single-range swap model (CSWAP) ---------- */
const CSWAP_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; position holds 100 A / 100 B
const cswAb = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "10", 25, "ab");
check("CSWAP headline settles", cswAb !== null && cswAb.hitBoundary === false && cswAb.unfilledIn === 0);
near("CSWAP headline amount out", cswAb.amountOut, 9.87104909056809, 1e-9);
near("CSWAP headline new price", cswAb.newPrice, 0.9792663126327764, 1e-9);
near("CSWAP headline impact includes the fee", cswAb.priceImpactPct, 1.2895090943191079, 1e-9);
near("CSWAP headline fee paid", cswAb.feePaid, 0.025, 1e-12);
const cswBa = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "10", 25, "ba");
check("CSWAP centred range mirrors both directions", cswBa.amountOut === cswAb.amountOut && cswBa.priceImpactPct === cswAb.priceImpactPct);
near("CSWAP mirror new price", cswBa.newPrice, 1.0211726749912196, 1e-9);
const csw0 = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "10", 0, "ab");
near("CSWAP zero-fee out is the closed form", csw0.amountOut, 947.2135954999577 * (1 - 1 / (1 + 10 / 947.2135954999577)), 1e-9);
check("CSWAP zero-fee charges no fee", csw0.feePaid === 0);
const cswRt = app.clmmSwap(CSWAP_L, "0.8", "1.25", String(csw0.newPrice), String(csw0.amountOut), 0, "ba");
near("CSWAP zero-fee round trip returns the input", cswRt.amountOut, 10, 1e-9);
near("CSWAP zero-fee round trip restores the price", cswRt.newPrice, 1, 1e-9);
const cswBigAb = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "100000", 25, "ab");
check("CSWAP oversized pay-A hits the lower wall", cswBigAb.hitBoundary === true);
near("CSWAP wall pays out every B the position holds (Tool 9)", cswBigAb.amountOut, app.clmmPositionAtPrice(CSWAP_L, "0.8", "1.25", "1").amountB, 1e-9);
near("CSWAP wall new price is the lower edge", cswBigAb.newPrice, 0.8, 1e-9);
near("CSWAP wall used-in is the grossed-up capacity", cswBigAb.usedIn, 947.2135954999577 * (1 / Math.sqrt(0.8) - 1) / 0.9975, 1e-9);
near("CSWAP wall leaves the rest unfilled, not absorbed", cswBigAb.unfilledIn, 100000 - cswBigAb.usedIn, 1e-9);
const cswBigBa = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "100000", 25, "ba");
check("CSWAP oversized pay-B hits the upper wall", cswBigBa.hitBoundary === true);
near("CSWAP upper wall pays out every A the position holds (Tool 9)", cswBigBa.amountOut, app.clmmPositionAtPrice(CSWAP_L, "0.8", "1.25", "1").amountA, 1e-9);
near("CSWAP upper wall new price is the upper edge", cswBigBa.newPrice, 1.25, 1e-9);
const cswCap = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1.2", "30", 25, "ba");
check("CSWAP near the top a modest pay-B still caps", cswCap.hitBoundary === true);
near("CSWAP capped out is the A the position holds at 1.2 (Tool 9)", cswCap.amountOut, app.clmmPositionAtPrice(CSWAP_L, "0.8", "1.25", "1.2").amountA, 1e-9);
near("CSWAP capped used-in", cswCap.usedIn, 21.450113597138653, 1e-9);
const cswTiny = app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "0.01", 25, "ab");
near("CSWAP tiny swap impact is the fee plus a whisper of curve", cswTiny.priceImpactPct, 0.251050444986, 1e-9);
const cswDust = app.clmmSwap("1000000000000", "0.64", "1.44", "1", "0.00005", 0, "ab");
check("CSWAP dust swap against a deep range still settles", cswDust !== null);
near("CSWAP dust swap out is the net in at the spot price", cswDust && cswDust.amountOut, 0.00005, 1e-9);
const cswDustBa = app.clmmSwap("1000000000000", "0.64", "1.44", "1", "0.00005", 0, "ba");
check("CSWAP dust swap paying B still settles", cswDustBa !== null);
near("CSWAP dust swap paying B out is the net in at the spot price", cswDustBa && cswDustBa.amountOut, 0.00005, 1e-9);
check("CSWAP rejects a price at or outside the range", app.clmmSwap(CSWAP_L, "0.8", "1.25", "1.25", "10", 25, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "0.8", "10", 25, "ba") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "1.3", "10", 25, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "0.7", "10", 25, "ba") === null);
check("CSWAP rejects bad ranges, amounts, fees and directions", app.clmmSwap(CSWAP_L, "1.25", "0.8", "1", "10", 25, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "0", 25, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "-5", 25, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "10", 10000, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "10", -1, "ab") === null && app.clmmSwap(CSWAP_L, "0.8", "1.25", "1", "10", 25, "xx") === null && app.clmmSwap("abc", "0.8", "1.25", "1", "10", 25, "ab") === null && app.clmmSwap("0", "0.8", "1.25", "1", "10", 25, "ab") === null);
for (const [liq, lo, hi, px, ain, fee, dir] of [
  [CSWAP_L, "0.8", "1.25", "1", "10", 25, "ab"],
  [CSWAP_L, "0.8", "1.25", "1", "10", 25, "ba"],
  ["5000", "0.5", "2", "1.1", "250", 30, "ab"],
  ["5000", "0.5", "2", "0.9", "250", 5, "ba"],
  ["123.456", "2.4", "2.6", "2.5", "3.21", 60, "ab"],
  ["123.456", "2.4", "2.6", "2.5", "3.21", 60, "ba"],
  ["1000000", "0.99", "1.01", "1", "5000", 1, "ba"]
]) {
  const x = app.clmmSwap(liq, lo, hi, px, ain, fee, dir);
  const tag = "CSWAP sweep " + dir + " " + ain + " @" + px + " in " + lo + "-" + hi;
  check(tag + " settles inside the range", x !== null && x.newPrice > Number(lo) - 1e-12 && x.newPrice < Number(hi) + 1e-12);
  near(tag + " used + unfilled is the amount in", x.usedIn + x.unfilledIn, Number(ain), 1e-9);
  near(tag + " fee is the tier's share of the used input", x.feePaid, x.usedIn * fee / 10000, 1e-9);
  const posAfter = app.clmmPositionAtPrice(liq, lo, hi, String(x.newPrice));
  const posBefore = app.clmmPositionAtPrice(liq, lo, hi, px);
  if (dir === "ab") {
    near(tag + " out is the B the position sheds by the new price (Tool 9)", x.amountOut, posBefore.amountB - posAfter.amountB, 1e-6);
    near(tag + " net in is the A the position gains (Tool 9)", x.usedIn - x.feePaid, posAfter.amountA - posBefore.amountA, 1e-6);
  } else {
    near(tag + " out is the A the position sheds by the new price (Tool 9)", x.amountOut, posBefore.amountA - posAfter.amountA, 1e-6);
    near(tag + " net in is the B the position gains (Tool 9)", x.usedIn - x.feePaid, posAfter.amountB - posBefore.amountB, 1e-6);
  }
}
check("all cswap controls labelled", ["cswap-liq", "cswap-lower", "cswap-upper", "cswap-price", "cswap-dir", "cswap-ain", "cswap-fee", "cswap-out", "cswap-newprice", "cswap-used"].every(id => html.includes(`for="${id}"`)));
check("cswap tool present in index.html", html.includes('id="cswap-calc"') && html.includes('id="cswap-result"'));
check("cswap honesty: single-range wall and not-live labels", html.includes("range's edge is a hard wall") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("leaves the rest unfilled"));
check("guide covers CLMM single-range swap", guide.includes("A CLMM range is a wall, not a well"));
const appSrc = fs.readFileSync(path.join(root, "app.js"), "utf8");
check("app.js header counts fifty-three tools and names the LVR round-trip calculator",
  appSrc.includes("plus fifty-three fully") && appSrc.includes("CLMM single-sided zap-in\n   planner from token B, a CLMM single-sided zap-out\n   planner to token B, a single-sided zap-in planner\n   from token B, a single-sided zap-out planner\n   to token B, a fee compounding calculator, and a\n   loss-versus-rebalancing round-trip calculator.\n   These are educational MODELS"));

/* ---------- Tool 43: CLMM two-range swap model (XSWAP) ---------- */
const XSWAP_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; position holds 100 A / 100 B
const xsNo = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "10", 25, "ab", XSWAP_L, "0.64");
const single42 = app.clmmSwap(XSWAP_L, "0.8", "1.25", "1", "10", 25, "ab");
check("XSWAP no-cross never enters the second range", xsNo !== null && xsNo.crossed === false && xsNo.hitSecondBoundary === false && xsNo.leg2UsedIn === 0 && xsNo.leg2Out === 0);
check("XSWAP no-cross is tool 42's answer verbatim", xsNo.amountOut === single42.amountOut && xsNo.newPrice === single42.newPrice && xsNo.priceImpactPct === single42.priceImpactPct && xsNo.usedIn === single42.usedIn);
const xsAb = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", XSWAP_L, "0.64");
const cap42 = app.clmmSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab");
check("XSWAP headline crosses", xsAb !== null && xsAb.crossed === true && xsAb.hitSecondBoundary === false && xsAb.unfilledIn === 0);
check("XSWAP leg 1 is tool 42's capped swap verbatim", xsAb.leg1UsedIn === cap42.usedIn && xsAb.leg1Out === cap42.amountOut && xsAb.boundaryPrice === 0.8);
near("XSWAP headline leg 1 used-in", xsAb.leg1UsedIn, 112.08360789472633, 1e-9);
near("XSWAP headline leg 2 used-in", xsAb.leg2UsedIn, 87.91639210527367, 1e-9);
near("XSWAP headline leg 2 out", xsAb.leg2Out, 64.79190012555198, 1e-9);
near("XSWAP headline amount out", xsAb.amountOut, 164.791900125552, 1e-9);
near("XSWAP headline new price lands inside the second range", xsAb.newPrice, 0.6823165770815478, 1e-9);
near("XSWAP headline impact includes both legs' fee", xsAb.priceImpactPct, 17.60404993722401, 1e-9);
near("XSWAP headline fee is the tier's share of the whole used input", xsAb.feePaid, 0.5, 1e-12);
const xsBa = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ba", XSWAP_L, "1.5625");
check("XSWAP mirrored ranges mirror the crossing exactly", xsBa.crossed === true && xsBa.amountOut === xsAb.amountOut && xsBa.usedIn === xsAb.usedIn && xsBa.leg2Out === xsAb.leg2Out && xsBa.priceImpactPct === xsAb.priceImpactPct);
near("XSWAP mirror new price", xsBa.newPrice, 1.4655953461914555, 1e-9);
const xs0 = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 0, "ab", XSWAP_L, "0.64");
check("XSWAP zero-fee charges no fee on either leg", xs0.feePaid === 0 && xs0.crossed === true);
near("XSWAP zero-fee leg 1 used-in is the net capacity", xs0.leg1UsedIn, 111.80339887498951, 1e-9);
const xsRt = app.clmmCrossSwap(XSWAP_L, "0.64", "0.8", String(xs0.newPrice), String(xs0.amountOut), 0, "ba", XSWAP_L, "1.25");
check("XSWAP zero-fee round trip crosses back", xsRt !== null && xsRt.crossed === true);
near("XSWAP zero-fee round trip returns the input", xsRt.amountOut, 200, 1e-9);
near("XSWAP zero-fee round trip restores the price", xsRt.newPrice, 1, 1e-9);
const xsBig = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "100000", 25, "ab", XSWAP_L, "0.64");
check("XSWAP oversized fills both ranges and stops", xsBig.crossed === true && xsBig.hitSecondBoundary === true);
near("XSWAP double-cap new price is the outer edge", xsBig.newPrice, 0.64, 1e-12);
near("XSWAP double-cap pays every out-token both ranges hold", xsBig.amountOut, 100 + 947.2135954999577 * (Math.sqrt(0.8) - Math.sqrt(0.64)), 1e-9);
near("XSWAP double-cap used-in", xsBig.usedIn, 237.39689110274628, 1e-9);
near("XSWAP double-cap leaves the rest unfilled, not absorbed", xsBig.unfilledIn, 100000 - 237.39689110274628, 1e-9);
const xsThin = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", "94.72135954999577", "0.64");
check("XSWAP a tenth-depth second range caps under the same input", xsThin.crossed === true && xsThin.hitSecondBoundary === true);
near("XSWAP thin second range pays its whole holding of B", xsThin.leg2Out, 94.72135954999577 * (Math.sqrt(0.8) - Math.sqrt(0.64)), 1e-9);
near("XSWAP thin second range used-in", xsThin.usedIn, 124.61493621552832, 1e-9);
const xsDeep = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", "9472.135954999577", "0.64");
check("XSWAP a ten-times second range absorbs the crossing", xsDeep.crossed === true && xsDeep.hitSecondBoundary === false && xsDeep.unfilledIn === 0);
near("XSWAP deep second range amount out", xsDeep.amountOut, 169.58108386165284, 1e-9);
near("XSWAP deep second range walks barely past the edge", xsDeep.newPrice, 0.7869132692214872, 1e-9);
check("XSWAP deeper second range pays more for the same crossing trade", xsDeep.amountOut > xsAb.amountOut && xsAb.amountOut > xsThin.amountOut);
const xsJust = app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "113", 25, "ab", XSWAP_L, "0.64");
check("XSWAP just past the first wall crosses with a small second leg", xsJust.crossed === true && xsJust.hitSecondBoundary === false);
near("XSWAP just-past leg 2 used-in", xsJust.leg2UsedIn, 0.9163921052736725, 1e-9);
near("XSWAP just-past leg 2 out", xsJust.leg2Out, 0.7306502319430709, 1e-9);
check("XSWAP rejects an outer edge on the wrong side or at the shared edge", app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", XSWAP_L, "0.9") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", XSWAP_L, "0.8") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ba", XSWAP_L, "1.1") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ba", XSWAP_L, "1.25") === null);
check("XSWAP rejects a second range with no liquidity or bad inputs", app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", "0", "0.64") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", "abc", "0.64") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", XSWAP_L, "abc") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "200", 25, "xx", XSWAP_L, "0.64") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1", "0", 25, "ab", XSWAP_L, "0.64") === null);
const xsDust = app.clmmCrossSwap("100", "0.64", "1.44", "1", "25.00005", 0, "ab", "1000000000000", "0.36");
check("XSWAP dust remainder past the wall against a deep second range still settles", xsDust !== null && xsDust.crossed === true);
near("XSWAP dust remainder leg 2 out", xsDust && xsDust.leg2Out, 0.000032, 1e-6);
near("XSWAP dust remainder total out", xsDust && xsDust.amountOut, 20.000032, 1e-9);
const xsDustBa = app.clmmCrossSwap("100", String(1 / 1.44), String(1 / 0.64), "1", "25.00005", 0, "ba", "1000000000000", String(1 / 0.36));
check("XSWAP dust remainder paying B still settles", xsDustBa !== null && xsDustBa.crossed === true);
near("XSWAP dust remainder paying B leg 2 out", xsDustBa && xsDustBa.leg2Out, 0.000032, 1e-6);
check("XSWAP inherits tool 42's rejection of a price outside the active range", app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "1.3", "200", 25, "ab", XSWAP_L, "0.64") === null && app.clmmCrossSwap(XSWAP_L, "0.8", "1.25", "0.8", "200", 25, "ba", XSWAP_L, "1.5625") === null);
for (const [liq, lo, hi, px, ain, fee, dir, liq2, outer] of [
  [XSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", XSWAP_L, "0.64"],
  [XSWAP_L, "0.8", "1.25", "1", "200", 25, "ba", XSWAP_L, "1.5625"],
  ["5000", "0.5", "2", "1.1", "3000", 30, "ab", "2500", "0.25"],
  ["5000", "0.5", "2", "0.9", "3000", 30, "ba", "2500", "4"],
  ["123.456", "2.4", "2.6", "2.5", "3.21", 60, "ab", "50", "2"],
  ["1000000", "0.99", "1.01", "1", "5000", 1, "ba", "10", "1.05"],
  [XSWAP_L, "0.8", "1.25", "1.2", "30", 25, "ba", "2000", "3"]
]) {
  const x = app.clmmCrossSwap(liq, lo, hi, px, ain, fee, dir, liq2, outer);
  const tag = "XSWAP sweep " + dir + " " + ain + " @" + px + " in " + lo + "-" + hi + " L2 " + liq2;
  check(tag + " settles", x !== null);
  near(tag + " used + unfilled is the amount in", x.usedIn + x.unfilledIn, Number(ain), 1e-9);
  near(tag + " legs sum to the totals", x.leg1UsedIn + x.leg2UsedIn, x.usedIn, 1e-9);
  near(tag + " leg outs sum to the amount out", x.leg1Out + x.leg2Out, x.amountOut, 1e-9);
  near(tag + " fee is the tier's share of the used input", x.feePaid, x.usedIn * fee / 10000, 1e-9);
  if (x.crossed) {
    check(tag + " crossed only through the shared edge", x.boundaryPrice === (dir === "ab" ? Number(lo) : Number(hi)) && x.newPrice >= x.secondLowerPrice - 1e-12 && x.newPrice <= x.secondUpperPrice + 1e-12);
    const leg1Only = app.clmmSwap(liq, lo, hi, px, ain, fee, dir);
    check(tag + " leg 1 is tool 42 verbatim", leg1Only !== null && leg1Only.hitBoundary === true && x.leg1UsedIn === leg1Only.usedIn && x.leg1Out === leg1Only.amountOut);
  } else {
    check(tag + " uncrossed stays inside the active range", x.newPrice > Number(lo) && x.newPrice < Number(hi));
  }
}
check("all xswap controls labelled", ["xswap-liq", "xswap-lower", "xswap-upper", "xswap-price", "xswap-dir", "xswap-ain", "xswap-fee", "xswap-liq2", "xswap-outer", "xswap-out", "xswap-newprice", "xswap-used"].every(id => html.includes(`for="${id}"`)));
check("xswap tool present in index.html", html.includes('id="xswap-calc"') && html.includes('id="xswap-result"'));
check("xswap honesty: second wall and not-live labels", html.includes("The second range is a wall too") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("unfilled, not absorbed"));
check("guide covers CLMM two-range swap", guide.includes("The second range sets the cliff"));


/* ---------- Tool 44: CLMM single-range exact-out swap model (CXO) ---------- */
const CXO_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; position holds 100 A / 100 B
const cxoInv = app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "9.87104909056809", 25, "ab");
check("CXO headline settles inside the range", cxoInv !== null && cxoInv.hitBoundary === false);
near("CXO inverts tool 42's headline fill back to 10 in", cxoInv.amountIn, 10, 1e-9);
near("CXO headline new price is tool 42's new price", cxoInv.newPrice, 0.9792663126327764, 1e-9);
near("CXO headline impact matches tool 42", cxoInv.priceImpactPct, 1.2895090943191079, 1e-6);
near("CXO headline fee is the tier's share of the amount in", cxoInv.feePaid, cxoInv.amountIn * 25 / 10000, 1e-9);
near("CXO headline max out is tool 9's B holding", cxoInv.maxOut, app.clmmPositionAtPrice(CXO_L, "0.8", "1.25", "1").amountB, 1e-9);
const cxo50ab = app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "50", 25, "ab");
const cxo50ba = app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "50", 25, "ba");
near("CXO target 50 amount in", cxo50ab.amountIn, 52.91870125317499, 1e-9);
near("CXO target 50 new price", cxo50ab.newPrice, 0.8972135954999578, 1e-9);
near("CXO target 50 impact", cxo50ab.priceImpactPct, 5.515443848879176, 1e-9);
/* The cancellation-free net-in forms (amountOut/(s·s′) paying A,
   amountOut·s·s′ paying B) round per direction, so the mirror agrees
   to within ~1 ulp rather than bit-exactly — both directions sit
   within 1 ulp of the 60-digit value 52.918701253174998958…; the old
   difference forms' bit-equality was a rounding coincidence. */
check("CXO centred range mirrors to within a rounding ulp per direction", Math.abs(cxo50ba.amountIn - cxo50ab.amountIn) <= 1e-12 && cxo50ba.feePaid === cxo50ab.feePaid && Math.abs(cxo50ba.priceImpactPct - cxo50ab.priceImpactPct) <= 1e-12);
near("CXO mirror new price", cxo50ba.newPrice, 1.1145618000168243, 1e-9);
near("CXO mirror max out is tool 9's A holding", cxo50ba.maxOut, app.clmmPositionAtPrice(CXO_L, "0.8", "1.25", "1").amountA, 1e-9);
const cxo0 = app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "10", 0, "ab");
check("CXO zero-fee charges no fee", cxo0.feePaid === 0);
near("CXO zero-fee amount in is the closed form", cxo0.amountIn, 947.2135954999577 * (1 / (1 - 10 / 947.2135954999577) - 1), 1e-9);
near("CXO zero-fee new price", cxo0.newPrice, 0.9789968943799848, 1e-9);
const cxoMax = app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "100", 25, "ab");
check("CXO target equal to the holding hits the boundary", cxoMax !== null && cxoMax.hitBoundary === true);
near("CXO max target walks the price to the lower edge", cxoMax.newPrice, 0.8, 1e-9);
near("CXO max target costs tool 42's capped used-in", cxoMax.amountIn, app.clmmSwap(CXO_L, "0.8", "1.25", "1", "100000", 25, "ab").usedIn, 1e-9);
near("CXO max target amount in value", cxoMax.amountIn, 112.08360789472633, 1e-9);
const cxoMaxBa = app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "100", 25, "ba");
check("CXO max pay-B hits the upper boundary", cxoMaxBa !== null && cxoMaxBa.hitBoundary === true);
near("CXO max pay-B new price is the upper edge", cxoMaxBa.newPrice, 1.25, 1e-9);
const cxoTiny = app.clmmSwapExactOut("0.00000001", "0.8", "1.25", "1", "0.000000000527864045", 25, "ab");
check("CXO tiny range half-drained is NOT the boundary", cxoTiny !== null && cxoTiny.hitBoundary === false);
near("CXO tiny half-drained new price stays inside", cxoTiny.newPrice, 0.8972135954999579, 1e-9);
const cxoTinyBa = app.clmmSwapExactOut("0.00000001", "0.8", "1.25", "1", "0.000000000527864045", 25, "ba");
check("CXO tiny range half-drained pay-B is NOT the boundary", cxoTinyBa !== null && cxoTinyBa.hitBoundary === false);
const cxoDust = app.clmmSwapExactOut("1000000000000", "0.64", "1.44", "1", "0.00005", 0, "ab");
check("CXO dust target against a deep range still settles", cxoDust !== null);
near("CXO dust target amount in is the target at the spot price", cxoDust && cxoDust.amountIn, 0.00005, 1e-12);
near("CXO dust amount in round-trips through tool 42", cxoDust && app.clmmSwap("1000000000000", "0.64", "1.44", "1", String(cxoDust.amountIn), 0, "ab").amountOut, 0.00005, 1e-12);
const cxoDustBa = app.clmmSwapExactOut("1000000000000", "0.64", "1.44", "1", "0.00005", 0, "ba");
check("CXO dust target paying B still settles", cxoDustBa !== null);
near("CXO dust target paying B amount in is the target at the spot price", cxoDustBa && cxoDustBa.amountIn, 0.00005, 1e-12);
near("CXO near-dust target prices off the curve, not a quantized reciprocal difference", app.clmmSwapExactOut("1000000000000", "0.64", "1.44", "1", "0.0005", 0, "ab").amountIn, 0.0005, 1e-12);
check("CXO near-max within relative tolerance is the boundary, 1e-9 short is not", app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", String(100 * (1 - 5e-13)), 25, "ab").hitBoundary === true && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", String(100 * (1 - 1e-9)), 25, "ab").hitBoundary === false);
check("CXO rejects a target above the range's holding", app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "100.000001", 25, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "101", 25, "ba") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1.2", "17.47016", 25, "ba") === null);
near("CXO max out at 1.2 is tool 9's A holding there", app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1.2", "10", 25, "ba").maxOut, app.clmmPositionAtPrice(CXO_L, "0.8", "1.25", "1.2").amountA, 1e-9);
near("CXO at 1.2 target 10 amount in", app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1.2", "10", 25, "ba").amountIn, 12.170829883690581, 1e-9);
near("CXO tiny target impact is the fee plus a whisper of curve", app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "0.01", 25, "ab").priceImpactPct, 0.2510530895384333, 1e-9);
check("CXO rejects a price at or outside the range", app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1.25", "10", 25, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "0.8", "10", 25, "ba") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1.3", "10", 25, "ab") === null);
check("CXO rejects bad ranges, amounts, fees and directions", app.clmmSwapExactOut(CXO_L, "1.25", "0.8", "1", "10", 25, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "0", 25, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "-5", 25, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "10", 10000, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "10", -1, "ab") === null && app.clmmSwapExactOut(CXO_L, "0.8", "1.25", "1", "10", 25, "xx") === null && app.clmmSwapExactOut("abc", "0.8", "1.25", "1", "10", 25, "ab") === null && app.clmmSwapExactOut("0", "0.8", "1.25", "1", "10", 25, "ab") === null);
for (const [liq, lo, hi, px, tgt, fee, dir] of [
  [CXO_L, "0.8", "1.25", "1", "25", 25, "ab"],
  [CXO_L, "0.8", "1.25", "1", "25", 25, "ba"],
  ["5000", "0.5", "2", "1.1", "100", 30, "ab"],
  ["5000", "0.5", "2", "0.9", "100", 5, "ba"],
  ["123.456", "2.4", "2.6", "2.5", "2", 60, "ab"],
  ["123.456", "2.4", "2.6", "2.5", "1", 60, "ba"],
  ["1000000", "0.99", "1.01", "1", "1000", 1, "ba"],
  [CXO_L, "0.8", "1.25", "1.2", "10", 25, "ba"]
]) {
  const x = app.clmmSwapExactOut(liq, lo, hi, px, tgt, fee, dir);
  const tag = "CXO sweep " + dir + " " + tgt + " @ " + px + " in " + lo + "-" + hi;
  check(tag + " settles", x !== null);
  near(tag + " fee is the tier's share of the amount in", x.feePaid, x.amountIn * fee / 10000, 1e-9);
  near(tag + " net in plus fee is the amount in", x.netIn + x.feePaid, x.amountIn, 1e-9);
  const rt = app.clmmSwap(liq, lo, hi, px, String(x.amountIn), fee, dir);
  check(tag + " round-trips through tool 42", rt !== null && rt.hitBoundary === x.hitBoundary);
  near(tag + " tool 42 returns the target out", rt.amountOut, Number(tgt), 1e-6);
  near(tag + " tool 42 lands on the same new price", rt.newPrice, x.newPrice, 1e-9);
  const posAfter = app.clmmPositionAtPrice(liq, lo, hi, String(x.newPrice));
  const posBefore = app.clmmPositionAtPrice(liq, lo, hi, px);
  if (dir === "ab") {
    near(tag + " target is the B the position sheds (Tool 9)", x.amountOut, posBefore.amountB - posAfter.amountB, 1e-6);
    near(tag + " net in is the A the position gains (Tool 9)", x.netIn, posAfter.amountA - posBefore.amountA, 1e-6);
  } else {
    near(tag + " target is the A the position sheds (Tool 9)", x.amountOut, posBefore.amountA - posAfter.amountA, 1e-6);
    near(tag + " net in is the B the position gains (Tool 9)", x.netIn, posAfter.amountB - posBefore.amountB, 1e-6);
  }
}
check("all cxo controls labelled", ["cxo-liq", "cxo-lower", "cxo-upper", "cxo-price", "cxo-dir", "cxo-aout", "cxo-fee", "cxo-ain", "cxo-newprice", "cxo-maxout"].every(id => html.includes(`for="${id}"`)));
check("cxo tool present in index.html", html.includes('id="cxo-calc"') && html.includes('id="cxo-result"'));
check("cxo honesty: hard limit and not-live labels", html.includes("becomes a hard limit here") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("is rejected, not priced"));
check("guide covers CLMM single-range exact-out swap", guide.includes("Exact-out against a range has a ceiling, not just a price"));

/* ---------- Tool 45: CLMM two-range exact-out swap model (XXO) ---------- */
const XXO_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; position holds 100 A / 100 B
const xxoFit = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "50", 25, "ab", XXO_L, "0.64");
const cxoFit = app.clmmSwapExactOut(XXO_L, "0.8", "1.25", "1", "50", 25, "ab");
check("XXO target inside the first range does not cross", xxoFit !== null && xxoFit.crossed === false && xxoFit.hitSecondBoundary === false);
check("XXO uncrossed answer is tool 44 verbatim", xxoFit.amountIn === cxoFit.amountIn && xxoFit.feePaid === cxoFit.feePaid && xxoFit.newPrice === cxoFit.newPrice && xxoFit.priceImpactPct === cxoFit.priceImpactPct);
check("XXO uncrossed legs: leg 2 is zero", xxoFit.leg2In === 0 && xxoFit.leg2Out === 0 && xxoFit.leg1Out === 50);
near("XXO combined ceiling is both holdings", xxoFit.maxOut, 189.4427190999915, 1e-9);
near("XXO first holding is tool 9's B holding", xxoFit.firstMaxOut, app.clmmPositionAtPrice(XXO_L, "0.8", "1.25", "1").amountB, 1e-9);
const xxo = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ab", XXO_L, "0.64");
check("XXO headline crosses", xxo !== null && xxo.crossed === true && xxo.hitSecondBoundary === false);
near("XXO headline amount in", xxo.amountIn, 178.66997686149637, 1e-9);
near("XXO headline new price", xxo.newPrice, 0.7083592135001262, 1e-9);
near("XXO headline impact", xxo.priceImpactPct, 16.04633154663758, 1e-9);
near("XXO headline leg 1 costs tool 44's edge price", xxo.leg1In, 112.08360789472633, 1e-9);
near("XXO headline leg 1 pays the first holding in full", xxo.leg1Out, 100, 1e-12);
near("XXO headline leg 2 in", xxo.leg2In, 66.58636896677005, 1e-9);
near("XXO headline outs conserve the target", xxo.leg1Out + xxo.leg2Out, 150, 1e-12);
near("XXO headline ins sum to the total", xxo.leg1In + xxo.leg2In, xxo.amountIn, 1e-9);
near("XXO headline fee is the tier's share of the total in", xxo.feePaid, xxo.amountIn * 25 / 10000, 1e-9);
near("XXO headline net in plus fee is the amount in", xxo.netIn + xxo.feePaid, xxo.amountIn, 1e-9);
const xxoRt = app.clmmCrossSwap(XXO_L, "0.8", "1.25", "1", String(xxo.amountIn), 25, "ab", XXO_L, "0.64");
check("XXO headline round-trips through tool 43 crossed", xxoRt !== null && xxoRt.crossed === true);
near("XXO headline tool 43 returns the target", xxoRt.amountOut, 150, 1e-6);
near("XXO headline tool 43 lands on the same price", xxoRt.newPrice, xxo.newPrice, 1e-9);
const xxoBa = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ba", XXO_L, "1.5625");
near("XXO centred ranges mirror: pay-B amount in equals pay-A", xxoBa.amountIn, xxo.amountIn, 1e-9);
near("XXO mirror new price", xxoBa.newPrice, 1.411713126534807, 1e-9);
near("XXO mirror combined ceiling", xxoBa.maxOut, 189.4427190999915, 1e-9);
const xxoMax = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", String(xxo.maxOut), 25, "ab", XXO_L, "0.64");
check("XXO combined-max target hits the second boundary", xxoMax !== null && xxoMax.crossed === true && xxoMax.hitSecondBoundary === true);
near("XXO combined-max walks the price to the outer edge", xxoMax.newPrice, 0.64, 1e-9);
near("XXO combined-max amount in", xxoMax.amountIn, 237.39689110274628, 1e-9);
const xxoTiny2 = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "1", 25, "ab", "0.00000001", "0.64");
const xxoTinyMax = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", String(xxoTiny2.maxOut), 25, "ab", "0.00000001", "0.64");
check("XXO tiny second range: exact combined max IS the second boundary", xxoTinyMax !== null && xxoTinyMax.crossed === true && xxoTinyMax.hitSecondBoundary === true);
const xxoTinyHalf = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", String(xxoTiny2.firstMaxOut + xxoTiny2.secondMaxOut / 2), 25, "ab", "0.00000001", "0.64");
check("XXO tiny second range half-drained is NOT the second boundary", xxoTinyHalf !== null && xxoTinyHalf.crossed === true && xxoTinyHalf.hitSecondBoundary === false && xxoTinyHalf.newPrice > 0.64 && xxoTinyHalf.newPrice < 0.8);
check("XXO near-combined-max within relative tolerance is the boundary, 1e-9 short is not", app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", String(xxoFit.firstMaxOut + xxoFit.secondMaxOut * (1 - 5e-13)), 25, "ab", XXO_L, "0.64").hitSecondBoundary === true && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", String(xxoFit.firstMaxOut + xxoFit.secondMaxOut * (1 - 1e-9)), 25, "ab", XXO_L, "0.64").hitSecondBoundary === false);
check("XXO rejects a target above the combined holding", app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", String(xxo.maxOut + 0.001), 25, "ab", XXO_L, "0.64") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "190", 25, "ba", XXO_L, "1.5625") === null);
check("XXO prices a target tool 44 must reject", app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "100.000001", 25, "ab", XXO_L, "0.64") !== null && app.clmmSwapExactOut(XXO_L, "0.8", "1.25", "1", "100.000001", 25, "ab") === null);
const xxoThin = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "105", 25, "ab", "94.72135954999577", "0.64");
const xxoDeep = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "105", 25, "ab", "9472.135954999577", "0.64");
near("XXO thin second range amount in for 105", xxoThin.amountIn, 118.74224479140334, 1e-9);
near("XXO deep second range amount in for 105", xxoDeep.amountIn, 118.3529720454146, 1e-9);
check("XXO a thinner second range costs more and walks further", xxoThin.amountIn > xxoDeep.amountIn && xxoThin.newPrice < xxoDeep.newPrice);
check("XXO a thin second range shrinks the combined ceiling", app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ab", "94.72135954999577", "0.64") === null);
const xxoDust = app.clmmCrossSwapExactOut("100", "0.64", "1.44", "1", "20.00005", 0, "ab", "1000000000000", "0.36");
check("XXO dust remainder past the wall against a deep second range still settles", xxoDust !== null && xxoDust.crossed === true);
near("XXO dust remainder leg 2 out", xxoDust && xxoDust.leg2Out, 0.00005, 1e-9);
near("XXO dust remainder leg 2 in is the remainder at the edge price", xxoDust && xxoDust.leg2In, 0.000078125, 1e-9);
const xxoDustBa = app.clmmCrossSwapExactOut("100", String(1 / 1.44), String(1 / 0.64), "1", "20.00005", 0, "ba", "1000000000000", String(1 / 0.36));
check("XXO dust remainder paying B still settles", xxoDustBa !== null && xxoDustBa.crossed === true);
near("XXO dust remainder paying B leg 2 out", xxoDustBa && xxoDustBa.leg2Out, 0.00005, 1e-9);
const xxo0 = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 0, "ab", XXO_L, "0.64");
check("XXO zero-fee charges no fee", xxo0.feePaid === 0);
near("XXO zero-fee amount in is the net in", xxo0.amountIn, 178.22330191934265, 1e-9);
const xxoOc = app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1.2", "30", 25, "ba", XXO_L, "1.5625");
check("XXO off-centre target crosses", xxoOc !== null && xxoOc.crossed === true);
near("XXO off-centre first holding is tool 9's A holding at 1.2", xxoOc.firstMaxOut, app.clmmPositionAtPrice(XXO_L, "0.8", "1.25", "1.2").amountA, 1e-9);
near("XXO off-centre amount in", xxoOc.amountIn, 37.38737165111325, 1e-9);
check("XXO rejects an outer edge on the wrong side or at the shared edge", app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ab", XXO_L, "0.8") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ab", XXO_L, "1.25") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ba", XXO_L, "1.25") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "150", 25, "ba", XXO_L, "0.64") === null);
check("XXO rejects bad ranges, amounts, fees, directions and second ranges", app.clmmCrossSwapExactOut(XXO_L, "1.25", "0.8", "1", "10", 25, "ab", XXO_L, "0.64") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "0", 25, "ab", XXO_L, "0.64") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "10", 10000, "ab", XXO_L, "0.64") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "10", 25, "xx", XXO_L, "0.64") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "10", 25, "ab", "0", "0.64") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1", "10", 25, "ab", XXO_L, "abc") === null && app.clmmCrossSwapExactOut(XXO_L, "0.8", "1.25", "1.25", "10", 25, "ab", XXO_L, "0.64") === null);
for (const [liq, lo, hi, px, tgt, fee, dir, liq2, outer] of [
  [XXO_L, "0.8", "1.25", "1", "25", 25, "ab", XXO_L, "0.64"],
  [XXO_L, "0.8", "1.25", "1", "150", 25, "ba", XXO_L, "1.5625"],
  ["5000", "0.5", "2", "1.1", "300", 30, "ab", "2500", "0.25"],
  ["5000", "0.5", "2", "0.9", "200", 5, "ba", "8000", "4"],
  ["123.456", "2.4", "2.6", "2.5", "3", 60, "ab", "60", "2.25"],
  [XXO_L, "0.8", "1.25", "1.2", "30", 25, "ba", XXO_L, "1.5625"],
  ["1000000", "0.99", "1.01", "1", "5000", 1, "ba", "1000000", "1.0201"]
]) {
  const x = app.clmmCrossSwapExactOut(liq, lo, hi, px, tgt, fee, dir, liq2, outer);
  const tag = "XXO sweep " + dir + " " + tgt + " @ " + px + " in " + lo + "-" + hi;
  check(tag + " settles", x !== null);
  near(tag + " fee is the tier's share of the amount in", x.feePaid, x.amountIn * fee / 10000, 1e-9);
  near(tag + " net in plus fee is the amount in", x.netIn + x.feePaid, x.amountIn, 1e-9);
  near(tag + " legs conserve the target", x.leg1Out + x.leg2Out, Number(tgt), 1e-9);
  check(tag + " crossed matches the first holding", x.crossed === (Number(tgt) > x.firstMaxOut));
  const rt = app.clmmCrossSwap(liq, lo, hi, px, String(x.amountIn), fee, dir, liq2, outer);
  check(tag + " round-trips through tool 43", rt !== null);
  near(tag + " tool 43 returns the target out", rt.amountOut, Number(tgt), 1e-6);
  near(tag + " tool 43 lands on the same new price", rt.newPrice, x.newPrice, 1e-9);
}
check("all xxo controls labelled", ["xxo-liq", "xxo-lower", "xxo-upper", "xxo-price", "xxo-dir", "xxo-aout", "xxo-fee", "xxo-liq2", "xxo-outer", "xxo-ain", "xxo-newprice", "xxo-maxout"].every(id => html.includes(`for="${id}"`)));
check("xxo tool present in index.html", html.includes('id="xxo-calc"') && html.includes('id="xxo-result"'));
check("xxo honesty: combined ceiling and not-live labels", html.includes("supplies that second range instead of inventing it") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("is rejected, not priced"));
check("guide covers CLMM two-range exact-out swap", guide.includes("Exact-out across two ranges has a combined ceiling"));

/* ---------- Tool 46: CLMM three-range swap model (TSWAP) ---------- */
const TSWAP_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; position holds 100 A / 100 B
const tsFit = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "10", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512");
const xsFit = app.clmmCrossSwap(TSWAP_L, "0.8", "1.25", "1", "10", 25, "ab", TSWAP_L, "0.64");
check("TSWAP small swap does not cross", tsFit !== null && tsFit.crossed === false && tsFit.enteredThird === false && tsFit.hitThirdBoundary === false);
check("TSWAP uncrossed answer is tool 43 verbatim", tsFit.amountOut === xsFit.amountOut && tsFit.newPrice === xsFit.newPrice && tsFit.usedIn === xsFit.usedIn && tsFit.feePaid === xsFit.feePaid);
check("TSWAP uncrossed third leg is zero", tsFit.leg3UsedIn === 0 && tsFit.leg3Out === 0);
const tsMid = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512");
const xsMid = app.clmmCrossSwap(TSWAP_L, "0.8", "1.25", "1", "200", 25, "ab", TSWAP_L, "0.64");
check("TSWAP two-range fill does not enter the third range", tsMid !== null && tsMid.crossed === true && tsMid.enteredThird === false);
check("TSWAP two-range answer is tool 43 verbatim", tsMid.amountOut === xsMid.amountOut && tsMid.newPrice === xsMid.newPrice && tsMid.leg2Out === xsMid.leg2Out);
near("TSWAP two-range out", tsMid.amountOut, 164.791900125552, 1e-9);
const ts = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512");
check("TSWAP headline enters the third range without filling it", ts !== null && ts.enteredThird === true && ts.hitThirdBoundary === false);
near("TSWAP headline amount out", ts.amountOut, 227.40629527946123, 1e-9);
near("TSWAP headline new price", ts.newPrice, 0.5774796013451008, 1e-9);
near("TSWAP headline impact", ts.priceImpactPct, 24.197901573512926, 1e-9);
near("TSWAP headline uses all of its input", ts.usedIn, 300, 1e-9);
near("TSWAP headline unfilled is zero", ts.unfilledIn, 0, 1e-9);
near("TSWAP headline fee is the tier's share of the used input", ts.feePaid, 0.75, 1e-9);
near("TSWAP headline leg 1 in", ts.leg1UsedIn, 112.08360789472633, 1e-9);
near("TSWAP headline leg 1 out is the first range's holding", ts.leg1Out, 100, 1e-12);
near("TSWAP headline leg 2 in", ts.leg2UsedIn, 125.31328320801995, 1e-9);
near("TSWAP headline leg 2 out is the second range's holding", ts.leg2Out, 89.4427190999915, 1e-9);
near("TSWAP headline leg 3 in", ts.leg3UsedIn, 62.60310889725372, 1e-9);
near("TSWAP headline leg 3 out", ts.leg3Out, 37.96357617946974, 1e-9);
near("TSWAP headline legs conserve the input", ts.leg1UsedIn + ts.leg2UsedIn + ts.leg3UsedIn, ts.usedIn, 1e-9);
near("TSWAP headline legs conserve the output", ts.leg1Out + ts.leg2Out + ts.leg3Out, ts.amountOut, 1e-9);
near("TSWAP headline leg 3 out is the third range's shed holding", ts.leg3Out, Number(TSWAP_L) * (Math.sqrt(0.64) - Math.sqrt(ts.newPrice)), 1e-9);
const xsHead = app.clmmCrossSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ab", TSWAP_L, "0.64");
check("TSWAP first two legs are tool 43's capped legs verbatim", xsHead.hitSecondBoundary === true && ts.leg1UsedIn === xsHead.leg1UsedIn && ts.leg2UsedIn === xsHead.leg2UsedIn && ts.leg1Out === xsHead.leg1Out && ts.leg2Out === xsHead.leg2Out);
const tsCap = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "400", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512");
check("TSWAP oversized swap fills all three ranges", tsCap !== null && tsCap.enteredThird === true && tsCap.hitThirdBoundary === true);
near("TSWAP triple-cap amount out is the three holdings summed", tsCap.amountOut, 269.4427190999915, 1e-9);
near("TSWAP triple-cap walks to the third outer edge", tsCap.newPrice, 0.512, 1e-12);
near("TSWAP triple-cap used in", tsCap.usedIn, 377.50140097115417, 1e-9);
near("TSWAP triple-cap unfilled remainder", tsCap.unfilledIn, 22.49859902884583, 1e-9);
near("TSWAP triple-cap leg 3 out is the third range's whole holding", tsCap.leg3Out, 80, 1e-9);
const tsHuge = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "10000", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512");
check("TSWAP a still bigger input changes nothing past the third wall", tsHuge.usedIn === tsCap.usedIn && tsHuge.amountOut === tsCap.amountOut && tsHuge.newPrice === tsCap.newPrice);
const tsBa = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ba", TSWAP_L, "1.5625", TSWAP_L, "1.953125");
check("TSWAP pay-B mirror returns exactly the same amount out", tsBa !== null && tsBa.amountOut === ts.amountOut && tsBa.usedIn === ts.usedIn);
near("TSWAP pay-B mirror new price", tsBa.newPrice, 1.7316628979980226, 1e-9);
near("TSWAP mirror prices are reciprocal", 1 / tsBa.newPrice, ts.newPrice, 1e-12);
const tsThin = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "400", 25, "ab", TSWAP_L, "0.64", String(Number(TSWAP_L) / 10), "0.512");
check("TSWAP thin third range caps and leaves most of the crossing input unfilled", tsThin !== null && tsThin.hitThirdBoundary === true && tsThin.leg3Out < tsCap.leg3Out && tsThin.unfilledIn > tsCap.unfilledIn);
near("TSWAP thin third leg out", tsThin.leg3Out, 8, 1e-9);
near("TSWAP thin third total out", tsThin.amountOut, 197.4427190999915, 1e-9);
const tsDeep = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "400", 25, "ab", TSWAP_L, "0.64", String(Number(TSWAP_L) * 10), "0.512");
check("TSWAP deep third range fills the same input in full", tsDeep !== null && tsDeep.enteredThird === true && tsDeep.hitThirdBoundary === false && tsDeep.unfilledIn === 0);
near("TSWAP deep third amount out", tsDeep.amountOut, 291.84574114074337, 1e-9);
near("TSWAP deep third new price walks barely into the third range", tsDeep.newPrice, 0.6228193176745782, 1e-9);
const tsZero = app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 0, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512");
near("TSWAP zero-fee amount out", tsZero.amountOut, 227.83914453408232, 1e-9);
check("TSWAP zero fee charges no fee", tsZero.feePaid === 0);
check("TSWAP rejects a third outer edge on the wrong side or at the second edge", app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.7") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.64") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ba", TSWAP_L, "1.5625", TSWAP_L, "1.4") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ba", TSWAP_L, "1.5625", TSWAP_L, "1.5625") === null);
check("TSWAP rejects bad third ranges and inherited bad inputs", app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ab", TSWAP_L, "0.64", "0", "0.512") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "abc") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 25, "xx", TSWAP_L, "0.64", TSWAP_L, "0.512") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1", "300", 10000, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512") === null && app.clmmTripleSwap(TSWAP_L, "0.8", "1.25", "1.25", "300", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512") === null);
const tsDust = app.clmmTripleSwap("100", "0.64", "1.44", "1", "66.66671666666667", 0, "ab", "100", "0.36", "1000000000000", "0.16");
check("TSWAP dust remainder past the second wall against a deep third range still settles", tsDust !== null && tsDust.enteredThird === true);
near("TSWAP dust remainder leg 3 out", tsDust && tsDust.leg3Out, 0.000018, 1e-6);
near("TSWAP dust remainder total out", tsDust && tsDust.amountOut, 40.000018, 1e-9);
const tsDustBa = app.clmmTripleSwap("100", String(1 / 1.44), String(1 / 0.64), "1", "66.66671666666667", 0, "ba", "100", String(1 / 0.36), "1000000000000", String(1 / 0.16));
check("TSWAP dust remainder paying B still settles", tsDustBa !== null && tsDustBa.enteredThird === true);
near("TSWAP dust remainder paying B leg 3 out", tsDustBa && tsDustBa.leg3Out, 0.000018, 1e-6);
for (const [liq, lo, hi, px, ain, fee, dir, liq2, outer, liq3, outer3] of [
  [TSWAP_L, "0.8", "1.25", "1", "75", 25, "ab", TSWAP_L, "0.64", TSWAP_L, "0.512"],
  [TSWAP_L, "0.8", "1.25", "1.2", "500", 25, "ba", TSWAP_L, "1.5625", "500", "2"],
  ["5000", "0.5", "2", "1.1", "900", 30, "ab", "2500", "0.25", "1200", "0.125"],
  ["5000", "0.5", "2", "0.9", "700", 5, "ba", "8000", "4", "3000", "8"],
  ["123.456", "2.4", "2.6", "2.5", "40", 60, "ab", "60", "2.25", "30", "2.025"],
  ["1000000", "0.99", "1.01", "1", "20000", 1, "ba", "1000000", "1.0201", "500000", "1.030301"]
]) {
  const x = app.clmmTripleSwap(liq, lo, hi, px, ain, fee, dir, liq2, outer, liq3, outer3);
  const p = app.clmmCrossSwap(liq, lo, hi, px, ain, fee, dir, liq2, outer);
  const tag = "TSWAP sweep " + dir + " " + ain + " @ " + px + " in " + lo + "-" + hi;
  check(tag + " settles", x !== null && p !== null);
  near(tag + " legs conserve the used input", x.leg1UsedIn + x.leg2UsedIn + x.leg3UsedIn, x.usedIn, 1e-7);
  near(tag + " legs conserve the output", x.leg1Out + x.leg2Out + x.leg3Out, x.amountOut, 1e-7);
  near(tag + " used plus unfilled is the amount in", x.usedIn + x.unfilledIn, x.amountIn, 1e-7);
  near(tag + " fee is the tier's share of the used input", x.feePaid, x.usedIn * fee / 10000, 1e-7);
  check(tag + " enteredThird matches tool 43's second wall", x.enteredThird === p.hitSecondBoundary);
  check(tag + " first two legs are tool 43 verbatim", x.leg1UsedIn === p.leg1UsedIn && x.leg2UsedIn === p.leg2UsedIn && x.leg1Out === p.leg1Out && x.leg2Out === p.leg2Out);
  check(tag + " third range only ever adds output", x.enteredThird ? x.amountOut > p.amountOut : (x.amountOut === p.amountOut && x.newPrice === p.newPrice));
  check(tag + " new price stays inside the third range when entered", !x.enteredThird || (x.newPrice >= x.thirdLowerPrice - 1e-12 && x.newPrice <= x.thirdUpperPrice + 1e-12));
}
check("all tswap controls labelled", ["tswap-liq", "tswap-lower", "tswap-upper", "tswap-price", "tswap-dir", "tswap-ain", "tswap-fee", "tswap-liq2", "tswap-outer", "tswap-liq3", "tswap-outer3", "tswap-out", "tswap-newprice", "tswap-used"].every(id => html.includes(`for="${id}"`)));
check("tswap tool present in index.html", html.includes('id="tswap-calc"') && html.includes('id="tswap-result"'));
check("tswap honesty: third wall and not-live labels", html.includes("supply that third range too") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("is again unfilled, not absorbed"));
check("guide covers CLMM three-range swap", guide.includes("The ladder keeps going past the second wall"));

/* ---------- Tool 47: CLMM three-range exact-out swap model (TXO) ---------- */
const TXO_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; position holds 100 A / 100 B
const txSmall = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "150", 25, "ab", TXO_L, "0.64", TXO_L, "0.512");
const xxoSmall = app.clmmCrossSwapExactOut(TXO_L, "0.8", "1.25", "1", "150", 25, "ab", TXO_L, "0.64");
check("TXO target inside two ranges does not enter the third", txSmall !== null && txSmall.enteredThird === false && txSmall.hitThirdBoundary === false);
check("TXO uncrossed answer is tool 45 verbatim", txSmall.amountIn === xxoSmall.amountIn && txSmall.newPrice === xxoSmall.newPrice && txSmall.feePaid === xxoSmall.feePaid && txSmall.leg1In === xxoSmall.leg1In && txSmall.leg2In === xxoSmall.leg2In);
check("TXO uncrossed third leg is zero", txSmall.leg3In === 0 && txSmall.leg3Out === 0);
near("TXO combined ceiling is the three holdings summed", txSmall.maxOut, 269.4427190999915, 1e-9);
near("TXO third range holding", txSmall.thirdMaxOut, 80, 1e-9);
const tx = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", TXO_L, "0.512");
check("TXO headline enters the third range without filling it", tx !== null && tx.enteredThird === true && tx.hitThirdBoundary === false && tx.crossed === true);
near("TXO headline amount in", tx.amountIn, 304.5189622517961, 1e-9);
near("TXO headline new price", tx.newPrice, 0.5733253978205031, 1e-9);
near("TXO headline impact", tx.priceImpactPct, 24.4710417048443, 1e-9);
near("TXO headline leg 1 in is tool 45's edge price", tx.leg1In, 112.0836078947263, 1e-9);
near("TXO headline leg 1 out is the first range's holding", tx.leg1Out, 100, 1e-12);
near("TXO headline leg 2 in", tx.leg2In, 125.31328320801993, 1e-9);
near("TXO headline leg 2 out is the second range's holding", tx.leg2Out, 89.4427190999915, 1e-9);
near("TXO headline leg 3 in", tx.leg3In, 67.12207114904986, 1e-9);
near("TXO headline leg 3 out is the target past the two-range ceiling", tx.leg3Out, 40.55728090000849, 1e-9);
near("TXO headline legs conserve the input", tx.leg1In + tx.leg2In + tx.leg3In, tx.amountIn, 1e-9);
near("TXO headline legs conserve the output", tx.leg1Out + tx.leg2Out + tx.leg3Out, tx.amountOut, 1e-9);
near("TXO headline fee is the tier's share of the total input", tx.feePaid, tx.amountIn * 0.0025, 1e-9);
near("TXO headline leg 3 out is the third range's shed holding", tx.leg3Out, Number(TXO_L) * (Math.sqrt(0.64) - Math.sqrt(tx.newPrice)), 1e-9);
const xxoCeil = app.clmmCrossSwapExactOut(TXO_L, "0.8", "1.25", "1", String(tx.firstMaxOut + tx.secondMaxOut), 25, "ab", TXO_L, "0.64");
check("TXO first two legs are tool 45's combined-ceiling legs verbatim", xxoCeil !== null && tx.leg1In === xxoCeil.leg1In && tx.leg2In === xxoCeil.leg2In && tx.leg1Out === xxoCeil.leg1Out && tx.leg2Out === xxoCeil.leg2Out);
const txRt = app.clmmTripleSwap(TXO_L, "0.8", "1.25", "1", String(tx.amountIn), 25, "ab", TXO_L, "0.64", TXO_L, "0.512");
near("TXO headline round-trips through tool 46 to the target", txRt.amountOut, 230, 1e-7);
near("TXO headline round-trip lands at the same price", txRt.newPrice, tx.newPrice, 1e-9);
const txCeil = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", String(tx.maxOut), 25, "ab", TXO_L, "0.64", TXO_L, "0.512");
check("TXO combined-ceiling target fills the third range exactly", txCeil !== null && txCeil.enteredThird === true && txCeil.hitThirdBoundary === true);
near("TXO ceiling walks to the third outer edge", txCeil.newPrice, 0.512, 1e-12);
near("TXO ceiling amount in is tool 46's triple-cap used in", txCeil.amountIn, 377.50140097115417, 1e-7);
near("TXO ceiling leg 3 out is the third range's whole holding", txCeil.leg3Out, 80, 1e-9);
check("TXO rejects a target above the three ranges' combined holding", app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "270", 25, "ab", TXO_L, "0.64", TXO_L, "0.512") === null);
const txBa = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ba", TXO_L, "1.5625", TXO_L, "1.953125");
near("TXO pay-B mirror amount in", txBa.amountIn, tx.amountIn, 1e-9);
near("TXO mirror prices are reciprocal", 1 / txBa.newPrice, tx.newPrice, 1e-9);
near("TXO pay-B mirror leg 3 out", txBa.leg3Out, tx.leg3Out, 1e-9);
const txZero = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 0, "ab", TXO_L, "0.64", TXO_L, "0.512");
near("TXO zero-fee amount in", txZero.amountIn, 303.7576648461666, 1e-9);
check("TXO zero fee charges no fee", txZero.feePaid === 0 && txZero.amountIn === txZero.netIn);
const txThin = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "195", 25, "ab", TXO_L, "0.64", String(Number(TXO_L) / 10), "0.512");
const txEq195 = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "195", 25, "ab", TXO_L, "0.64", TXO_L, "0.512");
check("TXO thin third range charges more for the same remainder", txThin !== null && txThin.amountIn > txEq195.amountIn && txThin.leg3In > txEq195.leg3In);
near("TXO thin third amount in", txThin.amountIn, 246.79083043336672, 1e-9);
near("TXO thin third ceiling", txThin.maxOut, 197.4427190999915, 1e-9);
check("TXO thin third range makes the headline target impossible outright", app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", String(Number(TXO_L) / 10), "0.512") === null);
const txDeep = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", String(Number(TXO_L) * 10), "0.512");
check("TXO deep third range charges less for the same remainder", txDeep !== null && txDeep.amountIn < tx.amountIn && txDeep.leg3In < tx.leg3In);
near("TXO deep third amount in", txDeep.amountIn, 301.2683179861769, 1e-9);
near("TXO deep third new price walks barely into the third range", txDeep.newPrice, 0.6331675396373772, 1e-9);
const txDust = app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "189.4427196", 25, "ab", TXO_L, "0.64", "1e12", "0.512");
check("TXO dust remainder past the second wall against a deep third range still settles", txDust !== null && txDust.enteredThird === true && txDust.leg3In > 0);
near("TXO dust remainder leg 3 out", txDust && txDust.leg3Out, 5.00008496828741e-7, 1e-12);
near("TXO dust remainder amount in", txDust && txDust.amountIn, 237.39689188596756, 1e-9);
check("TXO rejects a third outer edge on the wrong side or at the second edge", app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", TXO_L, "0.7") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", TXO_L, "0.64") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ba", TXO_L, "1.5625", TXO_L, "1.4") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ba", TXO_L, "1.5625", TXO_L, "1.5625") === null);
check("TXO rejects bad third ranges and inherited bad inputs", app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", "0", "0.512") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", TXO_L, "abc") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 25, "xx", TXO_L, "0.64", TXO_L, "0.512") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "230", 10000, "ab", TXO_L, "0.64", TXO_L, "0.512") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1.25", "230", 25, "ab", TXO_L, "0.64", TXO_L, "0.512") === null && app.clmmTripleSwapExactOut(TXO_L, "0.8", "1.25", "1", "0", 25, "ab", TXO_L, "0.64", TXO_L, "0.512") === null);
for (const [liq, lo, hi, px, aout, fee, dir, liq2, outer, liq3, outer3] of [
  [TXO_L, "0.8", "1.25", "1", "230", 25, "ab", TXO_L, "0.64", TXO_L, "0.512"],
  ["5000", "0.5", "2", "1.1", "2300", 30, "ab", "2500", "0.25", "1200", "0.125"],
  ["5000", "0.5", "2", "0.9", "3600", 5, "ba", "8000", "4", "3000", "8"],
  ["123.456", "2.4", "2.6", "2.5", "7.5", 60, "ab", "60", "2.25", "30", "2.025"],
  ["1000000", "0.99", "1.01", "1", "11000", 1, "ba", "1000000", "1.0201", "500000", "1.030301"]
]) {
  const x = app.clmmTripleSwapExactOut(liq, lo, hi, px, aout, fee, dir, liq2, outer, liq3, outer3);
  const tag = "TXO sweep " + dir + " " + aout + " @ " + px + " in " + lo + "-" + hi;
  check(tag + " settles entering the third range", x !== null && x.enteredThird === true);
  if (x === null) continue;
  const ceil2 = app.clmmCrossSwapExactOut(liq, lo, hi, px, String(x.firstMaxOut + x.secondMaxOut), fee, dir, liq2, outer);
  check(tag + " first two legs are tool 45's ceiling legs verbatim", ceil2 !== null && x.leg1In === ceil2.leg1In && x.leg2In === ceil2.leg2In && x.leg1Out === ceil2.leg1Out && x.leg2Out === ceil2.leg2Out);
  check(tag + " legs conserve the output", Math.abs(x.leg1Out + x.leg2Out + x.leg3Out - x.amountOut) <= x.amountOut * 1e-12);
  check(tag + " legs conserve the input", Math.abs(x.leg1In + x.leg2In + x.leg3In - x.amountIn) <= x.amountIn * 1e-12);
  check(tag + " fee is the tier's share of the total input", Math.abs(x.feePaid - x.amountIn * fee / 10000) <= x.amountIn * 1e-12);
  const fwd = app.clmmTripleSwap(liq, lo, hi, px, String(x.amountIn), fee, dir, liq2, outer, liq3, outer3);
  check(tag + " round-trips through tool 46 to the target", fwd !== null && Math.abs(fwd.amountOut - x.amountOut) <= x.amountOut * 1e-9 && Math.abs(fwd.newPrice - x.newPrice) <= x.newPrice * 1e-9);
  check(tag + " new price stays inside the third range", x.newPrice >= x.thirdLowerPrice - 1e-12 && x.newPrice <= x.thirdUpperPrice + 1e-12);
}
check("XXO prices its exact combined ceiling at ranges where the fp remainder overshoots (tool 47 regression)", (() => { const a = app.clmmCrossSwapExactOut("5000", "0.5", "2", "1.1", "1", 30, "ab", "2500", "0.25"); const b = app.clmmCrossSwapExactOut("5000", "0.5", "2", "0.9", "1", 5, "ba", "8000", "4"); const ca = a && app.clmmCrossSwapExactOut("5000", "0.5", "2", "1.1", String(a.maxOut), 30, "ab", "2500", "0.25"); const cb = b && app.clmmCrossSwapExactOut("5000", "0.5", "2", "0.9", String(b.maxOut), 5, "ba", "8000", "4"); return ca !== null && cb !== null && ca.hitSecondBoundary === true && cb.hitSecondBoundary === true; })());
check("XXO still rejects a target genuinely above the combined ceiling at those ranges", app.clmmCrossSwapExactOut("5000", "0.5", "2", "1.1", "2226.278", 30, "ab", "2500", "0.25") === null);
check("all txo controls labelled", ["txo-liq", "txo-lower", "txo-upper", "txo-price", "txo-dir", "txo-aout", "txo-fee", "txo-liq2", "txo-outer", "txo-liq3", "txo-outer3", "txo-ain", "txo-newprice", "txo-maxout"].every(id => html.includes(`for="${id}"`)));
check("txo tool present in index.html", html.includes('id="txo-calc"') && html.includes('id="txo-result"'));
check("txo honesty: third ceiling and not-live labels", html.includes("supply that third range too") && html.includes("not live pool state") && html.includes("not financial advice") && html.includes("does not invent either"));
check("guide covers CLMM three-range exact-out swap", guide.includes("Exact-out keeps going past the second wall too"));

/* ---------- Tool 48: CLMM single-sided zap-in planner from token B (CZB) ---------- */
const czb1 = app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "100", 25);
check("CZB headline settles in range", czb1 !== null && czb1.status === "in" && czb1.inRange === true);
near("CZB headline swap in (B)", czb1.swapIn, 51.310156586, 1e-9);
near("CZB headline swap out (A)", czb1.swapOut, 48.689843413, 1e-9);
near("CZB headline deposit A", czb1.depositA, 48.689843413, 1e-9);
near("CZB headline deposit B", czb1.depositB, 48.689843413, 1e-9);
near("CZB headline liquidity = tool 33's L", czb1.liquidity, 461.19681643557664, 1e-9);
check("CZB headline limiting side is A (tool 33's mirror)", czb1.limiting === "A" && czb1.leftoverA === 0 && czb1.leftoverB > 0 && czb1.leftoverB < 1e-6);
near("CZB headline ratio B per A at centre = price", czb1.ratioBperA, 1, 1e-12);
const cza1 = app.clmmZapIn("1000", "1000", "1", "0.8", "1.25", "100", 25);
check("CZB headline is tool 33's plan mirrored exactly", czb1.swapIn === cza1.swapIn && czb1.swapOut === cza1.swapOut && czb1.depositA === cza1.depositB && czb1.depositB === cza1.depositA && czb1.liquidity === cza1.liquidity);
const czb0 = app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "100", 0);
near("CZB zero-fee split = closed form", czb0.swapIn, 51.249219725039325, 1e-9);
near("CZB zero-fee deposit each side", czb0.depositB, 48.750780274, 1e-9);
const czbC2 = app.clmmZapInB("1000", "1000", "2", "1.6", "2.5", "100", 25);
near("CZB centred range ratio = price (2)", czbC2.ratioBperA, 2, 1e-12);
near("CZB centred range deposit B = 2 x deposit A", czbC2.depositB / czbC2.depositA, 2, 1e-9);
const czbC4 = app.clmmZapInB("500", "2000", "4", "3.2", "5", "200", 25);
near("CZB centred range ratio = price (4)", czbC4.ratioBperA, 4, 1e-12);
near("CZB centred range 4 deposit B = 4 x deposit A", czbC4.depositB / czbC4.depositA, 4, 1e-9);
const czbTop = app.clmmZapInB("1000", "1000", "1.24", "0.8", "1.25", "100", 25);
check("CZB near the top edge swaps only a sliver", czbTop !== null && czbTop.swapIn > 0 && czbTop.swapIn < 2);
near("CZB near-top swap in", czbTop.swapIn, 1.622601457, 1e-9);
const czbLow = app.clmmZapInB("1000", "1000", "0.81", "0.8", "1.25", "100", 25);
check("CZB near the lower edge swaps almost everything", czbLow !== null && czbLow.swapIn > 97);
near("CZB near-lower swap in", czbLow.swapIn, 97.715811388, 1e-9);
const czbBelow = app.clmmZapInB("1000", "1000", "0.7", "0.8", "1.25", "100", 25);
check("CZB below range swaps everything", czbBelow !== null && czbBelow.status === "below" && czbBelow.swapIn === 100 && czbBelow.depositB === 0);
near("CZB below swap out = tool 1 B->A fill", czbBelow.swapOut, 90.70243237, 1e-9);
check("CZB below deposit is the swap out alone", czbBelow.depositA === czbBelow.swapOut && czbBelow.leftoverA === 0 && czbBelow.leftoverB === 0);
const czbAtLower = app.clmmZapInB("1000", "1000", "0.8", "0.8", "1.25", "100", 25);
check("CZB at the lower edge is the below case", czbAtLower !== null && czbAtLower.status === "below" && czbAtLower.swapOut === czbBelow.swapOut);
const czbAbove = app.clmmZapInB("1000", "1000", "1.3", "0.8", "1.25", "100", 25);
check("CZB above range needs no swap", czbAbove !== null && czbAbove.status === "above" && czbAbove.swapIn === 0 && czbAbove.swapOut === 0 && czbAbove.depositA === 0 && czbAbove.depositB === 100);
near("CZB above liquidity", czbAbove.liquidity, 447.2135955, 1e-7);
check("CZB above limiting side is B", czbAbove.limiting === "B");
const czbAtUpper = app.clmmZapInB("1000", "1000", "1.25", "0.8", "1.25", "100", 25);
check("CZB at the upper edge is the above case", czbAtUpper !== null && czbAtUpper.status === "above" && czbAtUpper.liquidity === czbAbove.liquidity);
const czb35 = app.clmmRangePlanB("1", "0.8", "1.25", String(czb1.depositB));
near("CZB headline deposit feeds tool 35 back the same A", czb35.requiredA, czb1.depositA, 1e-9);
near("CZB headline deposit feeds tool 35 back the same L", czb35.liquidity, czb1.liquidity, 1e-9);
for (const [ra, rb, px, lo, hi, y, fee] of [
  ["2000", "500", "0.25", "0.2", "0.3125", "50", 30],
  ["1234", "9876", "8", "6.4", "10", "777", 5],
  ["10000", "10000", "1", "0.5", "2", "5000", 100],
  ["750", "3000", "3.9", "3.2", "5", "42.5", 0],
  ["1000", "1000", "1.1", "0.9", "1.21", "250", 25]
]) {
  const r = app.clmmZapInB(ra, rb, px, lo, hi, y, fee);
  const tag = "CZB sweep " + [ra, rb, px, lo, hi, y, fee].join("/");
  check(tag + " settles in range", r !== null && r.status === "in");
  if (r === null) continue;
  const sw = app.cpSwap(rb, ra, r.swapIn.toFixed(9), fee);
  check(tag + " swap leg is tool 1 verbatim", sw !== null && Number(sw.out) === r.swapOut && sw.priceImpactPct === r.swapPriceImpactPct);
  const plan = app.clmmWalletPlan(px, lo, hi, sw.out, String(Number(y) - r.swapIn));
  check(tag + " deposit is tool 14 verbatim", plan !== null && plan.usedA === r.depositA && plan.usedB === r.depositB && plan.liquidity === r.liquidity && plan.limiting === r.limiting);
  check(tag + " B is conserved", Math.abs(r.swapIn + r.depositB + r.leftoverB - Number(y)) <= 1e-6);
  check(tag + " A is conserved", Math.abs(r.depositA + r.leftoverA - r.swapOut) <= 1e-9);
  check(tag + " deposit lands at the range ratio", Math.abs(r.depositB / r.depositA - r.ratioBperA) <= 1e-6);
}
check("CZB rejects blank fields", app.clmmZapInB("", "1000", "1", "0.8", "1.25", "100", 25) === null && app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "", 25) === null);
check("CZB rejects zero or negative amounts and reserves", app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "0", 25) === null && app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "-5", 25) === null && app.clmmZapInB("0", "1000", "1", "0.8", "1.25", "100", 25) === null);
check("CZB rejects inverted or degenerate ranges", app.clmmZapInB("1000", "1000", "1", "1.25", "0.8", "100", 25) === null && app.clmmZapInB("1000", "1000", "1", "1", "1", "100", 25) === null);
check("CZB rejects bad fee tiers", app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "100", 10000) === null && app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "100", 2.5) === null && app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "100", -1) === null);
check("CZB rejects non-numeric input", app.clmmZapInB("abc", "1000", "1", "0.8", "1.25", "100", 25) === null && app.clmmZapInB("1000", "1000", "1", "0.8", "1.25", "xyz", 25) === null);
check("all czapb controls labelled", ["czapb-ra", "czapb-rb", "czapb-bps", "czapb-cur", "czapb-lower", "czapb-upper", "czapb-amt", "czapb-out"].every(id => html.includes(`for="${id}"`)));
check("czapb tool present in index.html", html.includes('id="czapb-calc"') && html.includes('id="czapb-result"'));
check("czapb honesty: B-side entry and not-live labels", html.includes("wallet holding only token B") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers CLMM zap-in from token B", guide.includes("Entering a CLMM range from the B side"));

/* ---------- Zap-in quadratic cancellation at extreme pool ratios ---------- */
/* The naive root -qb + sqrt(disc) subtracts two nearly-equal numbers
   when qb > 0 (deep pool vs the holding): both zap tools returned
   splits off by up to 22% at a 1e6 reserve ratio, leaving a real
   leftover (22 of 100 for Tool 33) instead of dust. The product-form
   root must land on the stable values below. */
const czbDeep = app.clmmZapInB("1000000000000", "1000000000000", "1", "0.8", "1.25", "1", 25);
near("CZB deep-pool split is the stable root", czbDeep.swapIn, 0.500625782, 1e-9);
check("CZB deep-pool leftover is dust", czbDeep.leftoverB > 0 && czbDeep.leftoverB < 1e-6);
const czbRatio = app.clmmZapInB("1000000", "1000000000000", "1", "0.8", "1.25", "100", 25);
near("CZB 1e6-ratio split is the stable root", czbRatio.swapIn, 99.99990025, 1e-9);
check("CZB 1e6-ratio leftover is dust", czbRatio.leftoverB > 0 && czbRatio.leftoverB < 1e-6);
const czaRatio = app.clmmZapIn("1000000", "1000000000000", "1", "0.8", "1.25", "100", 25);
near("CZA 1e6-ratio split is the stable root", czaRatio.swapIn, 0.00010025, 1e-12);
check("CZA 1e6-ratio leaves no B leftover (was 22 of 100)", czaRatio.leftoverB === 0 && czaRatio.depositB > 99.99);
const czaDeep = app.clmmZapIn("1000000000000", "1000000000000", "1", "0.8", "1.25", "0.001", 25);
near("CZA deep-pool tiny-holding split is the stable root", czaDeep.swapIn, 0.000500625, 1e-12);

/* ---------- Tool 49: CLMM single-sided zap-out planner to token B (CZOB) ---------- */
const czob1 = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1", 25);
check("CZOB headline in range", czob1.status === "in" && czob1.inRange === true);
near("CZOB headline withdraw A = Tool 9 amount", czob1.withdrawA, 100, 1e-9);
near("CZOB headline withdraw B = Tool 9 amount", czob1.withdrawB, 100, 1e-9);
near("CZOB headline swap in is the whole A leg", czob1.swapIn, 100, 1e-12);
near("CZOB headline swap return", czob1.swapOut, 90.70243237, 1e-9);
near("CZOB headline total B", czob1.totalB, 190.70243237, 1e-9);
near("CZOB headline value at spot", czob1.valueAtSpotB, 200, 1e-9);
near("CZOB headline consolidation cost", czob1.consolidationCostB, 9.29756763, 1e-6);
near("CZOB headline consolidation cost %", czob1.consolidationCostPct, 4.648783815, 1e-6);
/* the symmetric headline is Tool 34's own numbers mirrored exactly */
check("CZOB headline mirrors Tool 34 exactly", czob1.totalB === czo1.totalA && czob1.swapOut === czo1.swapOut && czob1.consolidationCostPct === czo1.consolidationCostPct);
/* both legs are the source tools verbatim */
check("CZOB withdrawal = Tool 9 verbatim", czob1.withdrawA === czoPos.amountA && czob1.withdrawB === czoPos.amountB);
check("CZOB swap leg = Tool 1 on the floored A leg", Number(app.cpSwap("1000", "1000", czob1.swapIn.toFixed(9), 25).out) === czob1.swapOut);
near("CZOB accounting: total = kept B + swap return", czob1.withdrawB + czob1.swapOut, czob1.totalB, 1e-12);
near("CZOB accounting: cost = value at spot - total", czob1.valueAtSpotB - czob1.totalB, czob1.consolidationCostB, 1e-12);
/* zero fee: swap returns 1000*100/1100, cost is impact only */
const czob0 = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1", 0);
near("CZOB zero-fee swap return", czob0.swapOut, 90.909090909, 1e-9);
near("CZOB zero-fee total B", czob0.totalB, 190.909090909, 1e-9);
near("CZOB zero-fee cost %", czob0.consolidationCostPct, 4.5454545455, 1e-6);
/* a higher swap fee costs more; a deeper swap pool costs less */
const czob100 = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1", 100);
check("CZOB higher fee costs more", czob100.consolidationCostPct > czob1.consolidationCostPct && czob100.totalB < czob1.totalB);
const czobDeep = app.clmmZapOutB("10000", "10000", L34, "0.8", "1.25", "1", 25);
check("CZOB deeper swap pool costs less", czobDeep.consolidationCostPct < czob1.consolidationCostPct && czobDeep.consolidationCostPct > 0);
/* composition sweep: withdrawal is Tool 9, swap is Tool 1, total never beats spot value */
for (const [liq, lo, hi, cur, ra, rb, bps] of [[L34, "0.8", "1.25", "1.2", "1000", "1000", 25], ["500", "0.5", "2", "1.5", "2000", "500", 25], ["2000", "2", "8", "3", "100", "4000", 100], ["100", "0.9", "1.1", "1.05", "5000", "5000", 5]]) {
  const z = app.clmmZapOutB(ra, rb, liq, lo, hi, cur, bps);
  const p = app.clmmPositionAtPrice(liq, lo, hi, cur);
  check("CZOB sweep settles at price " + cur + " in " + ra + "/" + rb, z !== null && z.withdrawA === p.amountA && z.withdrawB === p.amountB && z.totalB <= z.valueAtSpotB + 1e-9 && z.consolidationCostB >= -1e-12);
  check("CZOB sweep swap = Tool 1 at price " + cur + " in " + ra + "/" + rb, z.swapOut === Number(app.cpSwap(ra, rb, z.swapIn.toFixed(9), bps).out));
  near("CZOB sweep total = kept B + swap return at price " + cur + " in " + ra + "/" + rb, z.withdrawB + z.swapOut, z.totalB, 1e-9);
}
/* range edges: above needs no swap; below swaps everything and cost % = impact */
const czobAbove = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "2", 25);
check("CZOB above range swaps nothing", czobAbove.status === "above" && czobAbove.swapIn === 0 && czobAbove.swapOut === 0 && czobAbove.consolidationCostB === 0 && czobAbove.consolidationCostPct === 0);
near("CZOB above range total is the whole B holding", czobAbove.totalB, 211.80339887, 1e-6);
near("CZOB above range total = Tool 9 amount", czobAbove.totalB, app.clmmPositionAtPrice(L34, "0.8", "1.25", "2").amountB, 1e-12);
const czobAtUp = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1.25", 25);
check("CZOB at the upper edge is the above case", czobAtUp.status === "above" && czobAtUp.swapIn === 0);
const czobBelow = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "0.5", 25);
check("CZOB below range is entirely A", czobBelow.status === "below" && czobBelow.withdrawB === 0 && czobBelow.swapIn > 0);
near("CZOB below range withdraw A", czobBelow.withdrawA, 211.80339887, 1e-6);
near("CZOB below range swap return", czobBelow.swapOut, 174.422888212, 1e-6);
near("CZOB below range cost % = swap price impact", czobBelow.consolidationCostPct, czobBelow.swapPriceImpactPct, 1e-6);
const czobAtLow = app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "0.8", 25);
check("CZOB at the lower edge is the below case", czobAtLow.status === "below" && czobAtLow.withdrawB === 0);
/* rejections */
check("CZOB rejects blank fields", app.clmmZapOutB("", "1000", L34, "0.8", "1.25", "1", 25) === null && app.clmmZapOutB("1000", "1000", "", "0.8", "1.25", "1", 25) === null && app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1", "") === null);
check("CZOB rejects non-positive reserves, liquidity or price", app.clmmZapOutB("0", "1000", L34, "0.8", "1.25", "1", 25) === null && app.clmmZapOutB("1000", "1000", "0", "0.8", "1.25", "1", 25) === null && app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "0", 25) === null);
check("CZOB rejects inverted range and bad fee tiers", app.clmmZapOutB("1000", "1000", L34, "1.25", "0.8", "1", 25) === null && app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1", 10000) === null && app.clmmZapOutB("1000", "1000", L34, "0.8", "1.25", "1", "25.5") === null);
check("CZOB rejects an A leg too small to swap at 9 dp", app.clmmZapOutB("1000", "1000", "0.000000001", "0.8", "1.25", "1", 25) === null);
check("all czob controls labelled", ["czob-ra", "czob-rb", "czob-bps", "czob-l", "czob-lower", "czob-upper", "czob-cur", "czob-out"].every(id => html.includes(`for="${id}"`)));
check("czob tool present in index.html", html.includes('id="czob-calc"') && html.includes('id="czob-result"'));
check("czob honesty: separate models and not-live labels", html.includes("Tool 34's exit mirror") && html.includes("modelled separately") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers CLMM zap-out to token B", guide.includes("Leaving a CLMM position into token B"));

/* ---------- Tool 50: single-sided zap-in planner from token B (ZAPB) ---------- */
const zapb1 = app.zapInPlanB("1000", "1000", "100", 25);
near("ZAPB headline swap split", zapb1.swapIn, 48.87278054410468, 1e-9);
near("ZAPB headline swap out", zapb1.swapOut, 46.48445365195494, 1e-9);
check("ZAPB deposit A is the swap out", zapb1.depositA === zapb1.swapOut);
near("ZAPB headline deposit B", zapb1.depositB, 51.12721945589532, 1e-9);
near("ZAPB headline share pct", zapb1.sharePct, 4.648445365195494, 1e-9);
near("ZAPB headline final A reserve returns to start", zapb1.finalReserveA, 1000, 1e-9);
/* the balanced headline is Tool 19's own plan mirrored */
const zapA1 = app.zapInPlan("1000", "1000", "100", 25);
near("ZAPB mirrors Tool 19 swap split", zapb1.swapIn, zapA1.swapIn, 1e-9);
near("ZAPB mirrors Tool 19 swap out", zapb1.swapOut, zapA1.swapOut, 1e-9);
near("ZAPB mirrors Tool 19 share", zapb1.sharePct, zapA1.sharePct, 1e-9);
near("ZAPB deposit B = Tool 19 deposit A", zapb1.depositB, zapA1.depositA, 1e-9);
/* zero fee: split is the closed form -Rb + sqrt(Rb(Rb+Y)) */
const zapb0 = app.zapInPlanB("1000", "1000", "100", 0);
near("ZAPB zero-fee swap split", zapb0.swapIn, 48.80884817015158, 1e-9);
near("ZAPB zero-fee swap split = closed form", zapb0.swapIn, -1000 + Math.sqrt(1000 * 1100), 1e-9);
near("ZAPB zero-fee swap out", zapb0.swapOut, 46.53741075440771, 1e-9);
check("ZAPB larger fee swaps more", zapb1.swapIn > zapb0.swapIn && app.zapInPlanB("1000", "1000", "100", 100).swapIn > zapb1.swapIn);
/* asymmetric pool vector, pre-verified against a clean prototype */
const zapbAsym = app.zapInPlanB("1000", "500", "100", 25);
near("ZAPB asym swap split", zapbAsym.swapIn, 47.78749375758538, 1e-9);
near("ZAPB asym swap out", zapbAsym.swapOut, 87.03817430490466, 1e-9);
near("ZAPB asym deposit B", zapbAsym.depositB, 52.21250624241462, 1e-9);
near("ZAPB asym share pct", zapbAsym.sharePct, 8.703817430490465, 1e-9);
/* composition sweep: invariants + the split uses the whole holding */
for (const [ra, rb, y, f] of [[1000, 1000, 100, 25], [1000, 500, 100, 25], [500, 2000, 50, 100], [2000, 500, 10, 5], [100, 4000, 2000, 25], [10000, 10000, 1, 25], [1000, 1000, 100, 0]]) {
  const z = app.zapInPlanB(String(ra), String(rb), String(y), f);
  const label = ra + "/" + rb + " Y" + y + " @" + f;
  check("ZAPB " + label + " settles", z !== null && z.swapIn > 0 && z.swapIn < z.amountB);
  near("ZAPB " + label + " final A reserve returns to start", z.finalReserveA, z.reserveA, Math.max(1e-9, ra * 1e-12));
  near("ZAPB " + label + " deposit ratio matches post-swap pool ratio", z.depositA / z.depositB, z.postSwapReserveA / z.postSwapReserveB, 1e-9);
  near("ZAPB " + label + " share same on both sides", z.depositA / z.finalReserveA * 100, z.sharePct, 1e-9);
  check("ZAPB " + label + " split uses the whole holding", Math.abs(z.swapIn + z.depositB - z.amountB) < 1e-9 && z.depositA === z.swapOut);
}
near("ZAPB swap leg matches Tool 1", Number(app.cpSwap("1000", "1000", zapb1.swapIn.toFixed(9), 25).out), zapb1.swapOut, 1e-4);
near("ZAPB deposit leg matches Tool 5", Number(app.depositPlan(zapb1.postSwapReserveA.toFixed(6), zapb1.postSwapReserveB.toFixed(6), zapb1.depositA.toFixed(6)).requiredB), zapb1.depositB, 1e-3);
/* cancellation regression: the naive root was ~2% off on a deep pool
   with a tiny holding, for Tool 19 and for this mirror alike */
near("ZAPB deep-pool tiny-holding split is the stable root", app.zapInPlanB("1000000000000", "1000000000000", "0.001", 25).swapIn, 0.0005006257822277846, 1e-12);
near("ZAP deep-pool tiny-holding split is the stable root (Tool 19 fix)", app.zapInPlan("1000000000000", "1000000000000", "0.001", 25).swapIn, 0.0005006257822277846, 1e-12);
near("ZAP deep-pool split is the stable root (Tool 19 fix)", app.zapInPlan("1000000000000", "1000000000000", "1", 25).swapIn, 0.5006257822276599, 1e-12);
check("ZAPB rejects zero / negative reserves and holding", app.zapInPlanB("0", "1000", "100", 25) === null && app.zapInPlanB("1000", "0", "100", 25) === null && app.zapInPlanB("1000", "1000", "0", 25) === null && app.zapInPlanB("1000", "1000", "-5", 25) === null);
check("ZAPB rejects bad fees", app.zapInPlanB("1000", "1000", "100", -1) === null && app.zapInPlanB("1000", "1000", "100", 10000) === null && app.zapInPlanB("1000", "1000", "100", 2.5) === null);
check("ZAPB rejects junk / empty", app.zapInPlanB("abc", "1000", "100", 25) === null && app.zapInPlanB("1000", "1000", "", 25) === null && app.zapInPlanB("", "1000", "100", 25) === null && app.zapInPlanB("1000", "1000", "100", "") === null);
check("all zapb controls labelled", ["zapb-ra", "zapb-rb", "zapb-bb", "zapb-fee", "zapb-swap", "zapb-depa"].every(id => html.includes(`for="${id}"`)));
check("zapb tool present in index.html", html.includes('id="zapb-calc"') && html.includes('id="zapb-result"'));
check("zapb honesty: B-side entry and not-live labels", html.includes("Tool 19's entry mirror") && html.includes("wallet holding only token B") && html.includes("not live pool state") && html.includes("not financial advice"));
check("guide covers zap-in from token B", guide.includes("Entering a constant-product pool from the B side"));
check("README lists tool 49 and tool 50", readme.includes("49. **CLMM single-sided zap-out planner to token B**") && readme.includes("50. **Single-sided zap-in planner from token B**"));

/* ---------- Tool 51: single-sided zap-out planner to token B (ZOB) ---------- */
/* zero-fee known values, Tool 20's mirrored: withdraw 10% of 1000/1000 in full
   (100 A + 100 B, 900/900 left), then swap the 100 A into the shallower pool:
   out = 900*100/1000 = 90 B, total 190 B against a 200 B spot value (cost 10 B, 5%) */
const zob0 = app.zapOutPlanB("1000", "1000", "10", "100", 0);
check("ZOB zero-fee feasible", zob0.feasible === true);
check("ZOB zero-fee withdrawal leg", zob0.withdrawA === "100" && zob0.withdrawB === "100" && zob0.postWithdrawReserveA === "900" && zob0.postWithdrawReserveB === "900");
check("ZOB zero-fee swap out", zob0.swapOutB === "90" && zob0.swapInA === "100");
check("ZOB zero-fee total B", zob0.totalB === "190");
near("ZOB zero-fee spot value", zob0.valueAtSpotB, 200, 1e-9);
near("ZOB zero-fee consolidation cost", zob0.consolidationCostB, 10, 1e-9);
near("ZOB zero-fee consolidation cost pct", zob0.consolidationCostPct, 5, 1e-9);
near("ZOB zero-fee swap impact", zob0.priceImpactPct, 10, 1e-9);
/* fee 25 on the same exit: the swap leg nets 99.75 A in, out = 900*99.75/999.75 */
const zobF = app.zapOutPlanB("1000", "1000", "10", "100", 25);
check("ZOB fee25 swap out", zobF.swapOutB === "89.797449362" && zobF.totalB === "189.797449362");
near("ZOB fee25 consolidation cost pct", zobF.consolidationCostPct, 5.101275319, 1e-6);
check("ZOB larger fee costs more", zobF.consolidationCostB > zob0.consolidationCostB && app.zapOutPlanB("1000", "1000", "10", "100", 100).consolidationCostB > zobF.consolidationCostB);
/* the balanced headline is Tool 20's own plan mirrored, field for field */
const zoBal = app.zapOutPlan("1000", "1000", "10", "100", 25);
check("ZOB mirrors Tool 20 swap out on a balanced pool", zobF.swapOutB === zoBal.swapOutA && zobF.totalB === zoBal.totalA);
near("ZOB mirrors Tool 20 cost pct on a balanced pool", zobF.consolidationCostPct, zoBal.consolidationCostPct, 1e-12);
near("ZOB mirrors Tool 20 spot value on a balanced pool", zobF.valueAtSpotB, zoBal.valueAtSpotA, 1e-9);
/* partial withdrawal: half of the same position leaves 950/950, swap 50 A -> 47.5 B */
const zobP = app.zapOutPlanB("1000", "1000", "10", "50", 0);
check("ZOB partial withdrawal leg", zobP.withdrawA === "50" && zobP.withdrawB === "50" && zobP.postWithdrawReserveA === "950");
check("ZOB partial totals", zobP.swapOutB === "47.5" && zobP.totalB === "97.5");
/* the cost grows with your share: exiting half the whole pool costs 25% of spot value */
const zobBig = app.zapOutPlanB("1000", "1000", "50", "100", 0);
check("ZOB big-share totals", zobBig.swapOutB === "250" && zobBig.totalB === "750");
near("ZOB big-share cost pct", zobBig.consolidationCostPct, 25, 1e-9);
check("ZOB bigger share costs a bigger share", zobBig.consolidationCostPct > zob0.consolidationCostPct && zob0.consolidationCostPct > zobP.consolidationCostPct);
/* asymmetric pool: spot 0.5 B per A, pre-verified against a clean prototype */
const zobA = app.zapOutPlanB("1000000", "500000", "10", "100", 25);
check("ZOB asymmetric swap out", zobA.swapOutB === "44898.72468117" && zobA.totalB === "94898.72468117");
near("ZOB asymmetric spot", zobA.spotPrice, 0.5, 1e-12);
near("ZOB asymmetric spot value", zobA.valueAtSpotB, 100000, 1e-6);
/* mirror parity: Tool 20 run on the reserve-swapped pool returns the same fill */
const zoSwap = app.zapOutPlan("500000", "1000000", "10", "100", 25);
check("ZOB asym equals Tool 20 on the swapped pool", zobA.swapOutB === zoSwap.swapOutA && zobA.totalB === zoSwap.totalA);
near("ZOB asym cost pct equals Tool 20 on the swapped pool", zobA.consolidationCostPct, zoSwap.consolidationCostPct, 1e-9);
/* consistency: the withdrawal leg IS Tool 7 and the swap leg IS Tool 1, unchanged */
for (const [label, z, args] of [["zero-fee", zob0, ["1000", "1000", "10", "100"]], ["fee25", zobF, ["1000", "1000", "10", "100"]], ["asym", zobA, ["1000000", "500000", "10", "100"]], ["b-heavy", app.zapOutPlanB("500", "2000", "25", "50", 100), ["500", "2000", "25", "50"]], ["small-share", app.zapOutPlanB("10000", "10000", "1", "100", 0), ["10000", "10000", "1", "100"]]]) {
  const wd = app.withdrawPlan(args[0], args[1], args[2], args[3]);
  check("ZOB " + label + " withdrawal leg matches Tool 7", z.withdrawA === wd.outA && z.withdrawB === wd.outB && z.postWithdrawReserveA === wd.remainingReserveA && z.postWithdrawReserveB === wd.remainingReserveB);
  check("ZOB " + label + " swap leg matches Tool 1", app.cpSwap(z.postWithdrawReserveA, z.postWithdrawReserveB, z.withdrawA, z.feeBps).out === z.swapOutB);
  near("ZOB " + label + " total is withdrawal B plus swap B", Number(z.totalB), Number(z.withdrawB) + Number(z.swapOutB), 1e-9);
  check("ZOB " + label + " consolidation never pays you", z.totalB !== null && Number(z.totalB) < z.valueAtSpotB && z.consolidationCostPct > 0 && z.consolidationCostPct < z.priceImpactPct);
}
/* honest edge: withdrawing all of a pool you own entirely leaves no pool to swap in */
const zobFull = app.zapOutPlanB("1000", "1000", "100", "100", 25);
check("ZOB full-pool exit is not feasible", zobFull.feasible === false && zobFull.swapOutB === null && zobFull.totalB === null && zobFull.withdrawA === "1000" && zobFull.withdrawB === "1000");
check("ZOB rejects share / withdraw out of range", app.zapOutPlanB("1000", "1000", "101", "100", 25) === null && app.zapOutPlanB("1000", "1000", "0", "100", 25) === null && app.zapOutPlanB("1000", "1000", "10", "0", 25) === null && app.zapOutPlanB("1000", "1000", "10", "101", 25) === null);
check("ZOB rejects zero reserves", app.zapOutPlanB("0", "1000", "10", "100", 25) === null && app.zapOutPlanB("1000", "0", "10", "100", 25) === null);
check("ZOB rejects bad fees", app.zapOutPlanB("1000", "1000", "10", "100", -1) === null && app.zapOutPlanB("1000", "1000", "10", "100", 10000) === null && app.zapOutPlanB("1000", "1000", "10", "100", 2.5) === null);
check("ZOB rejects junk / empty", app.zapOutPlanB("abc", "1000", "10", "100", 25) === null && app.zapOutPlanB("1000", "1000", "", "100", 25) === null && app.zapOutPlanB("1000", "1000", "10", "100", "") === null && app.zapOutPlanB("", "1000", "10", "100", 25) === null);
check("all zob controls labelled", ["zob-ra", "zob-rb", "zob-share", "zob-pct", "zob-fee", "zob-swapout", "zob-totalb"].every(id => html.includes(`for="${id}"`)));
check("zob tool present in index.html", html.includes('id="zob-calc"') && html.includes('id="zob-result"'));
check("zob honesty: exit mirror and not-live labels", html.includes("Tool 20's exit mirror") && html.includes("post-withdrawal reserves") && html.includes("not a live quote, not financial advice"));
check("guide covers zap-out to token B", guide.includes("Leaving a constant-product pool into token B"));
check("README lists tool 51", readme.includes("51. **Single-sided zap-out planner to token B**"));

/* ---------- 52 · Fee compounding calculator (APR to APY) ---------- */
const cmpAnnual = app.feeCompounding("1000", "25", "1", "2");
near("CMP annual final is the clean closed form", cmpAnnual.finalValue, 1562.5, 1e-9);
near("CMP annual fees", cmpAnnual.feesEarned, 562.5, 1e-9);
near("CMP yearly compounding makes APY equal APR", cmpAnnual.apyPct, 25, 1e-12);
near("CMP annual simple line", cmpAnnual.simpleFinal, 1500, 1e-9);
near("CMP annual compounding gain", cmpAnnual.compoundingGain, 62.5, 1e-9);
const cmpMonthly = app.feeCompounding("1000", "12", "12", "1");
near("CMP monthly APY", cmpMonthly.apyPct, 12.682503013196978, 1e-9);
near("CMP monthly final", cmpMonthly.finalValue, 1126.8250301319697, 1e-7);
near("CMP monthly periodic rate is APR/12", cmpMonthly.periodicRatePct, 1, 1e-12);
const cmpDaily = app.feeCompounding("1000", "25", "365", "1");
near("CMP daily APY", cmpDaily.apyPct, 28.391553787871015, 1e-9);
near("CMP daily final", cmpDaily.finalValue, 1283.9155378787102, 1e-7);
near("CMP daily gain over the simple line", cmpDaily.compoundingGain, 33.91553787871021, 1e-7);
check("CMP daily stays below the continuous limit", cmpDaily.finalValue < 1000 * Math.exp(0.25));
const cmpDaily2 = app.feeCompounding("5000", "36.5", "365", "1");
near("CMP 0.1%-a-day APY", cmpDaily2.apyPct, 44.02513134295205, 1e-9);
near("CMP 0.1%-a-day final", cmpDaily2.finalValue, 7201.256567147602, 1e-6);
const cmpHalf = app.feeCompounding("1000", "12", "12", "0.5");
near("CMP half-year final is (1.01)^6", cmpHalf.finalValue, 1061.520150601, 1e-7);
near("CMP half-year periods", cmpHalf.periods, 6, 1e-12);
check("CMP APY does not depend on the horizon", cmpHalf.apyPct === cmpMonthly.apyPct);
const cmpZero = app.feeCompounding("1000", "0", "365", "3");
check("CMP zero APR is the identity", cmpZero.finalValue === 1000 && cmpZero.apyPct === 0 && cmpZero.feesEarned === 0 && cmpZero.compoundingGain === 0);
/* frequency ordering: more frequent reinvestment never earns less, and is bounded by e^r */
for (const [label, dep, apr, yrs] of [["25%/1y", "1000", "25", "1"], ["12%/3y", "2500", "12", "3"], ["91.25%/2y", "10000", "91.25", "2"], ["5%/0.5y", "750", "5", "0.5"]]) {
  const finals = [1, 12, 52, 365, 8760].map(n => app.feeCompounding(dep, apr, String(n), yrs).finalValue);
  check("CMP " + label + " final rises with frequency", finals.every((v, i) => i === 0 || v > finals[i - 1]));
  check("CMP " + label + " final stays below the continuous limit", finals[finals.length - 1] < Number(dep) * Math.exp(Number(apr) / 100 * Number(yrs)) * (1 + 1e-12));
  const any = app.feeCompounding(dep, apr, "12", yrs);
  near("CMP " + label + " fees are final minus deposit", any.feesEarned, any.finalValue - any.deposit, 1e-9);
  near("CMP " + label + " gain is final minus simple", any.compoundingGain, any.finalValue - any.simpleFinal, 1e-9);
  check("CMP " + label + " compounding never loses to the simple line", any.compoundingGain >= 0);
}
/* composition: Tool 3's naive APR at n=1 over 1 year earns exactly its daily fees x365 */
const lfCmp = app.lpFees("1000000", 25, "10000", "1000000");
const cmpFromTool3 = app.feeCompounding("10000", String(lfCmp.aprPct), "1", "1");
near("CMP Tool 3 APR composes to daily fees x365", cmpFromTool3.feesEarned, lfCmp.dailyFees * 365, 1e-6);
check("CMP rejects blank / junk", app.feeCompounding("", "25", "12", "1") === null && app.feeCompounding("1000", "abc", "12", "1") === null && app.feeCompounding("1000", "25", "12", "") === null);
check("CMP rejects non-positive deposit / negative APR", app.feeCompounding("0", "25", "12", "1") === null && app.feeCompounding("-5", "25", "12", "1") === null && app.feeCompounding("1000", "-1", "12", "1") === null);
check("CMP rejects bad frequency", app.feeCompounding("1000", "25", "0", "1") === null && app.feeCompounding("1000", "25", "2.5", "1") === null && app.feeCompounding("1000", "25", "36501", "1") === null);
check("CMP rejects bad horizon", app.feeCompounding("1000", "25", "12", "0") === null && app.feeCompounding("1000", "25", "12", "-1") === null && app.feeCompounding("1000", "25", "12", "101") === null);
/* every reported figure must be finite: the APY annualises a full year, so a
   huge APR at a sub-year horizon overflows the APY behind a finite final
   value, and a huge deposit overflows the final behind a finite factor */
check("CMP rejects an overflowing APY behind a finite final", app.feeCompounding("1000", "100000", "36500", "0.01") === null && app.feeCompounding("1000", "500000", "365", "0.1") === null);
check("CMP rejects an overflowing final behind a finite factor", app.feeCompounding("1.5e308", "100", "1", "1") === null);
/* gain sign law: (1 + r/n)^(n*t) vs the simple line 1 + r*t flips at exactly
   one full period — negative gain inside the first period is the closed
   form's concavity, not a bug; it is exactly zero at one period */
const cmpSubPeriod = app.feeCompounding("1000", "25", "4", "0.1");
check("CMP sub-period gain is negative (concavity)", cmpSubPeriod.compoundingGain < 0);
check("CMP one-period gain is exactly zero", app.feeCompounding("1000", "25", "4", "0.25").compoundingGain === 0);
check("CMP past-one-period gain is positive", app.feeCompounding("1000", "25", "4", "1").compoundingGain > 0);
check("all cmp controls labelled", ["cmp-dep", "cmp-apr", "cmp-n", "cmp-years", "cmp-apy", "cmp-final"].every(id => html.includes(`for="${id}"`)));
check("cmp tool present in index.html", html.includes('id="cmp-calc"') && html.includes('id="cmp-result"'));
check("cmp honesty: APR held constant and not-live labels", html.includes("the APR is held constant on a growing balance") && html.includes("not a live yield") && html.includes("not financial advice"));
check("guide covers compounding", guide.includes("APR is not APY"));
check("README lists tool 52", readme.includes("52. **Fee compounding calculator (APR to APY)**"));

/* ---------- 53 · Loss-versus-rebalancing (LVR) round-trip calculator ---------- */
const lvrHead = app.lvrRoundTrip("1000", "1000", "10", "1");
near("LVR headline start price", lvrHead.startPrice, 1, 1e-12);
near("LVR headline top price", lvrHead.topPrice, 1.1, 1e-12);
near("LVR headline top reserve A is Tool 27's", lvrHead.topReserveA, 953.4625892455923, 1e-9);
near("LVR headline top reserve B is Tool 27's", lvrHead.topReserveB, 1048.8088481701516, 1e-9);
near("LVR headline up leg", lvrHead.lvrUpInB, 2.382303659696845, 1e-9);
near("LVR headline down leg", lvrHead.lvrDownInB, 2.2714374157440034, 1e-9);
near("LVR headline per-cycle", lvrHead.perCycleInB, 4.653741075440848, 1e-9);
near("LVR headline per-cycle pct", lvrHead.perCyclePct, 0.2326870537720424, 1e-9);
near("LVR headline position value", lvrHead.positionValueInB, 2000, 1e-9);
/* closed forms: up = Rb*(sqrt(m)-1)^2, down = up/sqrt(m) */
near("LVR up leg is the closed form Rb(sqrt m -1)^2", lvrHead.lvrUpInB, 1000 * Math.pow(Math.sqrt(1.1) - 1, 2), 1e-9);
near("LVR down leg is the up leg divided by sqrt m", lvrHead.lvrDownInB, lvrHead.lvrUpInB / Math.sqrt(1.1), 1e-9);
/* both legs are Tool 27 verbatim, and the up leg's share of the
   rebalancing value is exactly Tool 2's IL for the same move */
const lvrUp27 = app.cpReservesAfterMove("1000", "1000", 1.1);
near("LVR up leg equals Tool 27's hold-minus-LP difference", lvrHead.lvrUpInB, lvrUp27.holdValueInB - lvrUp27.lpValueInB, 1e-9);
check("LVR top reserves are Tool 27's", lvrHead.topReserveA === lvrUp27.newReserveA && lvrHead.topReserveB === lvrUp27.newReserveB);
near("LVR up-leg IL pct matches Tool 2", lvrHead.upLegIlPct, -app.impermanentLoss(1.1).ilPct, 1e-9);
check("LVR down-leg IL pct equals up-leg (m and 1/m are the same IL)", lvrHead.downLegIlPct === lvrHead.upLegIlPct);
/* a round trip restores the starting reserves and value, while
   Tool 2's end-price IL is exactly zero — the path is the cost */
near("LVR round trip restores reserve A", lvrHead.finalReserveA, 1000, 1e-6);
near("LVR round trip restores reserve B", lvrHead.finalReserveB, 1000, 1e-6);
near("LVR round trip restores value", lvrHead.finalValueInB, 2000, 1e-6);
check("LVR end-price IL is zero but the trip still costs", app.impermanentLoss(1).ilPct === 0 && lvrHead.perCycleInB > 0);
const lvr2x = app.lvrRoundTrip("1000", "1000", "100", "1");
near("LVR 2x up leg", lvr2x.lvrUpInB, 171.5728752538098, 1e-7);
near("LVR 2x per-cycle", lvr2x.perCycleInB, 292.8932188134522, 1e-7);
near("LVR 2x per-cycle pct", lvr2x.perCyclePct, 14.64466094067261, 1e-9);
const lvrAsym = app.lvrRoundTrip("2000", "1000", "25", "1");
near("LVR asym start price", lvrAsym.startPrice, 0.5, 1e-12);
near("LVR asym per-cycle", lvrAsym.perCycleInB, 26.393202250020977, 1e-7);
near("LVR asym per-cycle pct", lvrAsym.perCyclePct, 1.3196601125010488, 1e-9);
const lvr500 = app.lvrRoundTrip("500", "2000", "50", "3");
near("LVR 500/2000 per-cycle", lvr500.perCycleInB, 183.50341907227403, 1e-7);
near("LVR total is per-cycle times cycles", lvr500.totalInB, 550.5102572168221, 1e-6);
near("LVR total pct", lvr500.totalPctOfPosition, 13.762756430420552, 1e-9);
/* scaling laws across a sweep: cycles scale linearly, a bigger
   excursion costs strictly more, reserves restore every time */
for (const [ra, rb, mv, cy] of [[1000, 1000, 5, 7], [250, 4000, 33, 2], [10000, 10, 250, 4], [3, 3, 1, 100]]) {
  const s = app.lvrRoundTrip(String(ra), String(rb), String(mv), String(cy));
  check("LVR sweep " + ra + "/" + rb + " ±" + mv + "% x" + cy, s !== null &&
    Math.abs(s.totalInB - s.perCycleInB * cy) <= 1e-9 * Math.max(1, s.totalInB) &&
    Math.abs(s.finalReserveA - ra) <= 1e-6 * ra && Math.abs(s.finalReserveB - rb) <= 1e-6 * rb &&
    Math.abs(s.lvrUpInB - rb * Math.pow(Math.sqrt(1 + mv / 100) - 1, 2)) <= 1e-7 * Math.max(1, rb) &&
    s.perCycleInB > 0);
}
check("LVR cost rises with the excursion", app.lvrRoundTrip("1000", "1000", "20", "1").perCycleInB > lvrHead.perCycleInB &&
  lvrHead.perCycleInB > app.lvrRoundTrip("1000", "1000", "1", "1").perCycleInB);
/* tiny excursions must not cancel to zero: the raw hold-minus-LP
   difference returned exactly 0 for a 0.000001% wiggle on a 1e12
   pool, where the true cost over 10000 trips is ≈ 0.5 B */
const lvrTiny = app.lvrRoundTrip("1e12", "1e12", "0.000001", "10000");
near("LVR tiny-excursion total on a 1e12 pool", lvrTiny.totalInB, 0.49999999625, 1e-9);
check("LVR tiny excursion is not reported as free", lvrTiny.perCycleInB > 0 && lvrTiny.lvrDownInB > 0 && lvrTiny.lvrUpInB > lvrTiny.lvrDownInB);
const lvrDust = app.lvrRoundTrip("1000", "1000", "0.000001", "1");
near("LVR dust-scale per-cycle", lvrDust.perCycleInB, 4.9999999625e-14, 1e-20);
/* rejections */
check("LVR rejects blank / junk", app.lvrRoundTrip("", "1000", "10", "1") === null && app.lvrRoundTrip("1000", "1000", "abc", "1") === null && app.lvrRoundTrip("1000", "1000", "10", "") === null);
check("LVR rejects non-positive reserves", app.lvrRoundTrip("0", "1000", "10", "1") === null && app.lvrRoundTrip("1000", "-5", "10", "1") === null);
check("LVR rejects a zero or negative excursion (no trip, no price)", app.lvrRoundTrip("1000", "1000", "0", "1") === null && app.lvrRoundTrip("1000", "1000", "-10", "1") === null);
check("LVR rejects excursion above 10000%", app.lvrRoundTrip("1000", "1000", "10001", "1") === null);
check("LVR rejects bad cycles", app.lvrRoundTrip("1000", "1000", "10", "0") === null && app.lvrRoundTrip("1000", "1000", "10", "2.5") === null && app.lvrRoundTrip("1000", "1000", "10", "10001") === null);
check("LVR rejects overflowing inputs", app.lvrRoundTrip("1e308", "1e308", "10000", "10000") === null);
check("all lvr controls labelled", ["lvr-ra", "lvr-rb", "lvr-move", "lvr-cycles", "lvr-per", "lvr-total"].every(id => html.includes(`for="${id}"`)));
check("lvr tool present in index.html", html.includes('id="lvr-calc"') && html.includes('id="lvr-result"'));
check("lvr honesty: gross-of-fees and not-live labels", html.includes("gross of fees") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers LVR", guide.includes("A flat end price does not mean a free trip"));
check("README lists tool 53", readme.includes("53. **Loss-versus-rebalancing (LVR) round-trip calculator**"));

console.log(failures === 0 ? "\nALL TESTS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
