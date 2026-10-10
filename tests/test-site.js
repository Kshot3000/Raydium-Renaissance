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
check("cache keys present", html.includes("styles.css?v=1") && html.includes("app.js?v=105"));
check("every element id is unique (a duplicate id silently re-wires getElementById handlers to the first match)",
  (() => { const ids = [...html.matchAll(/ id="([^"]+)"/g)].map(m => m[1]); return new Set(ids).size === ids.length; })());
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
check("README lists eighty-four tools", readme.includes("eighty-four pool tools") || readme.includes("all eighty-four"));

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
check("app.js header counts eighty-four tools and names the CLMM four-range arbitrage model",
  appSrc.includes("plus eighty-four fully") && appSrc.includes("CLMM single-sided zap-in\n   planner from token B, a CLMM single-sided zap-out\n   planner to token B, a single-sided zap-in planner\n   from token B, a single-sided zap-out planner\n   to token B, a fee compounding calculator, a\n   loss-versus-rebalancing round-trip calculator, a\n   pool seeding / initial-liquidity planner, a CLMM range\n   probability calculator, a weighted-pool swap model, a\n   CLMM range-order (limit-order) planner, a stableswap\n   swap model, a stableswap exact-out swap model, a\n   weighted-pool impermanent-loss calculator, a\n   stableswap depeg-loss calculator, a weighted-pool\n   arbitrage model, a weighted-pool exact-out\n   swap model, a weighted-pool price-impact\n   sizer, a stableswap arbitrage model, a\n   stableswap price-impact sizer, a curve\n   comparison model, a weighted-pool net\n   return calculator, a stableswap net\n   return calculator, a weighted-pool\n   required-volume planner, a stableswap\n   required-volume planner, a weighted-pool\n   break-even days calculator, a stableswap\n   break-even days calculator, a curve\n   comparison exact-out model, a weighted-pool\n   IL tolerance band, a stableswap IL\n   tolerance band, a CLMM arbitrage model, a CLMM\n   price-impact sizer, a CLMM two-range arbitrage\n   model, a CLMM three-range arbitrage model, a CLMM\n   two-range price-impact sizer, a CLMM\n   three-range price-impact sizer, a CLMM\n   four-range swap model, and a CLMM four-range\n   arbitrage model.\n   These are educational MODELS"));

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

/* ---------- 54 · Pool seeding / initial-liquidity planner ---------- */
const seed1 = app.poolSeedPlan("100", "100", "");
check("SEED balanced seed is not null", seed1 !== null);
near("SEED balanced spot", seed1.spotPrice, 1, 1e-12);
near("SEED balanced k", seed1.k, 10000, 1e-9);
check("SEED balanced LP minted exactly 100", seed1.lpMinted === "100" && seed1.lpMintedNum === 100);
near("SEED balanced total value in B", seed1.totalValueInB, 200, 1e-12);
near("SEED balanced per-LP A", seed1.perLpA, 1, 1e-12);
near("SEED balanced per-LP B", seed1.perLpB, 1, 1e-12);
check("SEED no reference leaves the gap fields null", seed1.referencePrice === null && seed1.spotGapPct === null && seed1.refDirection === null);
const seed2 = app.poolSeedPlan("100", "400", "");
near("SEED 100/400 spot", seed2.spotPrice, 4, 1e-12);
near("SEED 100/400 k", seed2.k, 40000, 1e-9);
check("SEED 100/400 LP minted exactly 200", seed2.lpMinted === "200");
near("SEED 100/400 total value in B", seed2.totalValueInB, 800, 1e-12);
near("SEED 100/400 per-LP A", seed2.perLpA, 0.5, 1e-12);
near("SEED 100/400 per-LP B", seed2.perLpB, 2, 1e-12);
const seed3 = app.poolSeedPlan("1000", "250");
near("SEED 1000/250 spot", seed3.spotPrice, 0.25, 1e-12);
check("SEED 1000/250 LP minted exactly 500", seed3.lpMinted === "500");
near("SEED 1000/250 per-LP A", seed3.perLpA, 2, 1e-12);
near("SEED 1000/250 per-LP B", seed3.perLpB, 0.5, 1e-12);
const seedNs = app.poolSeedPlan("100", "300", "");
check("SEED non-square mint floors at 9 dp", seedNs.lpMinted === "173.205080756");
near("SEED non-square mint within one scaled unit of sqrt(30000)", seedNs.lpMintedNum, Math.sqrt(30000), 1e-9);
check("SEED dust seed mints one scaled unit", app.poolSeedPlan("0.000000001", "0.000000002", "").lpMinted === "0.000000001");
check("SEED 1e12 square mints exactly", app.poolSeedPlan("1000000000000", "1000000000000", "").lpMinted === "1000000000000");
/* reference-price gap */
const seedBelow = app.poolSeedPlan("100", "100", "1.25");
near("SEED seed below reference gap", seedBelow.spotGapPct, -20, 1e-9);
check("SEED seed below reference direction", seedBelow.refDirection === "below" && seedBelow.referencePrice === 1.25);
const seedAligned = app.poolSeedPlan("100", "400", "4");
check("SEED aligned reference", seedAligned.refDirection === "aligned" && seedAligned.spotGapPct === 0);
/* the direction call carries a 1e-12 relative tolerance: a seed whose
   ratio IS the reference can land one float ulp off it (0.1/0.3 vs 3,
   0.07/0.49 vs 7) and must read aligned, not mispriced; a real gap —
   even 1e-6 relative — must still classify */
check("SEED float-noise-aligned seed reads aligned (0.1/0.3 vs 3)", app.poolSeedPlan("0.1", "0.3", "3").refDirection === "aligned");
check("SEED float-noise-aligned seed reads aligned (0.07/0.49 vs 7)", app.poolSeedPlan("0.07", "0.49", "7").refDirection === "aligned");
check("SEED float-noise-aligned seed reads aligned (0.3/0.1 vs 1/3)", app.poolSeedPlan("0.3", "0.1", "0.3333333333333333").refDirection === "aligned");
check("SEED 1e-6-relative gap still classifies below", app.poolSeedPlan("100", "400", "4.000004").refDirection === "below");
const seedAbove = app.poolSeedPlan("100", "400", "2");
near("SEED seed above reference gap", seedAbove.spotGapPct, 100, 1e-9);
check("SEED seed above reference direction", seedAbove.refDirection === "above");
/* composition: tool 18 redeems a full holding of the minted supply for
   exactly the seed; half the supply redeems half the seed */
const seedRedeem = app.lpTokenValue("100", "400", seed2.lpMinted, seed2.lpMinted);
check("SEED full mint redeems the seed exactly (tool 18)", seedRedeem !== null && seedRedeem.amountA === "100" && seedRedeem.amountB === "400" && seedRedeem.sharePct === 100);
const seedHalf = app.lpTokenValue("100", "400", seed2.lpMinted, "100");
check("SEED half the mint redeems half the seed (tool 18)", seedHalf !== null && seedHalf.amountA === "50" && seedHalf.amountB === "200" && seedHalf.sharePct === 50);
/* composition: later deposits follow the seeded ratio (tool 5) and the
   seeded reserves trade through tool 1 */
check("SEED later deposits follow the seeded ratio (tool 5)", app.depositPlan("100", "400", "10").requiredB === "40");
check("SEED seeded reserves trade (tool 1)", app.cpSwap("100", "400", "10", 25).out === "36.280972948");
/* sweep: mint is the floored geometric mean, each side is worth the
   same at the seed price, per-LP amounts rebuild the seed */
for (const [sa, sb] of [["10", "90"], ["123.456", "789.012"], ["5", "5"], ["999999", "0.5"], ["0.001", "250000"]]) {
  const s = app.poolSeedPlan(sa, sb, "");
  const A = Number(sa), B = Number(sb), g = Math.sqrt(A * B);
  check("SEED sweep " + sa + "/" + sb,
    s !== null && s.lpMintedNum <= g + 1e-12 && g - s.lpMintedNum < 1.1e-9 &&
    Math.abs(s.spotPrice - B / A) <= 1e-12 * Math.max(1, B / A) &&
    Math.abs(s.totalValueInB - 2 * B) <= 1e-9 * Math.max(1, B) &&
    Math.abs(s.perLpA * s.lpMintedNum - A) <= 1e-6 * A &&
    Math.abs(s.perLpB * s.lpMintedNum - B) <= 1e-6 * B);
}
/* rejections */
check("SEED rejects blank / junk", app.poolSeedPlan("", "100", "") === null && app.poolSeedPlan("100", "", "") === null && app.poolSeedPlan("abc", "100", "") === null);
check("SEED rejects non-positive amounts", app.poolSeedPlan("0", "100", "") === null && app.poolSeedPlan("100", "-5", "") === null);
check("SEED rejects more than 9 dp", app.poolSeedPlan("0.0000000001", "100", "") === null);
check("SEED rejects a bad reference price", app.poolSeedPlan("100", "100", "0") === null && app.poolSeedPlan("100", "100", "-1") === null && app.poolSeedPlan("100", "100", "xyz") === null);
check("SEED rejects overflowing inputs", app.poolSeedPlan("1" + "0".repeat(400), "100", "") === null);
check("all seed controls labelled", ["seed-a", "seed-b", "seed-ref", "seed-price", "seed-lp"].every(id => html.includes(`for="${id}"`)));
check("seed tool present in index.html", html.includes('id="seed-calc"') && html.includes('id="seed-result"'));
check("seed honesty: amounts-are-the-price and lock labels", html.includes("the amounts are the price") && html.includes("minimum-liquidity locks or burns are not modelled") && html.includes("not live pool data"));
check("guide covers pool seeding", guide.includes("Seeding a pool sets its price"));
check("README lists tool 54", readme.includes("54. **Pool seeding / initial-liquidity planner**"));

/* ---------- 55 · CLMM range probability calculator ---------- */
/* normalCdf pins against the standard normal table (the A&S 7.1.26 erf
   approximation is good to ~1.5e-7, so tolerances sit at 1e-6) */
near("PROB cdf(0)", app.normalCdf(0), 0.5, 1e-6);
near("PROB cdf(1)", app.normalCdf(1), 0.8413447460685429, 1e-6);
near("PROB cdf(-1)", app.normalCdf(-1), 0.15865525393145707, 1e-6);
near("PROB cdf(2)", app.normalCdf(2), 0.9772498680518208, 1e-6);
near("PROB cdf(-2.5)", app.normalCdf(-2.5), 0.006209665325776159, 1e-6);
check("PROB cdf symmetry", Math.abs(app.normalCdf(1.3) + app.normalCdf(-1.3) - 1) < 1e-12);
/* headline: log-symmetric 0.8-1.25 at P1, 5%/day, 20 days */
const prob1 = app.clmmRangeProbability("1", "0.8", "1.25", "5", "20");
check("PROB headline is not null", prob1 !== null && prob1.deterministic === false);
near("PROB headline sigma", prob1.sigma, 0.223606797749979, 1e-12);
near("PROB headline z upper", prob1.zUpper, 0.997928298958571, 1e-9);
near("PROB headline z lower", prob1.zLower, -0.997928298958571, 1e-9);
near("PROB headline prob in", prob1.probInPct, 68.16858534113275, 1e-4);
near("PROB headline prob above", prob1.probAbovePct, 15.915707329433616, 1e-4);
near("PROB headline prob below", prob1.probBelowPct, 15.915707329433626, 1e-4);
check("PROB headline log-symmetric range gives equal tails", Math.abs(prob1.probAbovePct - prob1.probBelowPct) < 1e-9);
near("PROB headline one-sigma band lower", prob1.sigmaBandLower, 0.7996294886770354, 1e-9);
near("PROB headline one-sigma band upper", prob1.sigmaBandUpper, 1.2505791921887124, 1e-9);
near("PROB headline probabilities sum to 100", prob1.probInPct + prob1.probAbovePct + prob1.probBelowPct, 100, 1e-9);
/* scale invariance: the same relative geometry at P100 is the same answer */
const prob100 = app.clmmRangeProbability("100", "80", "125", "5", "20");
near("PROB scale-invariant prob in", prob100.probInPct, prob1.probInPct, 1e-9);
near("PROB scale-invariant band lower", prob100.sigmaBandLower, 79.96294886770355, 1e-7);
/* the z = +/-1 case: days chosen so sigma = ln(1.25) exactly */
const probZ1 = app.clmmRangeProbability("1", "0.8", "1.25", "5", "19.917217797246945");
near("PROB z=1 prob in is Phi(1)-Phi(-1)", probZ1.probInPct, 68.26894921370859, 1e-4);
near("PROB z=1 band edges are the range edges", probZ1.sigmaBandUpper, 1.25, 1e-9);
/* one day barely moves: 99.9992% ends inside */
near("PROB one-day prob in", app.clmmRangeProbability("1", "0.8", "1.25", "5", "1").probInPct, 99.99919060045053, 1e-4);
/* extreme vol over a year still prices, tails symmetric on a log-symmetric range */
const probExtreme = app.clmmRangeProbability("1", "0.8", "1.25", "100", "365");
near("PROB extreme-vol prob in", probExtreme.probInPct, 0.9319026599352576, 1e-4);
check("PROB extreme-vol tails equal", Math.abs(probExtreme.probAbovePct - probExtreme.probBelowPct) < 1e-9);
/* starting outside the range is priced, not rejected */
const probOut = app.clmmRangeProbability("2", "0.8", "1.25", "5", "20");
near("PROB outside-start prob in", probOut.probInPct, 1.775920606381215, 1e-4);
near("PROB outside-start prob above", probOut.probAbovePct, 98.22199257878714, 1e-4);
near("PROB outside-start prob below", probOut.probBelowPct, 0.002086814831653294, 1e-5);
/* a narrow range at the same vol is mostly missed */
near("PROB narrow-range prob in", app.clmmRangeProbability("1", "0.99", "1.01", "5", "20").probInPct, 3.5671908823687035, 1e-4);
/* zero volatility is the deterministic degenerate case */
const probZeroIn = app.clmmRangeProbability("1", "0.8", "1.25", "0", "20");
check("PROB zero vol inside is certain", probZeroIn.deterministic === true && probZeroIn.probInPct === 100 && probZeroIn.probAbovePct === 0 && probZeroIn.probBelowPct === 0 && probZeroIn.zLower === null);
check("PROB zero vol band collapses to the price", probZeroIn.sigmaBandLower === 1 && probZeroIn.sigmaBandUpper === 1);
const probZeroAbove = app.clmmRangeProbability("2", "0.8", "1.25", "0", "20");
check("PROB zero vol above range is certain above", probZeroAbove.probAbovePct === 100 && probZeroAbove.probInPct === 0);
const probZeroBelow = app.clmmRangeProbability("0.5", "0.8", "1.25", "0", "20");
check("PROB zero vol below range is certain below", probZeroBelow.probBelowPct === 100 && probZeroBelow.probInPct === 0);
/* ordering sweep: wider range helps, more days or more vol hurts, and
   the three probabilities always partition 100 */
const probBase = app.clmmRangeProbability("1", "0.8", "1.25", "5", "20").probInPct;
check("PROB wider range ends inside more often", app.clmmRangeProbability("1", "0.5", "2", "5", "20").probInPct > probBase);
check("PROB narrower range ends inside less often", app.clmmRangeProbability("1", "0.9", "1.111111111", "5", "20").probInPct < probBase);
check("PROB more days ends inside less often", app.clmmRangeProbability("1", "0.8", "1.25", "5", "90").probInPct < probBase);
check("PROB more vol ends inside less often", app.clmmRangeProbability("1", "0.8", "1.25", "10", "20").probInPct < probBase);
for (const [cp, cl, cu, cv, cd] of [["1", "0.8", "1.25", "5", "20"], ["3.7", "2.5", "5.5", "8.25", "45"], ["0.02", "0.01", "0.04", "12", "7"], ["150", "100", "200", "3.5", "365"], ["1", "0.95", "1.05", "1", "3"]]) {
  const s = app.clmmRangeProbability(cp, cl, cu, cv, cd);
  check("PROB sweep partitions 100 " + cp + "/" + cl + "-" + cu + "/" + cv + "/" + cd,
    s !== null && Math.abs(s.probInPct + s.probAbovePct + s.probBelowPct - 100) < 1e-9 &&
    s.probInPct >= 0 && s.probInPct <= 100 && s.sigmaBandLower < Number(cp) && s.sigmaBandUpper > Number(cp) &&
    Math.abs(s.sigmaBandLower * s.sigmaBandUpper - Number(cp) * Number(cp)) < 1e-9 * Number(cp) * Number(cp));
}
/* a second log-symmetric range also splits its tails evenly */
const probSym2 = app.clmmRangeProbability("1", "0.5", "2", "7.5", "30");
check("PROB 0.5-2 tails equal", Math.abs(probSym2.probAbovePct - probSym2.probBelowPct) < 1e-9);
/* rejections */
check("PROB rejects blank fields", app.clmmRangeProbability("", "0.8", "1.25", "5", "20") === null && app.clmmRangeProbability("1", "0.8", "1.25", "", "20") === null && app.clmmRangeProbability("1", "0.8", "1.25", "5", "") === null);
check("PROB rejects junk", app.clmmRangeProbability("abc", "0.8", "1.25", "5", "20") === null && app.clmmRangeProbability("1", "0.8", "1.25", "high", "20") === null);
check("PROB rejects non-positive prices", app.clmmRangeProbability("0", "0.8", "1.25", "5", "20") === null && app.clmmRangeProbability("1", "-0.8", "1.25", "5", "20") === null);
check("PROB rejects an inverted or empty range", app.clmmRangeProbability("1", "1.25", "0.8", "5", "20") === null && app.clmmRangeProbability("1", "1", "1", "5", "20") === null);
check("PROB rejects negative vol and non-positive days", app.clmmRangeProbability("1", "0.8", "1.25", "-5", "20") === null && app.clmmRangeProbability("1", "0.8", "1.25", "5", "0") === null && app.clmmRangeProbability("1", "0.8", "1.25", "5", "-3") === null);
check("PROB rejects vol / days above the caps", app.clmmRangeProbability("1", "0.8", "1.25", "10001", "20") === null && app.clmmRangeProbability("1", "0.8", "1.25", "5", "36501") === null);
check("PROB rejects inputs whose sigma band overflows", app.clmmRangeProbability("1", "0.5", "2", "10000", "36500") === null);
check("all prob controls labelled", ["prob-p", "prob-lo", "prob-hi", "prob-vol", "prob-days", "prob-in", "prob-band"].every(id => html.includes(`for="${id}"`)));
check("prob tool present in index.html", html.includes('id="prob-calc"') && html.includes('id="prob-result"'));
check("prob honesty: ending-is-not-staying and not-live labels", html.includes("ending inside the range is not staying inside it") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers range probability", guide.includes("Ending inside the range is not staying inside it"));
check("README lists tool 55", readme.includes("55. **CLMM range probability calculator**"));

/* ---------- 56 · Weighted-pool swap model (WPOOL) ---------- */
/* headline: 80/20 pool, equal reserves, 100 in at 25 bps */
const wq1 = app.weightedSwap("1000", "1000", "80", "100", 25);
check("WPOOL headline is not null", wq1 !== null);
near("WPOOL headline out", wq1.out, 316.3652703552382, 1e-9);
near("WPOOL headline spot carries the weights", wq1.spotPrice, 4, 1e-12);
near("WPOOL headline exponent", wq1.exponent, 4, 1e-12);
near("WPOOL headline impact", wq1.priceImpactPct, 20.908682411190483, 1e-9);
near("WPOOL headline net in", wq1.netIn, 99.75, 1e-12);
check("WPOOL weight split sums to 100", wq1.weightInPct + wq1.weightOutPct === 100);
/* zero-fee closed forms at both weight extremes */
near("WPOOL 80/20 zero-fee out is the closed form", app.weightedSwap("1000", "1000", "80", "100", 0).out, 1000 * (1 - Math.pow(1000 / 1100, 4)), 1e-9);
near("WPOOL 20/80 zero-fee out", app.weightedSwap("1000", "1000", "20", "100", 0).out, 23.54591032368947, 1e-9);
near("WPOOL 20/80 spot", app.weightedSwap("1000", "1000", "20", "100", 0).spotPrice, 0.25, 1e-12);
/* the 50/50 case is tool 1 exactly (to its 9dp BigInt flooring) */
for (const [ri, ro, ai, f] of [["1000", "1000", "100", 25], ["1000", "4000", "50", 100], ["250", "1000", "10", 0], ["123456", "654321", "999", 30]]) {
  const w = app.weightedSwap(ri, ro, "50", ai, f);
  const c = app.cpSwap(ri, ro, ai, f);
  check("WPOOL 50/50 equals cpSwap " + ri + "/" + ro + "/" + ai + "/" + f, w !== null && c !== null && Math.abs(w.out - Number(c.out)) <= 1e-6 && Math.abs(w.spotPrice - c.spotPrice) < 1e-12);
}
/* invariant sweep: reserveIn^wIn x reserveOut^wOut is preserved on the
   post-trade (net-of-fee) reserves, and out stays inside (0, reserveOut) */
for (const [ri, ro, w, ai, f] of [["1000", "1000", "80", "100", 25], ["500", "2000", "30", "75", 50], ["1000", "1000", "50", "100", 25], ["1234", "567", "65", "33", 10], ["2000", "250", "15", "500", 100], ["750", "750", "92", "5", 0]]) {
  const r = app.weightedSwap(ri, ro, w, ai, f);
  const v0 = Math.pow(Number(ri), Number(w) / 100) * Math.pow(Number(ro), 1 - Number(w) / 100);
  const v1 = Math.pow(r.newReserveIn, Number(w) / 100) * Math.pow(r.newReserveOut, 1 - Number(w) / 100);
  check("WPOOL invariant preserved " + ri + "/" + ro + "/w" + w, Math.abs((v1 - v0) / v0) < 1e-12 && r.out > 0 && r.out < Number(ro));
}
/* ordering: a heavier input weight pays more out and impacts more */
const wq20 = app.weightedSwap("1000", "1000", "20", "100", 0);
const wq50 = app.weightedSwap("1000", "1000", "50", "100", 0);
const wq80 = app.weightedSwap("1000", "1000", "80", "100", 0);
check("WPOOL heavier input weight pays more out", wq20.out < wq50.out && wq50.out < wq80.out);
check("WPOOL heavier input weight impacts more", wq20.priceImpactPct < wq50.priceImpactPct && wq50.priceImpactPct < wq80.priceImpactPct);
check("WPOOL spot rises with the input weight", wq20.spotPrice < wq50.spotPrice && wq50.spotPrice < wq80.spotPrice);
/* dust trade against a deep pool still settles */
near("WPOOL dust out", app.weightedSwap("1000", "1000", "80", "0.001", 25).out, 0.003989990050246028, 1e-12);
/* cancellation pin: a dust trade at a 9999 bps fee leaves out at ~4e-10 of
   the reserve, where the direct 1 - pow(...) form returned
   4.000000330961484e-07 (8.3e-8 relative off). The cancellation-free
   expm1/log1p evaluation matches the 50-digit value below. */
near("WPOOL dust at 9999 bps fee is cancellation-free", app.weightedSwap("1000", "1000", "80", "0.001", 9999).out, 3.9999999989995594e-7, 1e-15);
/* rejections */
check("WPOOL rejects a saturating trade instead of quoting a full drain", app.weightedSwap("1", "1", "80", "1000000000", 0) === null);
check("WPOOL rejects weights at the edges", app.weightedSwap("1000", "1000", "0", "100", 25) === null && app.weightedSwap("1000", "1000", "100", "100", 25) === null);
check("WPOOL rejects blank and junk", app.weightedSwap("1000", "1000", "80", "", 25) === null && app.weightedSwap("abc", "1000", "80", "100", 25) === null && app.weightedSwap("1000", "1000", "", "100", 25) === null);
check("WPOOL rejects non-positive amounts", app.weightedSwap("0", "1000", "80", "100", 25) === null && app.weightedSwap("1000", "1000", "80", "-5", 25) === null);
check("WPOOL rejects bad fees", app.weightedSwap("1000", "1000", "80", "100", 10000) === null && app.weightedSwap("1000", "1000", "80", "100", -1) === null && app.weightedSwap("1000", "1000", "80", "100", "25.5") === null);
check("all wswap controls labelled", ["wswap-rin", "wswap-rout", "wswap-win", "wswap-ain", "wswap-fee", "wswap-out", "wswap-spot"].every(id => html.includes(`for="${id}"`)));
check("wswap tool present in index.html", html.includes('id="wswap-calc"') && html.includes('id="wswap-result"'));
check("wswap honesty: 50/50-is-Raydium and not-live labels", html.includes("Raydium's own constant-product pools are that 50/50 case") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers weighted pools", guide.includes("The weight is part of the price in a weighted pool"));
check("README lists tool 56", readme.includes("56. **Weighted-pool swap model**"));

/* ---------- 57 · CLMM range-order (limit-order) planner (RORD) ---------- */
/* headline sell A: 100 A, current 1, range 1.21-1.44, checked at the top */
const ro1 = app.clmmRangeOrder("a", "100", "1", "1.21", "1.44", "1.44");
check("RORD headline is not null", ro1 !== null);
near("RORD headline liquidity", ro1.liquidity, 1320, 1e-9);
near("RORD headline full fill pays 132 B", ro1.fullOut, 132, 1e-9);
near("RORD headline average is the geometric mean", ro1.avgPriceFull, 1.32, 1e-12);
check("RORD headline status filled at the upper edge", ro1.status === "filled");
near("RORD headline sold in full", ro1.sold, 100, 1e-9);
near("RORD headline received equals the full fill", ro1.received, 132, 1e-9);
near("RORD headline executed 100%", ro1.executedPct, 100, 1e-12);
/* partial fill to 1.3225 (sqrt 1.15): sold 52.1739, received 66, avg sqrt(1.21 x 1.3225) = 1.265 */
const ro2 = app.clmmRangeOrder("a", "100", "1", "1.21", "1.44", "1.3225");
check("RORD partial status", ro2.status === "partial");
near("RORD partial sold", ro2.sold, 52.17391304347825, 1e-9);
near("RORD partial received", ro2.received, 66, 1e-9);
near("RORD partial average is sqrt(edge x check)", ro2.avgPriceAtCheck, Math.sqrt(1.21 * 1.3225), 1e-12);
near("RORD partial executed %", ro2.executedPct, 52.17391304347825, 1e-9);
near("RORD partial remaining", ro2.remaining, 100 - 52.17391304347825, 1e-9);
/* not started: check price still below the range */
const ro3 = app.clmmRangeOrder("a", "100", "1", "1.21", "1.44", "1.1");
check("RORD not-started status", ro3.status === "not-started" && ro3.received === 0 && ro3.avgPriceAtCheck === null);
near("RORD not-started sells nothing", ro3.sold, 0, 1e-9);
/* sell B mirror: 132 B, current 1, range 0.64-0.81, checked at the bottom */
const ro4 = app.clmmRangeOrder("b", "132", "1", "0.64", "0.81", "0.64");
near("RORD sell-B liquidity mirrors sell-A", ro4.liquidity, 1320, 1e-9);
near("RORD sell-B full fill pays 183.3333 A", ro4.fullOut, 183.33333333333334, 1e-9);
near("RORD sell-B average is the geometric mean in B per A", ro4.avgPriceFull, 0.72, 1e-12);
check("RORD sell-B status filled at the lower edge", ro4.status === "filled");
/* sell-B partial to 0.7225 (sqrt 0.85): sold 66 (50%), received 86.2745, avg sqrt(0.81 x 0.7225) = 0.765 */
const ro5 = app.clmmRangeOrder("b", "132", "1", "0.64", "0.81", "0.7225");
check("RORD sell-B partial status", ro5.status === "partial");
near("RORD sell-B partial sold", ro5.sold, 66, 1e-9);
near("RORD sell-B partial received", ro5.received, 86.27450980392157, 1e-9);
near("RORD sell-B partial average is sqrt(edge x check)", ro5.avgPriceAtCheck, Math.sqrt(0.81 * 0.7225), 1e-12);
near("RORD sell-B partial executed 50%", ro5.executedPct, 50, 1e-9);
/* composition: holdings at the check price are tool 9's own amounts at this L */
for (const [side, amt, cur, lo, hi, chk] of [["a", "100", "1", "1.21", "1.44", "1.3225"], ["a", "250", "2", "2.42", "2.88", "2.7"], ["b", "132", "1", "0.64", "0.81", "0.7225"], ["b", "500", "4", "2.56", "3.24", "3"], ["a", "77.7", "0.5", "0.605", "0.72", "0.66"], ["b", "88.8", "10", "6.4", "8.1", "7.5"]]) {
  const r = app.clmmRangeOrder(side, amt, cur, lo, hi, chk);
  const p = app.clmmPositionAtPrice(String(r.liquidity), lo, hi, chk);
  const soldT = side === "a" ? Number(amt) - p.amountA : Number(amt) - p.amountB;
  const recvT = side === "a" ? p.amountB : p.amountA;
  check("RORD holdings are tool 9 verbatim " + side + "/" + amt + "/" + lo + "-" + hi + "@" + chk,
    Math.abs(r.sold - soldT) < 1e-9 && Math.abs(r.received - recvT) < 1e-9 && Math.abs(r.remaining - (side === "a" ? p.amountA : p.amountB)) < 1e-9);
  check("RORD full average is sqrt(lower x upper) " + side + "/" + lo + "-" + hi,
    Math.abs(r.avgPriceFull - Math.sqrt(Number(lo) * Number(hi))) < 1e-9);
  check("RORD partial average is sqrt(edge x check) " + side + "/" + chk,
    r.avgPriceAtCheck !== null && Math.abs(r.avgPriceAtCheck - Math.sqrt((side === "a" ? Number(lo) : Number(hi)) * Number(chk))) < 1e-9);
  check("RORD sold + remaining conserves the deposit " + side + "/" + amt,
    Math.abs(r.sold + r.remaining - Number(amt)) < 1e-9 && r.executedPct >= 0 && r.executedPct <= 100);
}
/* a check beyond the far edge fills in full, at the full-fill average */
const roBeyond = app.clmmRangeOrder("a", "100", "1", "1.21", "1.44", "3");
check("RORD beyond the edge is filled", roBeyond.status === "filled" && Math.abs(roBeyond.received - roBeyond.fullOut) < 1e-9 && Math.abs(roBeyond.avgPriceAtCheck - roBeyond.avgPriceFull) < 1e-9);
/* the range may touch the current price (position starts exactly single-sided) */
check("RORD range touching the current price is allowed", app.clmmRangeOrder("a", "100", "1.21", "1.21", "1.44", "1.3") !== null && app.clmmRangeOrder("b", "132", "0.81", "0.64", "0.81", "0.7") !== null);
/* rejections */
check("RORD rejects a straddling range for sell A", app.clmmRangeOrder("a", "100", "1", "0.9", "1.44", "1.3") === null);
check("RORD rejects a straddling range for sell B", app.clmmRangeOrder("b", "100", "1", "0.64", "1.1", "0.8") === null);
check("RORD rejects a range on the wrong side", app.clmmRangeOrder("a", "100", "2", "1.21", "1.44", "1.3") === null && app.clmmRangeOrder("b", "100", "0.5", "0.64", "0.81", "0.7") === null);
check("RORD rejects an inverted range and a bad side", app.clmmRangeOrder("a", "100", "1", "1.44", "1.21", "1.3") === null && app.clmmRangeOrder("x", "100", "1", "1.21", "1.44", "1.3") === null);
check("RORD rejects blank and junk", app.clmmRangeOrder("a", "", "1", "1.21", "1.44", "1.3") === null && app.clmmRangeOrder("a", "100", "1", "1.21", "1.44", "") === null && app.clmmRangeOrder("a", "abc", "1", "1.21", "1.44", "1.3") === null);
check("RORD rejects non-positive inputs", app.clmmRangeOrder("a", "0", "1", "1.21", "1.44", "1.3") === null && app.clmmRangeOrder("a", "100", "1", "1.21", "1.44", "-1") === null && app.clmmRangeOrder("a", "100", "0", "1.21", "1.44", "1.3") === null);
check("all rord controls labelled", ["rord-side", "rord-amt", "rord-cur", "rord-lo", "rord-hi", "rord-chk", "rord-full", "rord-avg"].every(id => html.includes(`for="${id}"`)));
check("rord tool present in index.html", html.includes('id="rord-calc"') && html.includes('id="rord-result"'));
check("rord honesty: geometric-mean, crossing and not-live labels", html.includes("a range straddling it starts two-sided") && html.includes("Nothing fills unless the price actually crosses") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers range orders", guide.includes("A single-sided CLMM position outside the price is a limit order"));
check("README lists tool 57", readme.includes("57. **CLMM range-order (limit-order) planner**"));

/* ---------- 58 · Stableswap swap model (SSWAP) ---------- */
/* headline: balanced 1000/1000, A=100, 100 in at 25 bps */
const ss1 = app.stableSwap("1000", "1000", "100", "100", 25);
check("SSWAP headline is not null", ss1 !== null);
near("SSWAP headline out", ss1.out, 99.65061433806079, 1e-9);
near("SSWAP headline spot is exactly par on a balanced pool", ss1.spotPrice, 1, 1e-12);
near("SSWAP headline invariant D is the reserve sum", ss1.invariantD, 2000, 1e-9);
near("SSWAP headline net in", ss1.netIn, 99.75, 1e-12);
near("SSWAP headline impact", ss1.priceImpactPct, 0.3493856619392055, 1e-9);
/* zero fee on the same pool */
near("SSWAP zero-fee out", app.stableSwap("1000", "1000", "100", "100", 0).out, 99.90011086475852, 1e-9);
near("SSWAP zero-fee impact", app.stableSwap("1000", "1000", "100", "100", 0).priceImpactPct, 0.09988913524148213, 1e-9);
/* a balanced pool's D is its reserve sum at any amplification, and its spot is par */
for (const a of ["1", "10", "100", "1000", "5000"]) {
  const r = app.stableSwap("1000", "1000", a, "100", 0);
  check("SSWAP balanced D and spot at amp " + a, Math.abs(r.invariantD - 2000) < 1e-9 && Math.abs(r.spotPrice - 1) < 1e-12);
}
/* amplification ordering: higher A pays more, always above tool 1 and below par */
const ssAmps = ["1", "10", "100", "1000", "5000"].map(a => app.stableSwap("1000", "1000", a, "100", 0).out);
near("SSWAP amp 1 out", ssAmps[0], 95.2272997771098, 1e-9);
near("SSWAP amp 5000 out", ssAmps[4], 99.99798025134567, 1e-9);
check("SSWAP out rises with amplification, between CP and par",
  ssAmps.every((v, i) => i === 0 || v > ssAmps[i - 1]) && ssAmps[0] > Number(app.cpSwap("1000", "1000", "100", 0).out) && ssAmps[4] < 100);
/* the invariant equation itself holds on both sides of the trade, at the same D */
for (const [ri, ro, a, ai, f] of [["1000", "1000", "100", "100", 0], ["1000", "500", "100", "100", 0], ["10000", "2000", "85", "500", 30], ["1234", "567", "200", "123", 25], ["777", "333", "42", "77", 10], ["5000", "5000", "7", "250", 50]]) {
  const r = app.stableSwap(ri, ro, a, ai, f);
  const Ann = 2 * Number(a), D = r.invariantD;
  const inv = (x, y) => Ann * (x + y) + D - (Ann * D + Math.pow(D, 3) / (4 * x * y));
  check("SSWAP invariant holds pre-trade " + ri + "/" + ro + "/A" + a,
    Math.abs(inv(Number(ri), Number(ro))) / (Ann * D) < 1e-9);
  check("SSWAP invariant preserved post-trade " + ri + "/" + ro + "/A" + a,
    Math.abs(inv(r.newReserveIn, r.newReserveOut)) / (Ann * D) < 1e-9 && r.out > 0 && r.out < Number(ro));
}
/* a lopsided pool prices off par: short of the output token, spot below 1 */
const ssU = app.stableSwap("1000", "500", "100", "100", 0);
near("SSWAP lopsided spot", ssU.spotPrice, 0.9917176313020062, 1e-9);
near("SSWAP lopsided out", ssU.out, 98.87832443950845, 1e-9);
near("SSWAP lopsided D", ssU.invariantD, 1499.0734926199473, 1e-9);
check("SSWAP trading into the short side pays above par",
  app.stableSwap("500", "1000", "100", "100", 0).out > 100 && app.stableSwap("500", "1000", "100", "100", 0).spotPrice > 1);
near("SSWAP short-side out", app.stableSwap("500", "1000", "100", "100", 0).out, 100.6184800873408, 1e-9);
/* asym case with a fee */
const ssA = app.stableSwap("10000", "2000", "85", "500", 30);
near("SSWAP asym out", ssA.out, 467.98702025853595, 1e-9);
near("SSWAP asym spot", ssA.spotPrice, 0.9528284929981158, 1e-9);
near("SSWAP asym impact", ssA.priceImpactPct, 1.7688862796294669, 1e-9);
/* dust trade still prices */
near("SSWAP dust out", app.stableSwap("1000", "1000", "100", "0.000001", 0).out, 9.99999883788405e-7, 1e-13);
/* dust-POOL accuracy: Newton convergence is relative-only — an absolute
   1e-12 step floor once stopped the solvers early at reserves ~1e-6 and
   left this output 3.1e-4 relative off the 50-digit invariant solve */
near("SSWAP dust-pool out stays accurate at micro reserves", app.stableSwap("0.0000022759418488544604", "1.005149823295138e-7", "1332.1493795556776", "2.5916962339471478e-14", 0).out, 2.46377281385e-14, 1e-19);
/* rejections */
check("SSWAP rejects a saturating trade instead of quoting a full drain", app.stableSwap("1000", "1000", "100", "1000000000000", 0) === null);
check("SSWAP rejects non-positive amplification", app.stableSwap("1000", "1000", "0", "100", 25) === null && app.stableSwap("1000", "1000", "-5", "100", 25) === null);
check("SSWAP rejects blank and junk", app.stableSwap("1000", "1000", "", "100", 25) === null && app.stableSwap("abc", "1000", "100", "100", 25) === null && app.stableSwap("1000", "1000", "100", "", 25) === null);
check("SSWAP rejects non-positive amounts", app.stableSwap("0", "1000", "100", "100", 25) === null && app.stableSwap("1000", "1000", "100", "-5", 25) === null);
check("SSWAP rejects bad fees", app.stableSwap("1000", "1000", "100", "100", 10000) === null && app.stableSwap("1000", "1000", "100", "100", -1) === null && app.stableSwap("1000", "1000", "100", "100", "25.5") === null);
check("all sswap controls labelled", ["sswap-rin", "sswap-rout", "sswap-amp", "sswap-ain", "sswap-fee", "sswap-out", "sswap-spot"].every(id => html.includes(`for="${id}"`)));
check("sswap tool present in index.html", html.includes('id="sswap-calc"') && html.includes('id="sswap-result"'));
check("sswap honesty: depeg danger and not-live labels", html.includes("near-par pricing assumes both tokens really are worth the same") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers stableswap", guide.includes("Pegged pairs trade on a blended curve"));
check("README lists tool 58", readme.includes("58. **Stableswap swap model**"));

/* ---------- 59 · Stableswap exact-out swap model (SSXO) ---------- */
/* headline: tool 58's own outputs inverted — its zero-fee headline out
   needs exactly its 100 in back, and its 25 bps headline out needs
   exactly 100 gross in (99.75 net) */
const sx1 = app.stableSwapExactOut("1000", "1000", "100", "99.90011086475852", 0);
check("SSXO headline is not null", sx1 !== null);
near("SSXO headline amount in inverts tool 58 exactly", sx1.amountIn, 100, 1e-9);
near("SSXO headline net in", sx1.netIn, 100, 1e-9);
near("SSXO headline spot is exactly par on a balanced pool", sx1.spotPrice, 1, 1e-12);
near("SSXO headline impact equals tool 58's", sx1.priceImpactPct, 0.09988913524148213, 1e-9);
near("SSXO headline new reserve out", sx1.newReserveOut, 900.0998891352415, 1e-9);
const sxF = app.stableSwapExactOut("1000", "1000", "100", "99.65061433806079", 25);
near("SSXO fee headline gross in is tool 58's 100", sxF.amountIn, 100, 1e-9);
near("SSXO fee headline net in is the gross minus the fee", sxF.netIn, 99.75, 1e-9);
near("SSXO fee headline impact equals tool 58's", sxF.priceImpactPct, 0.3493856619392055, 1e-9);
/* a round target at a fee tier */
const sxT = app.stableSwapExactOut("1000", "1000", "100", "100", 25);
near("SSXO target 100 at 25 bps amount in", sxT.amountIn, 100.35096849591363, 1e-9);
near("SSXO target 100 at 25 bps net in", sxT.netIn, 100.10009107467386, 1e-9);
/* tool 58's lopsided, short-side, asym and amp-extreme outputs invert to its inputs */
near("SSXO lopsided inverts to 100 in", app.stableSwapExactOut("1000", "500", "100", "98.87832443950845", 0).amountIn, 100, 1e-9);
near("SSXO lopsided spot", app.stableSwapExactOut("1000", "500", "100", "98.87832443950845", 0).spotPrice, 0.9917176313020062, 1e-9);
near("SSXO short-side inverts to 100 in", app.stableSwapExactOut("500", "1000", "100", "100.6184800873408", 0).amountIn, 100, 1e-9);
near("SSXO asym inverts to 500 in", app.stableSwapExactOut("10000", "2000", "85", "467.98702025853595", 30).amountIn, 500, 1e-9);
near("SSXO amp 1 inverts to 100 in", app.stableSwapExactOut("1000", "1000", "1", "95.2272997771098", 0).amountIn, 100, 1e-9);
near("SSXO amp 5000 inverts to 100 in", app.stableSwapExactOut("1000", "1000", "5000", "99.99798025134567", 0).amountIn, 100, 1e-9);
/* round-trip sweep: this tool's amount in, fed into tool 58, returns the
   target; and the invariant equation holds at the post-trade reserves */
for (const [ri, ro, a, tgt, f] of [["1000", "1000", "100", "50", 0], ["1000", "1000", "100", "99.9", 25], ["1000", "500", "100", "98.87832443950845", 0], ["10000", "2000", "85", "467.98702025853595", 30], ["500", "1000", "100", "100.6184800873408", 0], ["1234", "567", "200", "100", 25], ["777", "333", "42", "50", 10], ["5000", "5000", "7", "200", 50], ["1000", "1000", "5000", "99.99", 0], ["1000", "1000", "1", "90", 0]]) {
  const r = app.stableSwapExactOut(ri, ro, a, tgt, f);
  const back = app.stableSwap(ri, ro, a, String(r.amountIn), f);
  check("SSXO round-trips through tool 58 " + ri + "/" + ro + "/A" + a + "/tgt" + tgt,
    Math.abs(back.out - Number(tgt)) / Number(tgt) < 1e-9);
  const Ann = 2 * Number(a), D = r.invariantD;
  const inv = (x, y) => Ann * (x + y) + D - (Ann * D + Math.pow(D, 3) / (4 * x * y));
  check("SSXO invariant preserved post-trade " + ri + "/" + ro + "/A" + a,
    Math.abs(inv(r.newReserveIn, r.newReserveOut)) / (Ann * D) < 1e-9 && r.newReserveOut === Number(ro) - Number(tgt));
  check("SSXO fee identity " + ri + "/" + ro + "/A" + a,
    Math.abs(r.netIn - r.amountIn * (1 - f / 10000)) < 1e-9 * r.amountIn && r.amountIn >= r.netIn);
}
/* the cost explodes as the target approaches the whole reserve */
near("SSXO near-drain target 999 of 1000 amount in", app.stableSwapExactOut("1000", "1000", "100", "999", 0).amountIn, 3309.4706258125425, 1e-9);
check("SSXO near-drain costs far above spot", app.stableSwapExactOut("1000", "1000", "100", "999", 0).priceImpactPct > 69);
/* dust target: the required input is a difference of near-equal reserves,
   so it is pinned at the float noise floor of the reserve scale (~1 ulp),
   not to full precision — the round trip still lands within 1e-6 relative */
const sxDust = app.stableSwapExactOut("1000", "1000", "100", "0.000001", 0);
check("SSXO dust target amount in at the noise floor", sxDust !== null && Math.abs(sxDust.amountIn - 0.000001) < 2e-13);
check("SSXO dust target round-trips within the noise floor",
  Math.abs(app.stableSwap("1000", "1000", "100", String(sxDust.amountIn), 0).out - 0.000001) / 0.000001 < 1e-6);
/* a bigger target always costs more, and a fee always costs more gross */
check("SSXO amount in rises with the target",
  app.stableSwapExactOut("1000", "1000", "100", "200", 0).amountIn > app.stableSwapExactOut("1000", "1000", "100", "100", 0).amountIn);
check("SSXO a fee raises the gross in, never the net",
  app.stableSwapExactOut("1000", "1000", "100", "100", 25).amountIn > app.stableSwapExactOut("1000", "1000", "100", "100", 0).amountIn &&
  Math.abs(app.stableSwapExactOut("1000", "1000", "100", "100", 25).netIn - app.stableSwapExactOut("1000", "1000", "100", "100", 0).netIn) < 1e-9);
/* rejections */
check("SSXO rejects a target at or above the whole output reserve", app.stableSwapExactOut("1000", "1000", "100", "1000", 0) === null && app.stableSwapExactOut("1000", "1000", "100", "1001", 0) === null);
check("SSXO rejects non-positive amplification", app.stableSwapExactOut("1000", "1000", "0", "100", 25) === null && app.stableSwapExactOut("1000", "1000", "-5", "100", 25) === null);
check("SSXO rejects blank and junk", app.stableSwapExactOut("1000", "1000", "", "100", 25) === null && app.stableSwapExactOut("abc", "1000", "100", "100", 25) === null && app.stableSwapExactOut("1000", "1000", "100", "", 25) === null);
check("SSXO rejects non-positive amounts", app.stableSwapExactOut("0", "1000", "100", "100", 25) === null && app.stableSwapExactOut("1000", "1000", "100", "-5", 25) === null && app.stableSwapExactOut("1000", "1000", "100", "0", 25) === null);
check("SSXO rejects bad fees", app.stableSwapExactOut("1000", "1000", "100", "100", 10000) === null && app.stableSwapExactOut("1000", "1000", "100", "100", -1) === null && app.stableSwapExactOut("1000", "1000", "100", "100", "25.5") === null);
check("all ssxo controls labelled", ["ssxo-rin", "ssxo-rout", "ssxo-amp", "ssxo-aout", "ssxo-fee", "ssxo-ain", "ssxo-spot"].every(id => html.includes(`for="${id}"`)));
check("ssxo tool present in index.html", html.includes('id="ssxo-calc"') && html.includes('id="ssxo-result"'));
check("ssxo honesty: asymptotic reserve and not-live labels", html.includes("a target at or above the whole output reserve is rejected, not quoted") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers stableswap exact-out", guide.includes("Exact-out on a stable curve"));
check("README lists tool 59", readme.includes("59. **Stableswap exact-out swap model**"));

/* ---------- Tool 60: weighted-pool impermanent-loss calculator ---------- */
/* closed form: lpFactor = r^w, holdFactor = w*r + (1-w), IL = ratio - 1.
   Headline vectors from the clean foreground prototype (which also
   verified the closed form against the weighted invariant solved
   numerically at w=0.8, spot 0.25..9, to ~1e-15). */
const wil1 = app.weightedImpermanentLoss("80", "2", "1000");
near("WIL 80/2 lpFactor", wil1.lpFactor, 1.7411011265922482, 1e-12);
near("WIL 80/2 holdFactor", wil1.holdFactor, 1.8, 1e-12);
near("WIL 80/2 ilPct", wil1.ilPct, -3.2721596337639935, 1e-9);
near("WIL 80/2 lpValue", wil1.lpValue, 1741.1011265922482, 1e-9);
near("WIL 80/2 holdValue", wil1.holdValue, 1800, 1e-9);
near("WIL 80/2 feesNeeded", wil1.feesNeeded, 58.89887340775179, 1e-9);
const wil2 = app.weightedImpermanentLoss("20", "2", "1000");
near("WIL 20/2 ilPct", wil2.ilPct, -4.275137083580427, 1e-9);
near("WIL 20/2 feesNeeded", wil2.feesNeeded, 51.30164500296508, 1e-9);
near("WIL 10/4 ilPct", app.weightedImpermanentLoss("10", "4", "").ilPct, -11.638588077151146, 1e-9);
near("WIL 90/4 feesNeeded", app.weightedImpermanentLoss("90", "4", "1000").feesNeeded, 217.79774681550367, 1e-9);
/* at a 50% weight this IS tool 2: values, IL and tool 4's hurdle verbatim */
for (const [r, dep] of [["2", "1000"], ["0.5", "1000"], ["4", "1000"], ["0.25", "2500"], ["1.5", "777"]]) {
  const w50 = app.weightedImpermanentLoss("50", r, dep);
  const t2 = app.impermanentLoss(r, dep);
  const t4 = app.breakEvenFees(r, dep, "");
  check("WIL 50/50 equals tool 2 at r=" + r,
    Math.abs(w50.ilPct - t2.ilPct) < 1e-9 && Math.abs(w50.lpValue - t2.lpValue) < 1e-9 &&
    Math.abs(w50.holdValue - t2.holdValue) < 1e-9 && Math.abs(w50.feesNeeded - t4.feesNeeded) < 1e-9);
}
/* token-swap symmetry: weight w at multiple r == weight 1-w at 1/r */
for (const [w, r] of [["80", "2"], ["70", "3"], ["20", "0.5"], ["95", "9"], ["35", "0.25"]]) {
  const a = app.weightedImpermanentLoss(w, r, "");
  const b = app.weightedImpermanentLoss(String(100 - Number(w)), String(1 / Number(r)), "");
  check("WIL symmetry " + w + "/" + r, Math.abs(a.ilPct - b.ilPct) < 1e-9);
}
/* no move, no loss at any weight; IL never positive; deposit optional */
check("WIL no move no loss", [5, 25, 50, 75, 95].every(w => app.weightedImpermanentLoss(String(w), "1", "1000").ilPct === 0));
check("WIL IL never positive sweep",
  [10, 30, 50, 70, 90].every(w => [0.1, 0.5, 0.9, 1.1, 2, 5, 20].every(r => app.weightedImpermanentLoss(String(w), String(r), "").ilPct <= 1e-12)));
const wilNoDep = app.weightedImpermanentLoss("80", "2", "");
check("WIL deposit optional", wilNoDep !== null && wilNoDep.deposit === undefined && wilNoDep.feesNeeded === undefined);
check("WIL blank deposit treated as omitted", app.weightedImpermanentLoss("80", "2", "  ") !== null);
check("WIL weightB reported", wil1.weightBPct === 20);
/* the heavier side tracks holding: at r=2 the 80% weight loses less
   than 20%, and at r=0.5 the ordering flips exactly */
check("WIL weight ordering flips with direction",
  Math.abs(app.weightedImpermanentLoss("80", "2", "").ilPct) < Math.abs(app.weightedImpermanentLoss("20", "2", "").ilPct) &&
  Math.abs(app.weightedImpermanentLoss("80", "0.5", "").ilPct) > Math.abs(app.weightedImpermanentLoss("20", "0.5", "").ilPct));
check("WIL rejects weights at or beyond the edges", app.weightedImpermanentLoss("0", "2", "") === null && app.weightedImpermanentLoss("100", "2", "") === null && app.weightedImpermanentLoss("-5", "2", "") === null && app.weightedImpermanentLoss("101", "2", "") === null);
check("WIL rejects blank and junk", app.weightedImpermanentLoss("", "2", "") === null && app.weightedImpermanentLoss("80", "", "") === null && app.weightedImpermanentLoss("abc", "2", "") === null && app.weightedImpermanentLoss("80", "xyz", "") === null);
check("WIL rejects non-positive multiples", app.weightedImpermanentLoss("80", "0", "") === null && app.weightedImpermanentLoss("80", "-2", "") === null);
check("WIL rejects a negative deposit", app.weightedImpermanentLoss("80", "2", "-1") === null);
check("WIL rejects an overflowing move", app.weightedImpermanentLoss("90", "1e308", "1000") === null);
check("all wil controls labelled",
  ["wil-weight", "wil-ratio", "wil-deposit", "wil-lpval", "wil-holdval"]
    .every(id => html.includes(`for="${id}"`)));
check("wil tool present in index.html", html.includes('id="wil-calc"') && html.includes('id="wil-result"'));
check("wil honesty: asymmetry and not-live labels", html.includes("Weighting toward a token is a bet on it, not a shield") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers weighted-pool IL", guide.includes("A weighted pool's impermanent loss is set by the weight"));
check("README lists tool 60", readme.includes("60. **Weighted-pool impermanent-loss calculator**"));

/* --- Tool 61: stableswap depeg-loss calculator --- */
const dg1 = app.stableDepegLoss("1000", "1000", "100", "0.9");
near("DEPEG headline newReserveA", dg1.newReserveA, 208.329500135332, 1e-6);
near("DEPEG headline newReserveB", dg1.newReserveB, 1808.21648241263, 1e-6);
near("DEPEG headline endSpotB", dg1.endSpotB, 0.9, 1e-9);
near("DEPEG headline holdValueA", dg1.holdValueA, 1900, 1e-9);
near("DEPEG headline lpValueA", dg1.lpValueA, 1835.7243343067, 1e-6);
near("DEPEG headline lossPct", dg1.lossPct, -3.38292977333147, 1e-9);
near("DEPEG p0.98 lossPct", app.stableDepegLoss("1000", "1000", "100", "0.98").lossPct, -0.343753659400448, 1e-9);
near("DEPEG p0.5 lossPct", app.stableDepegLoss("1000", "1000", "100", "0.5").lossPct, -28.9437762279243, 1e-9);
near("DEPEG p1.1 lossPct", app.stableDepegLoss("1000", "1000", "100", "1.1").lossPct, -2.98484391305921, 1e-9);
near("DEPEG A1 lossPct", app.stableDepegLoss("1000", "1000", "1", "0.9").lossPct, -0.27643935460242, 1e-9);
near("DEPEG A5 lossPct", app.stableDepegLoss("1000", "1000", "5", "0.9").lossPct, -0.783709272428446, 1e-9);
near("DEPEG A5000 lossPct", app.stableDepegLoss("1000", "1000", "5000", "0.9").lossPct, -4.95469633867565, 1e-9);
check("DEPEG loss grows with amplification",
  Math.abs(app.stableDepegLoss("1000", "1000", "1", "0.9").lossPct) <
  Math.abs(app.stableDepegLoss("1000", "1000", "5", "0.9").lossPct) &&
  Math.abs(app.stableDepegLoss("1000", "1000", "5", "0.9").lossPct) <
  Math.abs(dg1.lossPct) &&
  Math.abs(dg1.lossPct) <
  Math.abs(app.stableDepegLoss("1000", "1000", "5000", "0.9").lossPct));
const dgPeg = app.stableDepegLoss("1000", "1000", "100", "1");
check("DEPEG peg holds means no move, no loss", dgPeg.lossPct === 0 && dgPeg.aChange === 0 && dgPeg.bChange === 0 && dgPeg.newReserveA === 1000);
const dgLop = app.stableDepegLoss("1000", "500", "100", "0.9");
near("DEPEG lopsided startSpotB", dgLop.startSpotB, 1.00835153922505, 1e-9);
near("DEPEG lopsided lossPct", dgLop.lossPct, -5.10739002356635, 1e-9);
const dgOwnSpot = app.stableDepegLoss("1000", "500", "100", "1.0083515392250515");
check("DEPEG price at the pool's own spot is the identity", dgOwnSpot !== null && dgOwnSpot.lossPct === 0 && dgOwnSpot.aChange === 0);
/* The rebalanced reserves satisfy tool 58/59's invariant equation itself. */
function depegInvariantResidual(r, amp) {
  const Ann = 2 * amp, D = r.invariantD;
  return Math.abs(Ann * (r.newReserveA + r.newReserveB) + D - (Ann * D + Math.pow(D, 3) / (4 * r.newReserveA * r.newReserveB)));
}
check("DEPEG invariant equation holds at the rebalanced reserves",
  [[dg1, 100], [dgLop, 100], [app.stableDepegLoss("1000", "1000", "5", "0.5"), 5], [app.stableDepegLoss("2000", "800", "1000", "1.3"), 1000]]
    .every(([r, a]) => depegInvariantResidual(r, a) < 1e-6 * r.invariantD));
/* Selling the accumulated B through tool 58 returns exactly the A drained. */
const dgSwap = app.stableSwap("1000", "1000", "100", String(dg1.bChange), 0);
near("DEPEG tool 58 composition: B sold returns the A drained", dgSwap.out, -dg1.aChange, 1e-6);
const dgUp = app.stableDepegLoss("1000", "1000", "100", "1.1");
const dgSwapUp = app.stableSwap("1000", "1000", "100", String(dgUp.aChange), 0);
near("DEPEG tool 58 composition, up direction", dgSwapUp.out, -dgUp.bChange, 1e-6);
/* Token-swap mirror: swapped reserves at the reciprocal price mirror the reserves. */
const dgMirror = app.stableDepegLoss("1000", "1000", "100", String(1 / 0.9));
near("DEPEG mirror newReserveA", dgMirror.newReserveA, dg1.newReserveB, 1e-6);
near("DEPEG mirror newReserveB", dgMirror.newReserveB, dg1.newReserveA, 1e-6);
check("DEPEG loss never positive, end spot lands on the price (sweep)",
  [1, 5, 100, 1000].every(a => [0.5, 0.8, 0.9, 0.99, 1.01, 1.1, 1.5, 2].every(p => {
    const q = app.stableDepegLoss("1000", "1000", String(a), String(p));
    return q !== null && q.lossPct <= 1e-9 && Math.abs(q.endSpotB - p) <= Math.max(1e-6, p * 1e-6);
  })));
check("DEPEG deeper depeg loses more",
  Math.abs(app.stableDepegLoss("1000", "1000", "100", "0.98").lossPct) <
  Math.abs(dg1.lossPct) &&
  Math.abs(dg1.lossPct) <
  Math.abs(app.stableDepegLoss("1000", "1000", "100", "0.5").lossPct));
check("DEPEG rejects blank and junk", app.stableDepegLoss("", "1000", "100", "0.9") === null && app.stableDepegLoss("1000", "1000", "100", "") === null && app.stableDepegLoss("abc", "1000", "100", "0.9") === null && app.stableDepegLoss("1000", "1000", "100", "xyz") === null);
check("DEPEG rejects non-positive inputs", app.stableDepegLoss("0", "1000", "100", "0.9") === null && app.stableDepegLoss("1000", "-5", "100", "0.9") === null && app.stableDepegLoss("1000", "1000", "0", "0.9") === null && app.stableDepegLoss("1000", "1000", "100", "0") === null && app.stableDepegLoss("1000", "1000", "100", "-0.9") === null);
check("DEPEG rejects an overflowing price", app.stableDepegLoss("1000", "1000", "100", "1e309") === null);
check("all depeg controls labelled",
  ["depeg-ra", "depeg-rb", "depeg-amp", "depeg-price", "depeg-lpval", "depeg-holdval"]
    .every(id => html.includes(`for="${id}"`)));
check("depeg tool present in index.html", html.includes('id="depeg-calc"') && html.includes('id="depeg-result"'));
check("depeg honesty: amplification danger and not-live labels", html.includes("A higher amplification is more dangerous on a depeg, not safer") && html.includes("not live pool data") && html.includes("not financial advice"));
check("depeg zero loss renders as 0, not -0 (handler negates via 0 - loss)", appSrc.includes("fmt(0 - res.lossA, 6)") && appSrc.includes("fmt(0 - res.lossPct, 4)") && !appSrc.includes("fmt(-res.lossA"));
check("guide covers stableswap depeg loss", guide.includes("On a depeg, a higher amplification loses more, not less"));
check("README lists tool 61", readme.includes("61. **Stableswap depeg-loss calculator**"));

/* ---------- Tool 62: Weighted-pool arbitrage model (WARB) ---------- */
/* headline: 800 A / 200 B at an 80% A weight spots at exactly
   (200/0.2)/(800/0.8) = 1 — NOT the naive reserve ratio 0.25.
   External 2, zero fee: targets are forced by the invariant and
   the spot condition: A' = k/(2*0.25)^0.2 = 696.4404506368993,
   B' = 348.2202253184496; pay 148.2202253184496 B, take
   103.5595493631007 A, profit 58.89887340775181 B (prototype-verified) */
const wa1 = app.weightedArbitrage("800", "200", "80", "2", 0);
near("WARB headline weighted spot is 1, not the reserve ratio", wa1.spotPrice, 1, 1e-12);
check("WARB headline direction", wa1.direction === "buy-a" && wa1.inToken === "B" && wa1.outToken === "A");
near("WARB headline target A", wa1.targetReserveA, 696.4404506368993, 1e-9);
near("WARB headline target B", wa1.targetReserveB, 348.2202253184496, 1e-9);
near("WARB headline net in", wa1.netIn, 148.2202253184496, 1e-9);
near("WARB headline amount out", wa1.amountOut, 103.5595493631007, 1e-9);
near("WARB headline profit", wa1.profitInB, 58.89887340775181, 1e-9);
near("WARB headline gap pct", wa1.priceGapPct, 100, 1e-9);
/* mirror direction: external 0.5 against the same spot of 1 */
const wa2 = app.weightedArbitrage("800", "200", "80", "0.5", 0);
check("WARB mirror direction", wa2.direction === "sell-a" && wa2.inToken === "A" && wa2.outToken === "B");
near("WARB mirror net in", wa2.netIn, 118.95868399762787, 1e-9);
near("WARB mirror amount out", wa2.amountOut, 85.13016450029654, 1e-9);
near("WARB mirror profit", wa2.profitInB, 25.650822501482608, 1e-9);
/* the fee grosses the input up and lowers the profit, targets unchanged */
const wa3 = app.weightedArbitrage("800", "200", "80", "2", 25);
near("WARB 25bps gross in", wa3.grossIn, 148.59170457989933, 1e-9);
near("WARB 25bps profit", wa3.profitInB, 58.52739414630207, 1e-9);
check("WARB fee leaves targets and net unchanged", wa3.targetReserveA === wa1.targetReserveA && wa3.netIn === wa1.netIn && wa3.profitInB < wa1.profitInB);
/* at the weighted spot there is no trade: equal reserves at 80% spot
   at exactly 4, so external 4 is "none" even though the ratio is 1 */
const waNone = app.weightedArbitrage("1000", "1000", "80", "4", 25);
near("WARB equal reserves at 80% spot at 4", waNone.spotPrice, 4, 1e-12);
check("WARB at weighted spot is none", waNone.direction === "none" && waNone.profitInB === 0 && waNone.amountOut === 0 && waNone.grossIn === 0);
/* 50/50 reduces to Tool 16 exactly — every field that matters */
for (const [ra, rb, pe, f] of [["1000", "1000", "4", 0], ["1000", "1000", "0.25", 25], ["2000", "500", "0.5", 25], ["1000", "1000", "2", 100]]) {
  const w = app.weightedArbitrage(ra, rb, "50", pe, f);
  const c16 = app.cpArbitrage(ra, rb, pe, f);
  check("WARB 50/50 equals Tool 16 " + ra + "/" + rb + " Pe " + pe + " @" + f + "bps",
    w !== null && c16 !== null && w.direction === c16.direction &&
    Math.abs(w.spotPrice - c16.spotPrice) < 1e-9 &&
    Math.abs(w.netIn - c16.netIn) < 1e-6 && Math.abs(w.amountOut - c16.amountOut) < 1e-6 &&
    Math.abs(w.profitInB - c16.profitInB) < 1e-6);
}
/* the invariant holds at the target reserves and their spot is Pe */
for (const [ra, rb, wa, pe] of [[800, 200, 80, 2], [1000, 1000, 20, 3], [5000, 1000, 70, 0.2], [1000, 4000, 30, 9]]) {
  const w = app.weightedArbitrage(String(ra), String(rb), String(wa), String(pe), 0);
  const wA = wa / 100, wB = 1 - wA;
  const k0 = Math.pow(ra, wA) * Math.pow(rb, wB);
  const k1 = Math.pow(w.targetReserveA, wA) * Math.pow(w.targetReserveB, wB);
  const postSpot = (w.targetReserveB / wB) / (w.targetReserveA / wA);
  check("WARB invariant + post-trade spot " + ra + "/" + rb + " w" + wa + " Pe " + pe,
    Math.abs(k1 / k0 - 1) < 1e-12 && Math.abs(postSpot - pe) < 1e-9);
}
/* composition: Tool 56 swapping the gross input returns the output */
for (const [ra, rb, wa, pe, f] of [["800", "200", "80", "2", 0], ["800", "200", "80", "0.5", 25], ["1000", "1000", "20", "3", 25], ["5000", "1000", "70", "0.2", 50], ["1000", "4000", "30", "9", 0]]) {
  const w = app.weightedArbitrage(ra, rb, wa, pe, f);
  const inB = w.inToken === "B";
  const sw = app.weightedSwap(inB ? rb : ra, inB ? ra : rb, inB ? String(100 - Number(wa)) : wa, String(w.grossIn), f);
  check("WARB Tool-56 composition " + ra + "/" + rb + " w" + wa + " Pe " + pe + " @" + f + "bps",
    sw !== null && Math.abs(sw.out - w.amountOut) < Math.max(1e-6, w.amountOut * 1e-9));
}
/* token-swap mirror: swapping the tokens, complementing the weight
   and inverting the price models the same trade — profits agree
   once valued in the same token (mirror profit is in A; x Pe) */
const waMir = app.weightedArbitrage("200", "800", "20", "0.5", 0);
near("WARB token-swap mirror profit", waMir.profitInB * 2, wa1.profitInB, 1e-9);
/* a gap smaller than the fee is honestly unprofitable */
check("WARB tiny gap eaten by fee", app.weightedArbitrage("1000", "1000", "50", "1.001", 25).profitInB < 0);
check("WARB tiny gap profitable at zero fee", app.weightedArbitrage("1000", "1000", "50", "1.001", 0).profitInB > 0);
check("WARB larger gap = larger profit", app.weightedArbitrage("800", "200", "80", "4", 25).profitInB > wa3.profitInB);
check("WARB rejects blank and junk", app.weightedArbitrage("", "200", "80", "2", 0) === null && app.weightedArbitrage("800", "200", "80", "", 0) === null && app.weightedArbitrage("abc", "200", "80", "2", 0) === null && app.weightedArbitrage("800", "200", "80", "2", "") === null);
check("WARB rejects non-positive inputs", app.weightedArbitrage("0", "200", "80", "2", 0) === null && app.weightedArbitrage("800", "-5", "80", "2", 0) === null && app.weightedArbitrage("800", "200", "80", "0", 0) === null && app.weightedArbitrage("800", "200", "80", "-2", 0) === null);
check("WARB rejects weight at the edges", app.weightedArbitrage("800", "200", "0", "2", 0) === null && app.weightedArbitrage("800", "200", "100", "2", 0) === null && app.weightedArbitrage("800", "200", "-10", "2", 0) === null);
check("WARB rejects bad fee", app.weightedArbitrage("800", "200", "80", "2", 10000) === null && app.weightedArbitrage("800", "200", "80", "2", -1) === null && app.weightedArbitrage("800", "200", "80", "2", 25.5) === null);
check("WARB rejects an overflowing external price", app.weightedArbitrage("1000", "1000", "80", "1e309", 0) === null);
check("all warb controls labelled",
  ["warb-ra", "warb-rb", "warb-wa", "warb-ext", "warb-fee", "warb-out"]
    .every(id => html.includes(`for="${id}"`)));
check("warb tool present in index.html", html.includes('id="warb-calc"') && html.includes('id="warb-result"'));
check("warb honesty: weights inside the spot and not-live labels", html.includes("judge the gap off the raw reserves and you misprice the trade") && html.includes("not a live feed") && html.includes("not financial advice"));
check("guide covers weighted-pool arbitrage", guide.includes("read the gap off the spot, not the reserves"));
check("README lists tool 62", readme.includes("62. **Weighted-pool arbitrage model**"));

/* ---------- Tool 63: Weighted-pool exact-out swap model (WXO) ---------- */
/* headline: balanced 1,000/1,000 at an 80% input weight spots at
   (1000/0.2)/(1000/0.8) = 4; 100 out forces netIn =
   1000 x ((1000/900)^0.25 - 1) = 26.690096080340897 (prototype-
   verified, round-trips through weightedSwap to ~1e-13) */
const wx1 = app.weightedSwapExactOut("1000", "1000", "80", "100", 0);
near("WXO headline weighted spot", wx1.spotPrice, 4, 1e-12);
near("WXO headline net in", wx1.netIn, 26.690096080340897, 1e-9);
near("WXO headline gross in at zero fee equals net", wx1.amountIn, 26.690096080340897, 1e-9);
near("WXO headline effective price", wx1.effectivePrice, 3.746708130948128, 1e-9);
near("WXO headline price impact", wx1.priceImpactPct, 6.332296726296827, 1e-9);
check("WXO headline post-trade reserves", wx1.newReserveOut === 900 && Math.abs(wx1.newReserveIn - 1026.6900960803409) < 1e-9);
/* the fee grosses the input up and leaves the net untouched */
const wx2 = app.weightedSwapExactOut("1000", "1000", "80", "100", 25);
near("WXO 25bps gross in", wx2.amountIn, 26.756988551720195, 1e-9);
check("WXO fee leaves net and reserves unchanged", wx2.netIn === wx1.netIn && wx2.newReserveIn === wx1.newReserveIn && wx2.amountIn > wx1.amountIn);
/* the weight is inside the price: the same target at 20% costs far more */
const wx3 = app.weightedSwapExactOut("1000", "1000", "20", "100", 25);
near("WXO 20% gross in", wx3.amountIn, 525.4715817130085, 1e-9);
near("WXO 20% spot", wx3.spotPrice, 0.25, 1e-12);
check("WXO heavier input weight = cheaper target", wx2.amountIn < app.weightedSwapExactOut("1000", "1000", "50", "100", 25).amountIn && app.weightedSwapExactOut("1000", "1000", "50", "100", 25).amountIn < wx3.amountIn);
/* near the ceiling the cost explodes: 900 of 1,000 out at 80% */
const wxBig = app.weightedSwapExactOut("1000", "1000", "80", "900", 25);
near("WXO near-ceiling net in", wxBig.netIn, 778.2794100389225, 1e-9);
near("WXO near-ceiling gross in", wxBig.amountIn, 780.229985001426, 1e-9);
check("WXO near-ceiling impact is severe", wxBig.priceImpactPct > 70);
/* 50/50 reduces to Tool 6 exactly, allowing for its 9dp round-up */
for (const [rin, rout, aout, f] of [["1000", "1000", "100", 25], ["1000", "1000", "100", 0], ["2000", "500", "50", 25], ["500", "5000", "999", 100], ["1000", "1000", "1", 25]]) {
  const w = app.weightedSwapExactOut(rin, rout, "50", aout, f);
  const c6 = app.cpSwapExactOut(rin, rout, aout, f);
  check("WXO 50/50 equals Tool 6 " + rin + "/" + rout + " out " + aout + " @" + f + "bps",
    w !== null && c6 !== null && Math.abs(w.amountIn - Number(c6.amountIn)) <= Math.max(1e-6, Number(c6.amountIn) * 1e-9) + 1e-9 &&
    Math.abs(w.netIn - Number(c6.inAfterFee)) <= Math.max(1e-6, Number(c6.inAfterFee) * 1e-9) + 1e-9 &&
    Math.abs(w.spotPrice - c6.spotPrice) < 1e-12);
}
/* composition: Tool 56 swapping the gross input returns the target */
for (const [rin, rout, wPct, aout, f] of [["1000", "1000", "80", "100", 25], ["1000", "1000", "20", "100", 25], ["800", "200", "80", "50", 25], ["200", "800", "20", "400", 0], ["5000", "1000", "70", "10", 50], ["1000", "4000", "30", "1000", 25], ["1000", "1000", "80", "900", 25]]) {
  const w = app.weightedSwapExactOut(rin, rout, wPct, aout, f);
  const sw = app.weightedSwap(rin, rout, wPct, String(w.amountIn), f);
  check("WXO Tool-56 round-trip " + rin + "/" + rout + " w" + wPct + " out " + aout + " @" + f + "bps",
    sw !== null && Math.abs(sw.out - Number(aout)) < Math.max(1e-6, Number(aout) * 1e-9));
}
/* the weighted invariant holds at the post-trade reserves */
for (const [rin, rout, wPct, aout] of [[1000, 1000, 80, 100], [1000, 1000, 20, 900], [800, 200, 80, 50], [1000, 4000, 30, 1000]]) {
  const w = app.weightedSwapExactOut(String(rin), String(rout), String(wPct), String(aout), 0);
  const wIn = wPct / 100, wOut = 1 - wIn;
  const k0 = Math.pow(rin, wIn) * Math.pow(rout, wOut);
  const k1 = Math.pow(w.newReserveIn, wIn) * Math.pow(w.newReserveOut, wOut);
  check("WXO invariant " + rin + "/" + rout + " w" + wPct + " out " + aout, Math.abs(k1 / k0 - 1) < 1e-12);
}
/* token-swap mirror: swapping reserves and complementing the weight
   prices the reciprocal trade — gross in of one is linked by spot */
const wxMir = app.weightedSwapExactOut("200", "800", "20", "50", 25);
const wxFwd = app.weightedSwapExactOut("800", "200", "80", "50", 25);
check("WXO token-swap mirror spots are reciprocal", Math.abs(wxMir.spotPrice * wxFwd.spotPrice - 1) < 1e-12);
check("WXO rejects blank and junk", app.weightedSwapExactOut("", "1000", "80", "100", 0) === null && app.weightedSwapExactOut("1000", "1000", "80", "", 0) === null && app.weightedSwapExactOut("abc", "1000", "80", "100", 0) === null && app.weightedSwapExactOut("1000", "1000", "80", "100", "") === null);
check("WXO rejects non-positive inputs", app.weightedSwapExactOut("0", "1000", "80", "100", 0) === null && app.weightedSwapExactOut("1000", "-5", "80", "100", 0) === null && app.weightedSwapExactOut("1000", "1000", "80", "0", 0) === null && app.weightedSwapExactOut("1000", "1000", "80", "-1", 0) === null);
check("WXO rejects a target at or above the output reserve", app.weightedSwapExactOut("1000", "1000", "80", "1000", 0) === null && app.weightedSwapExactOut("1000", "1000", "80", "1001", 0) === null);
check("WXO rejects weight at the edges", app.weightedSwapExactOut("1000", "1000", "0", "100", 0) === null && app.weightedSwapExactOut("1000", "1000", "100", "100", 0) === null && app.weightedSwapExactOut("1000", "1000", "-10", "100", 0) === null);
check("WXO rejects bad fee", app.weightedSwapExactOut("1000", "1000", "80", "100", 10000) === null && app.weightedSwapExactOut("1000", "1000", "80", "100", -1) === null && app.weightedSwapExactOut("1000", "1000", "80", "100", 25.5) === null);
check("WXO rejects an overflowing target", app.weightedSwapExactOut("1000", "1000", "80", "1e309", 0) === null);
/* near the ceiling the log term must come from the exact remainder
   (reserveOut - amountOut, Sterbenz-exact), not from the rounded
   ratio amountOut/reserveOut: at a 1e-9 remainder fraction the
   ratio form put the 50/50 net at 1000000027281.9312 against the
   true 1000000001524.7573 (~2.6e-5 relative off; 50-digit oracle) */
const wxCeil = app.weightedSwapExactOut("1000", "1000", "50", "999.999999", 9999);
near("WXO near-ceiling net in uses the exact remainder", wxCeil.netIn, 1000000001524.7573, 1);
near("WXO near-ceiling gross in at max fee", wxCeil.amountIn, 10000000015247566, 1e7);
const wxCeil80 = app.weightedSwapExactOut("1000", "1000", "80", "999.999999", 25);
near("WXO near-ceiling w80 net in", wxCeil80.netIn, 176827.94111613513, 0.01);
/* the dust side keeps the log1p form and its exactness */
const wxDust = app.weightedSwapExactOut("1000", "1000", "80", "0.001", 0);
near("WXO dust target net in", wxDust.netIn, 0.0002500001562501172, 1e-15);
check("WXO handler uses the branched log form", appSrc.includes("Math.log(reserveOut / newReserveOut)") && appSrc.includes("-Math.log1p(-amountOut / reserveOut)"));
check("all wxo controls labelled",
  ["wxo-rin", "wxo-rout", "wxo-win", "wxo-aout", "wxo-fee", "wxo-ain", "wxo-spot"]
    .every(id => html.includes(`for="${id}"`)));
check("wxo tool present in index.html", html.includes('id="wxo-calc"') && html.includes('id="wxo-result"'));
check("wxo honesty: asymptotic ceiling and not-live labels", html.includes("a target at or above the whole output reserve is impossible on this curve") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers weighted-pool exact-out", guide.includes("the weight sets how fast the cost explodes"));
check("README lists tool 63", readme.includes("63. **Weighted-pool exact-out swap model**"));

/* ---------- Tool 64: Weighted-pool price-impact sizer (WIS) ---------- */
const wis1 = app.weightedImpactSizer("1000", "1000", "50", "10", 0);
check("WIS headline is feasible", wis1 !== null && wis1.feasible === true);
near("WIS zero-fee 50/50 gross in at a 10% cap", wis1.maxAmountIn, 111.11111111111111, 1e-6);
near("WIS zero-fee 50/50 out at a 10% cap", wis1.amountOut, 100, 1e-6);
near("WIS headline actual impact is the cap", wis1.actualImpactPct, 10, 1e-9);
near("WIS headline spot", wis1.spotPrice, 1, 1e-12);
near("WIS headline post-trade spot", wis1.postTradeSpotPrice, 0.81, 1e-9);
/* At 50/50 the bisected root must collapse to tool 17's closed form. */
for (const [ri, ro, cap, fee] of [[1000, 1000, 10, 25], [1000, 4000, 5, 25], [500, 2000, 25, 100], [10000, 250, 1, 0], [1000, 1000, 50, 25]]) {
  const a = app.weightedImpactSizer(String(ri), String(ro), "50", String(cap), fee);
  const b = app.priceImpactSizer(String(ri), String(ro), String(cap), fee);
  check("WIS 50/50 gross equals tool 17 at " + ri + "/" + ro + " cap " + cap + " fee " + fee,
    Math.abs(a.maxAmountIn - b.maxAmountIn) / b.maxAmountIn < 1e-9);
  check("WIS 50/50 out equals tool 17 at " + ri + "/" + ro + " cap " + cap + " fee " + fee,
    Math.abs(a.amountOut - b.amountOut) / b.amountOut < 1e-9);
}
/* The sized trade, run through tool 56 itself, lands on the cap. */
for (const w of [5, 20, 50, 80, 95]) {
  for (const cap of [1, 5, 10, 25, 60]) {
    for (const fee of [0, 25, 100]) {
      if (cap <= fee / 100) continue;
      const s = app.weightedImpactSizer("1000", "1000", String(w), String(cap), fee);
      const sw = s && app.weightedSwap("1000", "1000", String(w), String(s.maxAmountIn), fee);
      check("WIS sized trade hits the cap at w" + w + " cap " + cap + " fee " + fee,
        s !== null && s.feasible && Math.abs(s.actualImpactPct - cap) < 1e-6 &&
        sw !== null && Math.abs(sw.priceImpactPct - cap) < 1e-6 &&
        Math.abs(sw.out - s.amountOut) / s.amountOut < 1e-9);
    }
  }
}
/* The weight is inside the price: lopsided weights admit different trades. */
const wis80 = app.weightedImpactSizer("1000", "1000", "80", "10", 0);
const wis20 = app.weightedImpactSizer("1000", "1000", "20", "10", 0);
near("WIS w80 spot", wis80.spotPrice, 4, 1e-9);
near("WIS w80 gross in", wis80.maxAmountIn, 43.51803585007562, 1e-6);
near("WIS w80 out", wis80.amountOut, 156.6649290602723, 1e-6);
near("WIS w20 spot", wis20.spotPrice, 0.25, 1e-12);
near("WIS w20 gross in", wis20.maxAmountIn, 181.56234034448536, 1e-6);
near("WIS w20 out", wis20.amountOut, 40.851526577509205, 1e-6);
check("WIS gross-in ordering by weight", wis80.maxAmountIn < wis1.maxAmountIn && wis1.maxAmountIn < wis20.maxAmountIn);
check("WIS post-trade spot is the weighted spot at the new reserves",
  Math.abs(wis80.postTradeSpotPrice - ((1000 - wis80.amountOut) / 0.2) / ((1000 + wis80.netIn) / 0.8)) < 1e-9);
/* A cap at or below the fee tier admits no trade, at any weight. */
for (const w of [20, 50, 80]) {
  const s = app.weightedImpactSizer("1000", "1000", String(w), "0.25", 25);
  check("WIS cap equal to the fee is infeasible at w" + w, s !== null && s.feasible === false && s.maxAmountIn === 0 && Math.abs(s.feeImpactPct - 0.25) < 1e-12);
}
check("WIS cap below the fee is infeasible", app.weightedImpactSizer("1000", "1000", "50", "0.1", 25).feasible === false);
check("WIS cap equal to a 100 bps fee is infeasible", app.weightedImpactSizer("1000", "1000", "50", "1", 100).feasible === false);
/* Token-swap mirror: reciprocal spots. */
const wisM1 = app.weightedImpactSizer("1000", "4000", "80", "10", 25);
const wisM2 = app.weightedImpactSizer("4000", "1000", "20", "10", 25);
near("WIS mirror spots are reciprocal", wisM1.spotPrice * wisM2.spotPrice, 1, 1e-9);
/* A 10x deeper pool admits a 10x trade at the same cap and weight. */
const wisD = app.weightedImpactSizer("10000", "10000", "80", "10", 25);
const wisS = app.weightedImpactSizer("1000", "1000", "80", "10", 25);
near("WIS 10x pool admits 10x the trade", wisD.maxAmountIn / wisS.maxAmountIn, 10, 1e-9);
check("WIS rejects blank and junk",
  app.weightedImpactSizer("", "1000", "50", "10", 25) === null &&
  app.weightedImpactSizer("1000", "1000", "abc", "10", 25) === null);
check("WIS rejects non-positive inputs",
  app.weightedImpactSizer("0", "1000", "50", "10", 25) === null &&
  app.weightedImpactSizer("1000", "-5", "50", "10", 25) === null);
check("WIS rejects weight at the edges",
  app.weightedImpactSizer("1000", "1000", "0", "10", 25) === null &&
  app.weightedImpactSizer("1000", "1000", "100", "10", 25) === null);
check("WIS rejects cap at the edges",
  app.weightedImpactSizer("1000", "1000", "50", "0", 25) === null &&
  app.weightedImpactSizer("1000", "1000", "50", "100", 25) === null);
check("WIS rejects bad fee",
  app.weightedImpactSizer("1000", "1000", "50", "10", 25.5) === null &&
  app.weightedImpactSizer("1000", "1000", "50", "10", -1) === null &&
  app.weightedImpactSizer("1000", "1000", "50", "10", 10000) === null);
check("WIS rejects an overflowing cap", app.weightedImpactSizer("1000", "1000", "50", "1e309", 0) === null);
check("WIS handler bisects the impact condition", appSrc.includes("if (g(mid) < target) lo = mid; else hi = mid;"));
/* Dust-cap pins: at a 1e-6% cap the surviving fraction's complement
   delta is ~1e-8, where bisecting u itself quantises delta at
   ulp(1) and the sized trade lands ~6e-9 relative off; bisecting
   delta (upper-half roots) holds it to ~2e-9 of the exact
   1.00000001e-5. At a 1e-9% cap (delta ~4e-12) the answer is
   within 1e-5 relative of the spot-consistent oracle
   3.999977795571507e-9 — the float64 floor there, set by the
   ~2-ulp disagreement between spotPrice and exponent. */
const wisDust = app.weightedImpactSizer("1000", "1000", "50", "0.000001", 0);
near("WIS dust cap 1e-6% gross in", wisDust.maxAmountIn, 1.00000001e-5, 3e-14);
const wisDust80 = app.weightedImpactSizer("1000", "1000", "80", "1e-9", 0);
check("WIS dust cap 1e-9% gross in within the float floor",
  Math.abs(wisDust80.maxAmountIn - 3.999977795571507e-9) / 3.999977795571507e-9 < 1e-5);
check("WIS sizer bisects delta for upper-half roots", appSrc.includes("Math.log1p(-delta)") && appSrc.includes("if (gd(dmid) > target) dlo = dmid; else dhi = dmid;"));
check("WIS target derives from spotPrice, not the exponent", appSrc.includes("((reserveOut / reserveIn) / spotPrice)"));
check("all wis controls labelled",
  ["wis-rin", "wis-rout", "wis-win", "wis-cap", "wis-fee", "wis-ain", "wis-aout"]
    .every(id => html.includes(`for="${id}"`)));
check("wis tool present in index.html", html.includes('id="wis-calc"') && html.includes('id="wis-result"'));
check("wis honesty: fee-floor and not-live labels", html.includes("a cap at or below the fee tier admits no trade at any weight") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers weighted-pool impact sizing", guide.includes("read the weight as part of the price"));
check("README lists tool 64", readme.includes("64. **Weighted-pool price-impact sizer**"));


/* ---------- Tool 65: Stableswap arbitrage model (SARB) ---------- */
/* Vectors verified against a clean-room prototype BEFORE these tests
   were written: the gross input fed through Tool 58 returns the
   modelled output and lands on the target reserves; the zero-fee
   endpoint equals Tool 61's depeg endpoint at the reciprocal price. */
const sarbNone = app.stableArbitrage("1000", "1000", "100", "1", 25);
check("SARB balanced pool at par is no trade", sarbNone !== null && sarbNone.direction === "none" && sarbNone.grossIn === 0 && sarbNone.amountOut === 0 && sarbNone.profitInB === 0);
near("SARB balanced spot is exactly 1", sarbNone.spotPrice, 1, 1e-12);
const sarb = app.stableArbitrage("1000", "1000", "100", "1.01", 0);
check("SARB pe above spot buys A", sarb !== null && sarb.direction === "buy-a" && sarb.inToken === "B" && sarb.outToken === "A");
near("SARB 1% gap net in", sarb.netIn, 375.061093965, 1e-6);
near("SARB 1% gap amount out", sarb.amountOut, 373.453959492, 1e-6);
near("SARB 1% gap profit", sarb.profitInB, 2.12740512232, 1e-6);
near("SARB 1% gap target A", sarb.targetReserveA, 626.546040508, 1e-6);
near("SARB 1% gap target B", sarb.targetReserveB, 1375.06109397, 1e-5);
near("SARB post-trade spot lands on external price", sarb.postTradeSpot, 1.01, 1e-9);
near("SARB price gap pct", sarb.priceGapPct, 1, 1e-9);
const sarbFee = app.stableArbitrage("1000", "1000", "100", "1.01", 25);
near("SARB fee grosses the input up", sarbFee.grossIn, 376.001096707, 1e-6);
near("SARB fee leaves net in unchanged", sarbFee.netIn, sarb.netIn, 1e-9);
near("SARB fee profit", sarbFee.profitInB, 1.18740238055, 1e-6);
const sarbDown = app.stableArbitrage("1000", "1000", "100", "0.99", 0);
check("SARB pe below spot sells A", sarbDown !== null && sarbDown.direction === "sell-a" && sarbDown.inToken === "A" && sarbDown.outToken === "B");
near("SARB down net in", sarbDown.netIn, 377.364995477, 1e-6);
near("SARB down amount out", sarbDown.amountOut, 375.734936219, 1e-6);
near("SARB down profit", sarbDown.profitInB, 2.14359069696, 1e-6);
const sarbSmall = app.stableArbitrage("1000", "1000", "100", "1.001", 25);
check("SARB gap below the fee is honestly unprofitable", sarbSmall !== null && sarbSmall.profitInB < 0);
near("SARB small-gap profit", sarbSmall.profitInB, -0.100734874844, 1e-6);
const sarbA1 = app.stableArbitrage("1000", "1000", "1", "1.1", 0);
const sarbA100 = app.stableArbitrage("1000", "1000", "100", "1.1", 0);
const sarbA5000 = app.stableArbitrage("1000", "1000", "5000", "1.1", 0);
near("SARB amp 1 aligning input", sarbA1.netIn, 97.1748582785, 1e-5);
near("SARB amp 100 aligning input", sarbA100.netIn, 795.827461397, 1e-5);
near("SARB amp 5000 aligning input", sarbA5000.netIn, 971.444316885, 1e-5);
check("SARB aligning input grows with amplification", sarbA1.netIn < sarbA100.netIn && sarbA100.netIn < sarbA5000.netIn);
const sarbLop = app.stableArbitrage("1000", "500", "100", "1.05", 25);
near("SARB lopsided spot", sarbLop.spotPrice, 0.9917176313020062, 1e-9);
near("SARB lopsided net in", sarbLop.netIn, 774.591902196, 1e-5);
near("SARB lopsided amount out", sarbLop.amountOut, 768.728597645, 1e-5);
near("SARB lopsided profit", sarbLop.profitInB, 30.6317922427, 1e-5);
/* Composition: the modelled gross input through Tool 58 itself
   returns the modelled output and lands on the target reserves. */
for (const [ra, rb, amp, pe, fee] of [[1000, 1000, 100, 1.01, 0], [1000, 1000, 100, 1.01, 25], [1000, 1000, 100, 0.99, 25], [1000, 500, 100, 1.05, 25], [1000, 500, 5, 0.9, 0], [2000, 1000, 500, 1.02, 4], [500, 2000, 25, 0.98, 10]]) {
  const r = app.stableArbitrage(String(ra), String(rb), String(amp), String(pe), fee);
  const sw = r.direction === "buy-a"
    ? app.stableSwap(String(rb), String(ra), String(amp), String(r.grossIn), fee)
    : app.stableSwap(String(ra), String(rb), String(amp), String(r.grossIn), fee);
  const tgtIn = r.direction === "buy-a" ? r.targetReserveB : r.targetReserveA;
  const tgtOut = r.direction === "buy-a" ? r.targetReserveA : r.targetReserveB;
  check(`SARB composition ${ra}/${rb} A${amp} pe${pe} fee${fee}`,
    Math.abs(sw.out - r.amountOut) <= 1e-6 * r.amountOut &&
    Math.abs(sw.newReserveIn - tgtIn) <= 1e-6 * tgtIn &&
    Math.abs(sw.newReserveOut - tgtOut) <= 1e-6 * tgtOut &&
    Math.abs(r.postTradeSpot - pe) <= 1e-9 * pe);
}
/* Zero fee: the endpoint is Tool 61's depeg endpoint at the
   reciprocal price, and the profit is its LP loss sign-flipped. */
const sarbDepeg = app.stableArbitrage("1000", "1000", "100", String(1 / 0.9), 0);
const depegRef = app.stableDepegLoss("1000", "1000", "100", "0.9");
near("SARB depeg endpoint A equals tool 61", sarbDepeg.targetReserveA, depegRef.newReserveA, 1e-3);
near("SARB depeg endpoint B equals tool 61", sarbDepeg.targetReserveB, depegRef.newReserveB, 1e-3);
near("SARB zero-fee profit is tool 61 loss flipped (in A)", sarbDepeg.profitInB * 0.9, -depegRef.lossA, 1e-3);
const sarbMir1 = app.stableArbitrage("1000", "1000", "100", "1.02", 25);
const sarbMir2 = app.stableArbitrage("1000", "1000", "100", String(1 / 1.02), 25);
near("SARB mirror net in", sarbMir2.netIn, sarbMir1.netIn, 1e-6);
near("SARB mirror targets swap A", sarbMir2.targetReserveA, sarbMir1.targetReserveB, 1e-5);
near("SARB mirror targets swap B", sarbMir2.targetReserveB, sarbMir1.targetReserveA, 1e-5);
const sarbBig = app.stableArbitrage("10000", "10000", "100", "1.01", 0);
near("SARB 10x pool admits 10x the trade", sarbBig.netIn / sarb.netIn, 10, 1e-9);
check("SARB rejects blank and junk",
  app.stableArbitrage("", "1000", "100", "1.01", 0) === null &&
  app.stableArbitrage("1000", "1000", "100", "abc", 0) === null);
check("SARB rejects non-positive inputs",
  app.stableArbitrage("0", "1000", "100", "1.01", 0) === null &&
  app.stableArbitrage("1000", "-5", "100", "1.01", 0) === null &&
  app.stableArbitrage("1000", "1000", "0", "1.01", 0) === null &&
  app.stableArbitrage("1000", "1000", "100", "0", 0) === null &&
  app.stableArbitrage("1000", "1000", "100", "-1", 0) === null);
check("SARB rejects bad fee",
  app.stableArbitrage("1000", "1000", "100", "1.01", 25.5) === null &&
  app.stableArbitrage("1000", "1000", "100", "1.01", -1) === null &&
  app.stableArbitrage("1000", "1000", "100", "1.01", 10000) === null);
check("SARB rejects an overflowing price", app.stableArbitrage("1000", "1000", "100", "1e309", 0) === null);
check("SARB handler bisects the spot condition", appSrc.includes("if (mid.spot < pe) hi = mid; else lo = mid;"));
check("all sarb controls labelled",
  ["sarb-ra", "sarb-rb", "sarb-amp", "sarb-ext", "sarb-fee", "sarb-out"]
    .every(id => html.includes(`for="${id}"`)));
check("sarb tool present in index.html", html.includes('id="sarb-calc"') && html.includes('id="sarb-result"'));
check("sarb honesty: no-live-feed and not-live labels", html.includes("this tool has no live feed and finds no opportunities") && html.includes("not a found opportunity") && html.includes("not financial advice"));
check("guide covers stableswap arbitrage", guide.includes("Arbitrage on a stable curve is a big trade for a small gap"));
check("README lists tool 65", readme.includes("65. **Stableswap arbitrage model**"));

/* ---------- Tool 66: Stableswap price-impact sizer (SIS) ---------- */
/* Vectors verified against a clean foreground prototype BEFORE these
   tests were written: impact is monotone in the input outside Tool
   58's dust noise floor, and every candidate in the shipped sizer is
   priced by Tool 58 itself, so the composition sweep below is the
   definition, not a cross-check. */
const sis = app.stableImpactSizer("1000", "1000", "100", "1", 25);
check("SIS headline feasible", sis !== null && sis.feasible === true);
near("SIS headline gross in", sis.maxAmountIn, 546.3265619034373, 1e-5);
near("SIS headline net in", sis.netIn, 544.9607454986788, 1e-5);
near("SIS headline amount out", sis.amountOut, 540.8632962844032, 1e-5);
near("SIS headline spot is exactly 1", sis.spotPrice, 1, 1e-12);
near("SIS headline actual impact is the cap", sis.actualImpactPct, 1, 1e-9);
near("SIS headline post-trade spot", sis.postTradeSpotPrice, 0.979063385189904, 1e-9);
const sis10 = app.stableImpactSizer("1000", "1000", "100", "10", 0);
near("SIS zero-fee 10% cap gross in", sis10.maxAmountIn, 1064.9200284447274, 1e-5);
near("SIS zero-fee 10% cap amount out", sis10.amountOut, 958.4280256002548, 1e-5);
const sis10f = app.stableImpactSizer("1000", "1000", "100", "10", 25);
near("SIS 10% cap gross in", sis10f.maxAmountIn, 1063.70125271014, 1e-5);
near("SIS 10% cap amount out", sis10f.amountOut, 957.3311274391259, 1e-5);
/* Amplification ordering: a flatter curve admits a bigger trade. */
const sisA1 = app.stableImpactSizer("1000", "1000", "1", "10", 25);
const sisA5000 = app.stableImpactSizer("1000", "1000", "5000", "10", 25);
near("SIS amp 1 gross in", sisA1.maxAmountIn, 214.9800088702125, 1e-5);
near("SIS amp 5000 gross in", sisA5000.maxAmountIn, 1110.1386673651064, 1e-5);
near("SIS amp 5000 amount out", sisA5000.amountOut, 999.1248006285958, 1e-5);
check("SIS admitted trade grows with amplification", sisA1.maxAmountIn < sis10f.maxAmountIn && sis10f.maxAmountIn < sisA5000.maxAmountIn);
/* The drain warning: at A = 5000 a 10% cap pays out >99.9% of the
   output reserve and the spot behind the fill collapses. */
check("SIS amp 5000 trade drains over 99.9% of the out reserve", sisA5000.amountOut > 0.999 * 1000);
near("SIS amp 5000 post-trade spot collapses", sisA5000.postTradeSpotPrice, 0.00841828893307595, 1e-9);
/* Against Tool 17 on the same pool and cap: the stable curve
   admits far more, at every amplification tested. */
const sisCp1 = app.priceImpactSizer("1000", "1000", "1", 25);
check("SIS admits over 50x the constant-product trade at a 1% cap", sis.maxAmountIn > 50 * sisCp1.maxAmountIn);
const sisCp10 = app.priceImpactSizer("1000", "1000", "10", 25);
check("SIS at amp 1 still admits more than constant product at a 10% cap", sisA1.maxAmountIn > sisCp10.maxAmountIn);
/* Lopsided pool: spot off par, sized trade still lands on the cap. */
const sisLop = app.stableImpactSizer("1000", "500", "100", "5", 25);
near("SIS lopsided spot", sisLop.spotPrice, 0.9917176313020062, 1e-9);
near("SIS lopsided gross in", sisLop.maxAmountIn, 434.7698128268828, 1e-5);
near("SIS lopsided amount out", sisLop.amountOut, 409.6104444913782, 1e-5);
near("SIS lopsided post-trade spot", sisLop.postTradeSpotPrice, 0.7522405104962911, 1e-9);
/* Composition: the sized trade, run through Tool 58 itself, lands
   on the cap and returns the modelled output. */
for (const amp of [1, 5, 100, 1000, 5000]) {
  for (const cap of [0.5, 2, 10, 30]) {
    for (const fee of [0, 4, 25, 100]) {
      if (cap <= fee / 100) continue;
      const s = app.stableImpactSizer("1000", "750", String(amp), String(cap), fee);
      const sw = s && app.stableSwap("1000", "750", String(amp), String(s.maxAmountIn), fee);
      check("SIS sized trade hits the cap at A" + amp + " cap " + cap + " fee " + fee,
        s !== null && s.feasible && Math.abs(s.actualImpactPct - cap) < 1e-6 &&
        sw !== null && Math.abs(sw.priceImpactPct - cap) < 1e-6 &&
        Math.abs(sw.out - s.amountOut) / s.amountOut < 1e-9);
    }
  }
}
/* A 10x deeper pool admits a 10x trade at the same cap. */
const sisBig = app.stableImpactSizer("10000", "10000", "100", "10", 25);
near("SIS 10x pool admits 10x the trade", sisBig.maxAmountIn / sis10f.maxAmountIn, 10, 1e-9);
/* A cap at or below the fee tier admits no trade. */
check("SIS cap equal to the fee is infeasible",
  (() => { const s = app.stableImpactSizer("1000", "1000", "100", "0.25", 25); return s !== null && s.feasible === false && s.maxAmountIn === 0 && Math.abs(s.feeImpactPct - 0.25) < 1e-12; })());
check("SIS cap below the fee is infeasible", app.stableImpactSizer("1000", "1000", "100", "0.1", 25).feasible === false);
check("SIS cap equal to a 100 bps fee is infeasible", app.stableImpactSizer("1000", "1000", "100", "1", 100).feasible === false);
check("SIS rejects blank and junk",
  app.stableImpactSizer("", "1000", "100", "10", 25) === null &&
  app.stableImpactSizer("1000", "1000", "abc", "10", 25) === null);
check("SIS rejects non-positive inputs",
  app.stableImpactSizer("0", "1000", "100", "10", 25) === null &&
  app.stableImpactSizer("1000", "-5", "100", "10", 25) === null &&
  app.stableImpactSizer("1000", "1000", "0", "10", 25) === null);
check("SIS rejects cap at the edges",
  app.stableImpactSizer("1000", "1000", "100", "0", 25) === null &&
  app.stableImpactSizer("1000", "1000", "100", "100", 25) === null);
check("SIS rejects bad fee",
  app.stableImpactSizer("1000", "1000", "100", "10", 25.5) === null &&
  app.stableImpactSizer("1000", "1000", "100", "10", -1) === null &&
  app.stableImpactSizer("1000", "1000", "100", "10", 10000) === null);
check("SIS rejects an overflowing cap", app.stableImpactSizer("1000", "1000", "100", "1e309", 0) === null);
check("SIS handler bisects the impact condition", appSrc.includes("if (impactOf(mid) >= capPct) hi = mid; else lo = mid;"));
check("SIS sizer prices candidates through tool 58", appSrc.includes("function stableImpactSizer(") && appSrc.includes("var r = stableSwap(String(reserveIn), String(reserveOut), String(amp), String(amount), fee);"));
check("all sis controls labelled",
  ["sis-rin", "sis-rout", "sis-amp", "sis-cap", "sis-fee", "sis-ain", "sis-aout"]
    .every(id => html.includes(`for="${id}"`)));
check("sis tool present in index.html", html.includes('id="sis-calc"') && html.includes('id="sis-result"'));
check("sis honesty: fee-floor and not-live labels", html.includes("A cap at or below the fee tier admits no trade") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers stableswap impact sizing", guide.includes("an impact cap is not a drain cap"));
check("README lists tool 66", readme.includes("66. **Stableswap price-impact sizer**"));

/* ---------- Tool 67: Curve comparison model (CMP) ---------- */
/* Every leg is the source tool verbatim: tool 1's cpSwap (output
   string parsed back, 9 dp flooring included), tool 56's
   weightedSwap and tool 58's stableSwap. Headline vectors were
   computed in a clean foreground prototype before being written. */
const cmp = app.curveCompare("1000", "1000", "50", "100", "100", 25);
check("CMP headline non-null", cmp !== null);
near("CMP headline CP out", cmp.constantProduct.out, 90.70243237, 1e-9);
near("CMP headline CP spot", cmp.constantProduct.spotPrice, 1, 1e-12);
near("CMP headline CP impact", cmp.constantProduct.priceImpactPct, 9.29756763, 1e-6);
near("CMP headline weighted out", cmp.weighted.out, 90.70243237099342, 1e-9);
near("CMP 50/50 weighted leg is the CP leg", cmp.weighted.out, cmp.constantProduct.out, 1e-9);
near("CMP headline weighted spot", cmp.weighted.spotPrice, 1, 1e-12);
near("CMP headline stable out", cmp.stableswap.out, 99.65061433806079, 1e-9);
near("CMP headline stable spot", cmp.stableswap.spotPrice, 1, 1e-12);
near("CMP headline stable impact", cmp.stableswap.priceImpactPct, 0.3493856619392055, 1e-9);
check("CMP headline best out is stableswap", cmp.bestOut === "stableswap");
near("CMP headline best out amount", cmp.bestOutAmount, 99.65061433806079, 1e-9);
check("CMP headline lowest impact is stableswap", cmp.lowestImpact === "stableswap");
near("CMP headline spread", cmp.outSpread, 99.65061433806079 - 90.70243237, 1e-9);

/* leg-for-leg equality with the source tools across a sweep */
for (const [rin, rout, w, amp, ain, fee] of [
  ["1000", "1000", "80", "100", "100", 25],
  ["1000", "1000", "20", "100", "100", 25],
  ["1000", "4000", "50", "100", "100", 25],
  ["5000", "2500", "35", "100", "250", 10],
  ["1000", "1000", "50", "1", "100", 25],
  ["1000", "1000", "50", "5000", "100", 0],
  ["2000", "500", "65", "20", "37.5", 100]
]) {
  const c = app.curveCompare(rin, rout, w, amp, ain, fee);
  const cp1 = app.cpSwap(rin, rout, ain, fee);
  const wt1 = app.weightedSwap(rin, rout, w, ain, fee);
  const st1 = app.stableSwap(rin, rout, amp, ain, fee);
  const tag = `CMP legs verbatim ${rin}/${rout} w${w} A${amp} in${ain} fee${fee}`;
  check(tag + " non-null", c !== null && cp1 !== null && wt1 !== null && st1 !== null);
  check(tag + " CP", c.constantProduct.out === Number(cp1.out) && c.constantProduct.spotPrice === cp1.spotPrice && c.constantProduct.priceImpactPct === cp1.priceImpactPct);
  check(tag + " weighted", c.weighted.out === wt1.out && c.weighted.spotPrice === wt1.spotPrice && c.weighted.priceImpactPct === wt1.priceImpactPct);
  check(tag + " stable", c.stableswap.out === st1.out && c.stableswap.spotPrice === st1.spotPrice && c.stableswap.priceImpactPct === st1.priceImpactPct);
  check(tag + " bestOut consistent", c.bestOutAmount === Math.max(c.constantProduct.out, c.weighted.out, c.stableswap.out) && c[c.bestOut].out === c.bestOutAmount);
  check(tag + " lowestImpact consistent", c.lowestImpactPct === Math.min(c.constantProduct.priceImpactPct, c.weighted.priceImpactPct, c.stableswap.priceImpactPct) && c[c.lowestImpact].priceImpactPct === c.lowestImpactPct);
}

/* the honesty trap: an 80% weight pays the most because its spot is 4 */
const cmp80 = app.curveCompare("1000", "1000", "80", "100", "100", 25);
near("CMP weight-80 weighted spot", cmp80.weighted.spotPrice, 4, 1e-9);
near("CMP weight-80 weighted out", cmp80.weighted.out, 316.36527035523824, 1e-9);
check("CMP weight-80 best out is weighted", cmp80.bestOut === "weighted");
check("CMP weight-80 lowest impact is NOT the biggest payer", cmp80.lowestImpact === "stableswap" && cmp80.bestOut !== cmp80.lowestImpact);
const cmp20 = app.curveCompare("1000", "1000", "20", "100", "100", 25);
near("CMP weight-20 weighted spot", cmp20.weighted.spotPrice, 0.25, 1e-12);
near("CMP weight-20 weighted out", cmp20.weighted.out, 23.4904220956106, 1e-9);
check("CMP weight-20 best out is stableswap", cmp20.bestOut === "stableswap");

/* parameter isolation: amp moves only the stable leg, weight only the weighted leg */
const cmpA1 = app.curveCompare("1000", "1000", "50", "1", "100", 25);
const cmpA5000 = app.curveCompare("1000", "1000", "50", "5000", "100", 25);
check("CMP amp leaves CP and weighted legs untouched", cmpA1.constantProduct.out === cmp.constantProduct.out && cmpA1.weighted.out === cmp.weighted.out && cmpA5000.constantProduct.out === cmp.constantProduct.out);
check("CMP stable out rises with amp at balanced reserves", cmpA1.stableswap.out < cmp.stableswap.out && cmp.stableswap.out < cmpA5000.stableswap.out);
near("CMP amp-1 stable out", cmpA1.stableswap.out, 95.00061912364265, 1e-9);
near("CMP amp-5000 stable out", cmpA5000.stableswap.out, 99.74799043868325, 1e-9);
check("CMP weight leaves CP and stable legs untouched", cmp80.constantProduct.out === cmp.constantProduct.out && cmp80.stableswap.out === cmp.stableswap.out);

/* zero fee, huge trade, dust (CP leg keeps tool 1's 9 dp flooring) */
const cmpF0 = app.curveCompare("1000", "1000", "50", "100", "100", 0);
near("CMP zero-fee CP out", cmpF0.constantProduct.out, 90.909090909, 1e-9);
near("CMP zero-fee stable out", cmpF0.stableswap.out, 99.90011086475852, 1e-9);
const cmpHuge = app.curveCompare("1000", "1000", "50", "100", "100000", 25);
check("CMP huge trade priced on all curves", cmpHuge !== null && cmpHuge.constantProduct.priceImpactPct > 99 && cmpHuge.stableswap.priceImpactPct > 99 && cmpHuge.bestOut === "stableswap");
const cmpDust = app.curveCompare("1000", "1000", "50", "100", "0.000001", 25);
check("CMP dust CP leg floored by tool 1 verbatim", cmpDust.constantProduct.out === 0.000000996);
near("CMP dust weighted out", cmpDust.weighted.out, 9.97499999004994e-7, 1e-15);

/* rejections: blanks, junk, bad ranges, and any single leg rejecting */
check("CMP rejects blank and junk", app.curveCompare("", "1000", "50", "100", "100", 25) === null &&
  app.curveCompare("1000", "1000", "50", "100", "abc", 25) === null &&
  app.curveCompare("1000", "1000", " ", "100", "100", 25) === null);
check("CMP rejects non-positive inputs", app.curveCompare("0", "1000", "50", "100", "100", 25) === null &&
  app.curveCompare("1000", "-5", "50", "100", "100", 25) === null &&
  app.curveCompare("1000", "1000", "50", "100", "0", 25) === null &&
  app.curveCompare("1000", "1000", "50", "0", "100", 25) === null);
check("CMP rejects weight at the edges", app.curveCompare("1000", "1000", "0", "100", "100", 25) === null &&
  app.curveCompare("1000", "1000", "100", "100", "100", 25) === null);
check("CMP rejects bad fee", app.curveCompare("1000", "1000", "50", "100", "100", -1) === null &&
  app.curveCompare("1000", "1000", "50", "100", "100", 10000) === null &&
  app.curveCompare("1000", "1000", "50", "100", "100", 25.5) === null);
check("CMP rejects inputs tool 1 cannot parse", app.curveCompare("1000", "1000", "50", "100", "0.0000000001", 25) === null &&
  app.curveCompare("1e3", "1000", "50", "100", "100", 25) === null);
check("CMP null when the CP leg alone rejects (fee floors the input to zero)",
  app.cpSwap("1000", "1000", "0.000000001", 9999) === null &&
  app.weightedSwap("1000", "1000", "50", "0.000000001", 9999) !== null &&
  app.curveCompare("1000", "1000", "50", "100", "0.000000001", 9999) === null);
check("CMP legs priced by the source tools", appSrc.includes("var cp = cpSwap(") && appSrc.includes("var wt = weightedSwap(") && appSrc.includes("var st = stableSwap("));
check("all cmp controls labelled",
  ["cmp-rin", "cmp-rout", "cmp-weight", "cmp-amp", "cmp-ain", "cmp-fee", "cmp-out"]
    .every(id => html.includes(`for="${id}"`)));
check("cmp tool present in index.html", html.includes('id="curve-calc"') && html.includes('id="curve-result"'));
check("curve handler wired to its own form", appSrc.includes('getElementById("curve-calc")') && appSrc.includes('getElementById("curve-result")'));
check("cmp honesty: own-spot and not-live labels", html.includes("each curve sets its own spot") && html.includes("not live pool data") && html.includes("not financial advice"));
check("guide covers curve comparison", guide.includes("Compare curves by their impact, not their payout"));
check("README lists tool 67", readme.includes("67. **Curve comparison model**"));

/* ---------- Tool 68: Weighted-pool net return calculator (WNET) ---------- */
const wn80 = app.weightedNetReturn("80", "2", "1000", "0");
near("WNET w80 hold value = Tool 60 verbatim", wn80.holdValue, 1800, 1e-9);
near("WNET w80 LP value = Tool 60 verbatim", wn80.lpValue, 1741.1011265922482, 1e-9);
near("WNET w80 hurdle", wn80.feesNeeded, 58.89887340775181, 1e-9);
near("WNET w80 IL pct = Tool 60", wn80.ilPct, -3.2721596337639935, 1e-9);
near("WNET w80 no-fees net vs hold", wn80.netVsHold, -58.89887340775181, 1e-9);
near("WNET w80 net vs hold pct", wn80.netVsHoldPct, -3.2721596337639896, 1e-9);
near("WNET w80 up on deposit yet behind holding", wn80.netReturnPct, 74.11011265922481, 1e-9);
check("WNET w80 verdict behind, coverage 0", wn80.verdict === "behind" && wn80.feesCoveragePct === 0 && wn80.netReturnPct > 0);
const wn20 = app.weightedNetReturn("20", "2", "1000", "0");
near("WNET w20 hurdle", wn20.feesNeeded, 51.30164500296519, 1e-9);
near("WNET w20 IL pct", wn20.ilPct, -4.275137083580427, 1e-9);
const wn10 = app.weightedNetReturn("10", "4", "1000", "0");
near("WNET w10 4x hurdle", wn10.feesNeeded, 151.30164500296496, 1e-9);
near("WNET w10 4x hold value", wn10.holdValue, 1300, 1e-9);
const wnMirror = app.weightedNetReturn("20", "0.5", "1000", "0");
near("WNET mirror move carries the identical IL", wnMirror.ilPct, wn80.ilPct, 1e-12);
const wnHur = app.weightedImpermanentLoss("80", "2", "1000");
const wnEven = app.weightedNetReturn("80", "2", "1000", String(wnHur.feesNeeded));
check("WNET fees = Tool 60 hurdle settles even", wnEven.verdict === "even" && Math.abs(wnEven.netVsHold) < 1e-6);
near("WNET even coverage is 100%", wnEven.feesCoveragePct, 100, 1e-6);
const wn2x = app.weightedNetReturn("80", "2", "1000", String(2 * wnHur.feesNeeded));
near("WNET double-hurdle coverage is 200%", wn2x.feesCoveragePct, 200, 1e-6);
near("WNET double-hurdle net vs hold is the hurdle", wn2x.netVsHold, wnHur.feesNeeded, 1e-6);
check("WNET double-hurdle verdict ahead", wn2x.verdict === "ahead");
const wnFlat0 = app.weightedNetReturn("80", "1", "1000", "0");
check("WNET flat move, no fees: even, coverage null", wnFlat0.verdict === "even" && wnFlat0.feesNeeded === 0 && wnFlat0.feesCoveragePct === null);
const wnFlat = app.weightedNetReturn("80", "1", "1000", "50");
check("WNET flat move, $50 fees: ahead by the fees", wnFlat.verdict === "ahead" && wnFlat.netVsHold === 50 && wnFlat.netReturnPct === 5);
/* at a 50% weight the settlement is Tool 24's exactly */
[[2, 0], [2, 200], [4, 500], [0.5, 10], [1, 50], [0.25, 0]].forEach(function (pair) {
  const w = app.weightedNetReturn("50", String(pair[0]), "1000", String(pair[1]));
  const n = app.netLpReturn(pair[0], "1000", String(pair[1]));
  check("WNET at 50% equals Tool 24 @" + pair[0] + "x fees " + pair[1],
    w !== null && n !== null && w.holdValue === n.holdValue && w.lpValue === n.lpValue &&
    w.feesNeeded === n.feesNeeded && w.netVsHold === n.netVsHold && w.verdict === n.verdict);
});
/* composition: every WNET figure must equal Tool 60's own values */
[["80", "2"], ["20", "2"], ["10", "4"], ["65", "0.4"], ["35", "3"]].forEach(function (pair) {
  const w = app.weightedNetReturn(pair[0], pair[1], "1000", "7.5");
  const wil = app.weightedImpermanentLoss(pair[0], pair[1], "1000");
  check("WNET composes Tool 60 @" + pair[0] + "% " + pair[1] + "x",
    w !== null && wil !== null && w.holdValue === wil.holdValue && w.lpValue === wil.lpValue &&
    w.feesNeeded === wil.feesNeeded && w.ilPct === wil.ilPct && Math.abs(w.netVsHold - (7.5 - wil.feesNeeded)) < 1e-9);
});
const wnMore = app.weightedNetReturn("80", "2", "1000", "100000");
check("WNET fees don't move hold/LP/hurdle", wnMore.holdValue === wn80.holdValue && wnMore.lpValue === wn80.lpValue && wnMore.feesNeeded === wn80.feesNeeded && wnMore.verdict === "ahead");
check("WNET rejects weight at the edges", app.weightedNetReturn("0", "2", "1000", "10") === null && app.weightedNetReturn("100", "2", "1000", "10") === null && app.weightedNetReturn("-5", "2", "1000", "10") === null);
check("WNET rejects bad price multiple", app.weightedNetReturn("80", "0", "1000", "10") === null && app.weightedNetReturn("80", "-2", "1000", "10") === null && app.weightedNetReturn("80", "x", "1000", "10") === null);
check("WNET rejects bad deposit", app.weightedNetReturn("80", "2", "0", "10") === null && app.weightedNetReturn("80", "2", "", "10") === null && app.weightedNetReturn("80", "2", "abc", "10") === null && app.weightedNetReturn("80", "2", null, "10") === null);
check("WNET rejects bad fees", app.weightedNetReturn("80", "2", "1000", "-1") === null && app.weightedNetReturn("80", "2", "1000", "xyz") === null && app.weightedNetReturn("80", "2", "1000", "") === null && app.weightedNetReturn("80", "2", "1000", null) === null);
check("WNET rejects blank weight and ratio", app.weightedNetReturn("", "2", "1000", "10") === null && app.weightedNetReturn("80", " ", "1000", "10") === null);
check("WNET settles via tool 60 in source", appSrc.includes("var wil = weightedImpermanentLoss("));
check("all wnet controls labelled",
  ["wnet-weight", "wnet-ratio", "wnet-deposit", "wnet-fees", "wnet-out"]
    .every(id => html.includes(`for="${id}"`)));
check("wnet tool present in index.html", html.includes('id="wnet-calc"') && html.includes('id="wnet-result"'));
check("wnet handler wired to its own form", appSrc.includes('getElementById("wnet-calc")') && appSrc.includes('getElementById("wnet-result")'));
check("wnet honesty: bet-not-shield and not-live labels", html.includes("it is a bet, not a shield") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers weighted net return", guide.includes("Settle a weighted position against holding, not against its deposit"));
check("README lists tool 68", readme.includes("68. **Weighted-pool net return calculator**"));


/* ---------- Tool 69: Stableswap net return calculator (SNET) ---------- */
const sn1 = app.stableNetReturn("1000", "1000", "100", "0.9", "10", "0");
near("SNET headline deposit at starting spot", sn1.depositValueA, 200, 1e-9);
near("SNET headline hold value = Tool 61 pro-rata", sn1.holdValueA, 190, 1e-9);
near("SNET headline LP value = Tool 61 pro-rata", sn1.lpValueA, 183.57243343067023, 1e-9);
near("SNET headline hurdle", sn1.feesNeeded, 6.42756656932977, 1e-9);
near("SNET headline loss pct = Tool 61 verbatim", sn1.lossPct, -3.3829297733314667, 1e-12);
near("SNET headline no-fees net vs hold", sn1.netVsHoldA, -6.42756656932977, 1e-9);
near("SNET headline net return vs deposit splits from vs-hold", sn1.netReturnPct, -8.213783284664885, 1e-9);
check("SNET headline verdict behind, coverage 0", sn1.verdict === "behind" && sn1.feesCoveragePct === 0 && sn1.netReturnPct < sn1.netVsHoldPct);
const snEven = app.stableNetReturn("1000", "1000", "100", "0.9", "10", String(sn1.feesNeeded));
check("SNET fees = hurdle settles even with holding", snEven.verdict === "even" && Math.abs(snEven.netVsHoldA) < 1e-6);
near("SNET even coverage is 100%", snEven.feesCoveragePct, 100, 1e-6);
near("SNET even-with-holding is still -5% vs deposit (holding fell too)", snEven.netReturnPct, -5, 1e-6);
const sn2x = app.stableNetReturn("1000", "1000", "100", "0.9", "10", String(2 * sn1.feesNeeded));
check("SNET double-hurdle verdict ahead, coverage 200%", sn2x.verdict === "ahead" && Math.abs(sn2x.feesCoveragePct - 200) < 1e-6 && Math.abs(sn2x.netVsHoldA - sn1.feesNeeded) < 1e-6);
const snPeg0 = app.stableNetReturn("1000", "1000", "100", "1", "10", "0");
check("SNET peg holds, no fees: even, hurdle 0, coverage null", snPeg0.verdict === "even" && snPeg0.feesNeeded === 0 && snPeg0.feesCoveragePct === null && snPeg0.depositValueA === 200);
const snPeg = app.stableNetReturn("1000", "1000", "100", "1", "10", "5");
check("SNET peg holds, 5 A fees: ahead by the fees, +2.5% on deposit", snPeg.verdict === "ahead" && snPeg.netVsHoldA === 5 && snPeg.netReturnPct === 2.5);
const snUp = app.stableNetReturn("1000", "1000", "100", "1.1", "10", "0");
near("SNET price above spot hold value", snUp.holdValueA, 210, 1e-9);
near("SNET price above spot hurdle (reverse drain)", snUp.feesNeeded, 6.268172217424308, 1e-9);
check("SNET price above spot: up on deposit yet behind holding", snUp.netReturnPct > 0 && snUp.verdict === "behind");
near("SNET hurdle grows with amp: A1", app.stableNetReturn("1000", "1000", "1", "0.9", "10", "0").feesNeeded, 0.5252347737445859, 1e-9);
near("SNET hurdle grows with amp: A5000", app.stableNetReturn("1000", "1000", "5000", "0.9", "10", "0").feesNeeded, 9.41392304348372, 1e-9);
/* composition: every SNET figure must equal Tool 61's own values pro-rata */
for (const combo of [["1000", "1000", "100", "0.9", "10"], ["1000", "1000", "1", "0.95", "25"], ["1000", "500", "100", "0.9", "20"], ["2000", "1000", "50", "1.05", "5"], ["500", "1500", "5000", "0.8", "100"], ["1000", "1000", "100", "1.1", "33.5"]]) {
  const s = app.stableNetReturn(combo[0], combo[1], combo[2], combo[3], combo[4], "7.5");
  const d = app.stableDepegLoss(combo[0], combo[1], combo[2], combo[3]);
  const sh = Number(combo[4]) / 100;
  check("SNET composes Tool 61 @" + combo.join("/"),
    s !== null && d !== null &&
    Math.abs(s.holdValueA - sh * d.holdValueA) < 1e-9 &&
    Math.abs(s.lpValueA - sh * d.lpValueA) < 1e-9 &&
    Math.abs(s.feesNeeded - sh * (d.holdValueA - d.lpValueA)) < 1e-9 &&
    Math.abs(s.lossPct - d.lossPct) < 1e-12 &&
    Math.abs(s.depositValueA - sh * (d.reserveA + d.startSpotB * d.reserveB)) < 1e-9 &&
    Math.abs(s.netLpValueA - (s.lpValueA + 7.5)) < 1e-12);
}
const sn25 = app.stableNetReturn("1000", "1000", "100", "0.9", "25", "0");
near("SNET hurdle scales linearly with share", sn25.feesNeeded, 2.5 * sn1.feesNeeded, 1e-9);
near("SNET loss pct is share-invariant", sn25.lossPct, sn1.lossPct, 1e-12);
const sn100 = app.stableNetReturn("1000", "1000", "100", "0.9", "100", "0");
near("SNET 100% share equals Tool 61 whole-pool LP value", sn100.lpValueA, app.stableDepegLoss("1000", "1000", "100", "0.9").lpValueA, 1e-9);
const snMore = app.stableNetReturn("1000", "1000", "100", "0.9", "10", "100000");
check("SNET fees don't move hold/LP/hurdle", snMore.holdValueA === sn1.holdValueA && snMore.lpValueA === sn1.lpValueA && snMore.feesNeeded === sn1.feesNeeded && snMore.verdict === "ahead");
check("SNET rejects share at/over the edges", app.stableNetReturn("1000", "1000", "100", "0.9", "0", "0") === null && app.stableNetReturn("1000", "1000", "100", "0.9", "101", "0") === null && app.stableNetReturn("1000", "1000", "100", "0.9", "-5", "0") === null);
check("SNET rejects bad share and fees", app.stableNetReturn("1000", "1000", "100", "0.9", "", "0") === null && app.stableNetReturn("1000", "1000", "100", "0.9", null, "0") === null && app.stableNetReturn("1000", "1000", "100", "0.9", "10", "-1") === null && app.stableNetReturn("1000", "1000", "100", "0.9", "10", "xyz") === null && app.stableNetReturn("1000", "1000", "100", "0.9", "10", "") === null && app.stableNetReturn("1000", "1000", "100", "0.9", "10", null) === null);
check("SNET rejects bad pool inputs via Tool 61", app.stableNetReturn("0", "1000", "100", "0.9", "10", "0") === null && app.stableNetReturn("1000", "1000", "0", "0.9", "10", "0") === null && app.stableNetReturn("1000", "1000", "100", "0", "10", "0") === null && app.stableNetReturn("1000", "1000", "100", "", "10", "0") === null);
check("SNET settles via tool 61 in source", appSrc.includes("var dep = stableDepegLoss("));
check("all snet controls labelled",
  ["snet-ra", "snet-rb", "snet-amp", "snet-price", "snet-share", "snet-fees", "snet-out"]
    .every(id => html.includes(`for="${id}"`)));
check("snet tool present in index.html", html.includes('id="snet-calc"') && html.includes('id="snet-result"'));
check("snet handler wired to its own form", appSrc.includes('getElementById("snet-calc")') && appSrc.includes('getElementById("snet-result")'));
check("snet honesty: split baselines and not-live labels", html.includes("fees that cover the hurdle still leave it down against the deposit") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers stableswap net return", guide.includes("Settle a stable position against holding AND against its deposit"));
check("README lists tool 69", readme.includes("69. **Stableswap net return calculator**"));

/* ---------- 70 · Weighted-pool required-volume planner (WREQ) ---------- */
const wrv = app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, "30");
check("WREQ headline exists", wrv !== null && wrv.feasible === true);
near("WREQ headline hurdle is Tool 60's (80% weight, 2x)", wrv.feesNeeded, 58.898873, 1e-6);
near("WREQ headline hurdle matches Tool 68's $58.90", wrv.feesNeeded, app.weightedNetReturn("80", "2", "1000", "0").feesNeeded, 1e-12);
near("WREQ headline IL", wrv.ilPct, -3.27216, 1e-5);
near("WREQ headline required fees/day", wrv.requiredFeesPerDay, 1.963296, 1e-6);
near("WREQ headline required pool fees/day", wrv.requiredPoolFeesPerDay, 19.632958, 1e-6);
near("WREQ headline required volume/day", wrv.requiredVolumePerDay, 7853.183121, 1e-4);
near("WREQ share is Tool 3's", wrv.sharePct, app.lpFees("1", 25, "1000", "10000").sharePct, 1e-12);
/* Round-trip: Tool 3 at the reported volume earns the hurdle in exactly the days allowed */
{
  const rt = app.lpFees(String(wrv.requiredVolumePerDay), 25, "1000", "10000");
  near("WREQ round-trip via Tool 3 earns hurdle in the days", rt.dailyFees * 30, wrv.feesNeeded, 1e-6);
}
/* At a 50% weight this IS Tool 32 verbatim on every shared field */
{
  const w50 = app.weightedRequiredVolume("50", "2", "1000", "1000", "10000", 25, "30");
  const c32 = app.cpRequiredVolume("2", "1000", "1000", "10000", 25, "30");
  check("WREQ at 50% weight equals Tool 32 verbatim",
    w50.feesNeeded === c32.feesNeeded && w50.ilPct === c32.ilPct && w50.holdValue === c32.holdValue &&
    w50.lpValue === c32.lpValue && w50.sharePct === c32.sharePct && w50.requiredFeesPerDay === c32.requiredFeesPerDay &&
    w50.requiredPoolFeesPerDay === c32.requiredPoolFeesPerDay && w50.requiredVolumePerDay === c32.requiredVolumePerDay &&
    w50.feasible === c32.feasible);
}
/* Composition sweep: hurdle is Tool 60 verbatim; Tool 3 at reported volume earns it in the days */
for (const [w, r, dep, your, tvl, fee, days] of [
  ["80", "2", "1000", "1000", "10000", 25, "30"],
  ["20", "0.5", "1000", "1000", "10000", 25, "30"],
  ["10", "4", "1000", "500", "10000", 25, "10"],
  ["90", "1.5", "2500", "250", "50000", 100, "7"],
  ["35", "0.25", "750", "750", "3000", 5, "90"],
  ["65", "3", "10000", "2000", "8000", 30, "14"]
]) {
  const x = app.weightedRequiredVolume(w, r, dep, your, tvl, fee, days);
  const wil = app.weightedImpermanentLoss(w, r, dep);
  const est = app.lpFees(String(x.requiredVolumePerDay), fee, your, tvl);
  check(`WREQ sweep w${w} r${r} composes Tools 60+3`,
    x !== null && x.feasible === true &&
    Math.abs(x.feesNeeded - wil.feesNeeded) < 1e-9 &&
    Math.abs(x.holdValue - wil.holdValue) < 1e-9 &&
    Math.abs(est.dailyFees * Number(days) - x.feesNeeded) < 1e-6 &&
    Math.abs(x.requiredPoolFeesPerDay - x.requiredFeesPerDay / (x.sharePct / 100)) < 1e-9);
}
/* The hurdle is NOT monotonic in the weight (hold minus LP, both move with w):
   at 2x it peaks at 50% among round weights; at 4x the worst IL% sits near a
   39% weight (analytic argmin (3/ln4 - 1)/3 = 38.80%) */
{
  const h = (w, r) => app.weightedRequiredVolume(w, r, "1000", "1000", "10000", 25, "30");
  near("WREQ hurdle at 10% weight, 2x", h("10", "2").feesNeeded, 28.2265, 1e-4);
  near("WREQ hurdle at 90% weight, 2x", h("90", "2").feesNeeded, 33.9340, 1e-4);
  check("WREQ hurdle at 2x is higher at 50% than at either edge weight",
    h("50", "2").feesNeeded > h("10", "2").feesNeeded && h("50", "2").feesNeeded > h("90", "2").feesNeeded);
  near("WREQ 10% weight at 4x needs $151.3016 per $1,000 (Tool 68's figure)", h("10", "4").feesNeeded, 151.301645, 1e-6);
  near("WREQ hurdle at 90% weight, 4x", h("90", "4").feesNeeded, 217.7977, 1e-4);
  near("WREQ IL% at a 30% weight, 4x (a value, NOT the worst)", h("30", "4").ilPct, -20.2254, 1e-3);
  {
    let worstW = null, worstIl = Infinity;
    for (let w10 = 1; w10 < 1000; w10++) {
      const r = h(String(w10 / 10), "4");
      if (r.ilPct < worstIl) { worstIl = r.ilPct; worstW = w10 / 10; }
    }
    check("WREQ worst IL% at 4x sits near a 39% weight, not at 50%",
      Math.abs(worstW - 38.8) < 0.2 && Math.abs(worstIl - -20.8698) < 1e-3 &&
      worstIl < h("50", "4").ilPct && worstIl < h("30", "4").ilPct);
  }
}
/* Mirror symmetry: (w, r) and (100-w, 1/r) carry the same IL% and the same
   hurdle as a share of hold value — the $ hurdle itself scales with hold value */
{
  const a = app.weightedRequiredVolume("80", "0.5", "1000", "1000", "10000", 25, "30");
  const b = app.weightedRequiredVolume("20", "2", "1000", "1000", "10000", 25, "30");
  near("WREQ mirror IL", a.ilPct, b.ilPct, 1e-9);
  near("WREQ mirror hurdle per hold value", a.feesNeeded / a.holdValue, b.feesNeeded / b.holdValue, 1e-12);
  near("WREQ mirror $ hurdle scales with hold value", a.feesNeeded * b.holdValue, b.feesNeeded * a.holdValue, 1e-6);
  near("WREQ down-move hurdle (80%, 0.5x)", app.weightedRequiredVolume("80", "0.5", "1000", "1000", "10000", 25, "30").feesNeeded, 25.650823, 1e-6);
}
/* Honest edges: no move -> honestly 0, even at a zero fee tier; hurdle at zero fee tier -> not feasible */
{
  const nm = app.weightedRequiredVolume("80", "1", "1000", "1000", "10000", 25, "30");
  check("WREQ no move needs no volume", nm.feasible === true && nm.requiredVolumePerDay === 0 && nm.requiredPoolFeesPerDay === 0 && nm.feesNeeded <= 1e-12);
  const nm0 = app.weightedRequiredVolume("80", "1", "1000", "1000", "10000", 0, "30");
  check("WREQ no move at zero fee tier still honestly 0", nm0.feasible === true && nm0.requiredVolumePerDay === 0);
  const zf = app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 0, "30");
  check("WREQ zero fee tier with a hurdle is not feasible", zf.feasible === false && zf.requiredVolumePerDay === Infinity && Math.abs(zf.requiredPoolFeesPerDay - 19.632958) < 1e-6);
}
/* Days scale the required volume inversely */
near("WREQ doubling the days halves the volume",
  app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, "60").requiredVolumePerDay * 2,
  wrv.requiredVolumePerDay, 1e-6);
check("WREQ rejects bad weights via Tool 60", app.weightedRequiredVolume("0", "2", "1000", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("100", "2", "1000", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("", "2", "1000", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("abc", "2", "1000", "1000", "10000", 25, "30") === null);
check("WREQ rejects bad ratio/deposit", app.weightedRequiredVolume("80", "0", "1000", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("80", "-2", "1000", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("80", "2", "0", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("80", "2", "", "1000", "10000", 25, "30") === null && app.weightedRequiredVolume("80", "2", null, "1000", "10000", 25, "30") === null);
check("WREQ rejects bad share/fee via Tool 3", app.weightedRequiredVolume("80", "2", "1000", "20000", "10000", 25, "30") === null && app.weightedRequiredVolume("80", "2", "1000", "0", "10000", 25, "30") === null && app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 10001, "30") === null && app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 2.5, "30") === null);
check("WREQ rejects bad days", app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, "") === null && app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, "0") === null && app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, "-3") === null && app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, null) === null);
check("WREQ composes Tools 60+3 in source", appSrc.includes("var wil = weightedImpermanentLoss(") && appSrc.includes("var est = lpFees(\"1\", feeBps, yourStr, tvlStr);"));
check("all wrv controls labelled",
  ["wrv-weight", "wrv-ratio", "wrv-deposit", "wrv-your", "wrv-tvl", "wrv-fee", "wrv-days", "wrv-out"]
    .every(id => html.includes(`for="${id}"`)));
check("wrv tool present in index.html", html.includes('id="wrv-calc"') && html.includes('id="wrv-result"'));
check("wrv handler wired to its own form", appSrc.includes('getElementById("wrv-calc")') && appSrc.includes('getElementById("wrv-result")'));
check("wrv honesty: bet-not-shield and not-live labels", html.includes("Weighting is a bet, not a shield") && html.includes("not a volume forecast, not financial advice"));
check("guide covers weighted required volume", guide.includes("the weight sets the hurdle before volume enters it"));
check("README lists tool 70", readme.includes("70. **Weighted-pool required-volume planner**"));

/* ---------- 71 · Stableswap required-volume planner ---------- */
const srv = app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, "30");
check("SRV headline feasible", srv !== null && srv.feasible === true);
near("SRV headline hurdle (Tool 69's figure)", srv.feesNeeded, 6.42756656932977, 1e-9);
near("SRV headline hold value", srv.holdValueA, 190, 1e-9);
near("SRV headline LP value", srv.lpValueA, 183.57243343067023, 1e-9);
near("SRV headline deposit value", srv.depositValueA, 200, 1e-9);
near("SRV headline loss % (Tool 61's figure)", srv.lossPct, -3.3829297733314667, 1e-9);
near("SRV headline required volume per day", srv.requiredVolumePerDay, 857.0088759106359, 1e-6);
near("SRV headline required pool fees per day", srv.requiredPoolFeesPerDay, 2.1425221897765896, 1e-9);
near("SRV headline your fees per day", srv.requiredFeesPerDay, 0.21425221897765898, 1e-12);
/* Composition: the hurdle is Tools 61/69 verbatim, and Tool 69 fed the
   reported volume's fees settles exactly even with holding */
{
  const combos = [
    ["1000", "1000", "100", "0.9", "10", 25, "30"],
    ["1000", "1000", "1", "0.9", "10", 25, "30"],
    ["1000", "1000", "5000", "0.9", "25", 100, "7"],
    ["1000", "500", "100", "0.9", "10", 25, "30"],
    ["2000", "1000", "50", "1.05", "40", 5, "90"],
    ["500", "2000", "200", "0.95", "5", 250, "365"]
  ];
  for (const [ra, rb, A, p, s, fee, d] of combos) {
    const r = app.stableRequiredVolume(ra, rb, A, p, s, fee, d);
    const dep = app.stableDepegLoss(ra, rb, A, p);
    const snet = app.stableNetReturn(ra, rb, A, p, s, "0");
    check("SRV hurdle = Tool 69 verbatim @A" + A + "/p" + p + "/s" + s, r !== null && snet !== null && r.feesNeeded === snet.feesNeeded);
    near("SRV hurdle = share x Tool 61 @A" + A + "/p" + p + "/s" + s, r.feesNeeded, (Number(s) / 100) * (dep.holdValueA - dep.lpValueA), 1e-9);
    const earned = r.requiredVolumePerDay * (fee / 10000) * (Number(s) / 100) * Number(d);
    near("SRV reported volume earns the hurdle @A" + A + "/p" + p + "/s" + s, earned, r.feesNeeded, 1e-6);
    const settle = app.stableNetReturn(ra, rb, A, p, s, String(earned));
    check("SRV Tool 69 settles even on the reported volume @A" + A + "/p" + p + "/s" + s, settle !== null && settle.verdict === "even" && Math.abs(settle.netVsHoldA) <= 1e-9 * Math.max(1, settle.holdValueA));
  }
}
/* Amplification ordering: a higher A defends par longer, so the hurdle
   — and with it the required volume — grows with A */
near("SRV volume at A=1", app.stableRequiredVolume("1000", "1000", "1", "0.9", "10", 25, "30").requiredVolumePerDay, 70.03130316594479, 1e-6);
near("SRV volume at A=5000", app.stableRequiredVolume("1000", "1000", "5000", "0.9", "10", 25, "30").requiredVolumePerDay, 1255.1897391311625, 1e-6);
check("SRV required volume grows with amplification",
  app.stableRequiredVolume("1000", "1000", "1", "0.9", "10", 25, "30").requiredVolumePerDay <
  srv.requiredVolumePerDay &&
  srv.requiredVolumePerDay <
  app.stableRequiredVolume("1000", "1000", "5000", "0.9", "10", 25, "30").requiredVolumePerDay);
/* Share invariance: the required POOL volume does not depend on your
   share — the hurdle slice and the fee slice scale together — while
   the fees you must personally earn scale with the share */
{
  const vols = ["5", "10", "25", "100"].map(s => app.stableRequiredVolume("1000", "1000", "100", "0.9", s, 25, "30").requiredVolumePerDay);
  check("SRV required pool volume is share-invariant", vols.every(v => Math.abs(v - vols[1]) <= 1e-6));
  near("SRV your fees per day scale with share (100% = 10x 10%)",
    app.stableRequiredVolume("1000", "1000", "100", "0.9", "100", 25, "30").requiredFeesPerDay,
    srv.requiredFeesPerDay * 10, 1e-9);
}
/* A price above the starting spot drains the other way, same shape */
near("SRV up-move hurdle (Tool 69's figure)", app.stableRequiredVolume("1000", "1000", "100", "1.1", "10", 25, "30").feesNeeded, 6.268172217424308, 1e-9);
near("SRV up-move volume", app.stableRequiredVolume("1000", "1000", "100", "1.1", "10", 25, "30").requiredVolumePerDay, 835.7562956565744, 1e-6);
near("SRV lopsided-pool volume", app.stableRequiredVolume("1000", "500", "100", "0.9", "10", 25, "30").requiredVolumePerDay, 987.4287378894943, 1e-6);
/* Honest edges: peg holds -> honestly 0, even at a zero fee tier;
   hurdle at zero fee tier -> not feasible */
{
  const peg = app.stableRequiredVolume("1000", "1000", "100", "1", "10", 25, "30");
  check("SRV peg holds needs no volume", peg.feasible === true && peg.requiredVolumePerDay === 0 && peg.requiredPoolFeesPerDay === 0 && peg.feesNeeded <= 1e-9);
  const peg0 = app.stableRequiredVolume("1000", "1000", "100", "1", "10", 0, "30");
  check("SRV peg holds at zero fee tier still honestly 0", peg0.feasible === true && peg0.requiredVolumePerDay === 0);
  const zf = app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 0, "30");
  check("SRV zero fee tier with a hurdle is not feasible", zf.feasible === false && zf.requiredVolumePerDay === Infinity && Math.abs(zf.requiredPoolFeesPerDay - 2.1425221897765896) < 1e-9);
}
/* Days scale the required volume inversely */
near("SRV doubling the days halves the volume",
  app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, "60").requiredVolumePerDay * 2,
  srv.requiredVolumePerDay, 1e-6);
check("SRV rejects bad reserves/amp/price via Tool 61", app.stableRequiredVolume("0", "1000", "100", "0.9", "10", 25, "30") === null && app.stableRequiredVolume("1000", "", "100", "0.9", "10", 25, "30") === null && app.stableRequiredVolume("1000", "1000", "0", "0.9", "10", 25, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0", "10", 25, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "-0.9", "10", 25, "30") === null);
check("SRV rejects bad share", app.stableRequiredVolume("1000", "1000", "100", "0.9", "0", 25, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "101", 25, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "", 25, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "abc", 25, "30") === null);
check("SRV rejects bad fee tier", app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 2.5, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", -1, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 10001, "30") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", "", "30") === null);
check("SRV rejects bad days", app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, "") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, "0") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, "-3") === null && app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, null) === null);
check("SRV composes Tool 61 in source", appSrc.includes("var dep = stableDepegLoss(reserveAStr, reserveBStr, ampStr, priceBStr);"));
check("all srv controls labelled",
  ["srv-ra", "srv-rb", "srv-amp", "srv-price", "srv-share", "srv-fee", "srv-days", "srv-out"]
    .every(id => html.includes(`for="${id}"`)));
check("srv tool present in index.html", html.includes('id="srv-calc"') && html.includes('id="srv-result"'));
check("srv handler wired to its own form", appSrc.includes('getElementById("srv-calc")') && appSrc.includes('getElementById("srv-result")'));
check("srv honesty: amplification-hurdle and not-live labels", html.includes("amplification sets the hurdle before volume enters it") && html.includes("not a volume forecast, not financial advice"));
check("guide covers stableswap required volume", guide.includes("the amplification sets the hurdle before volume enters it"));
check("README lists tool 71", readme.includes("71. **Stableswap required-volume planner**"));

/* ---------- 72 · Weighted-pool break-even days calculator ---------- */
const wbed = app.weightedBreakEvenDays("80", "2", "1000", "10000", 25, "1000", "10000");
check("WBED headline exists", wbed !== null);
near("WBED headline hurdle (Tool 60's figure)", wbed.feesNeeded, 58.89887340783126, 1e-9);
near("WBED headline hold value", wbed.holdValue, 1800, 1e-9);
near("WBED headline LP value", wbed.lpValue, 1741.1011265921687, 1e-9);
near("WBED headline IL % (Tool 60's figure)", wbed.ilPct, -3.272159633761127, 1e-9);
near("WBED headline daily fees (Tool 3's figure)", wbed.dailyFees, 2.5, 1e-12);
near("WBED headline days", wbed.daysToBreakEven, 23.559549363132504, 1e-9);
check("WBED headline weights/share/fee reported", wbed.weightAPct === 80 && wbed.weightBPct === 20 && wbed.sharePct === 10 && wbed.feeBps === 25 && wbed.feePct === 0.25);
/* Composition: hurdle = Tool 60 verbatim and daily fees = Tool 3 verbatim
   across a sweep, so days can never drift from the source tools */
{
  const combos = [
    ["80", "2", "1000", "10000", 25, "1000", "10000"],
    ["20", "0.5", "1000", "10000", 25, "1000", "10000"],
    ["10", "4", "1000", "50000", 100, "5000", "20000"],
    ["90", "0.25", "2500", "7777", 30, "1234", "9876"],
    ["35", "1.5", "500", "123456", 5, "999", "100000"],
    ["65", "3", "10000", "0", 25, "1000", "10000"]
  ];
  for (const [w, r, dep, vol, fee, your, tvl] of combos) {
    const x = app.weightedBreakEvenDays(w, r, dep, vol, fee, your, tvl);
    const wil = app.weightedImpermanentLoss(w, r, dep);
    const est = app.lpFees(vol, fee, your, tvl);
    check("WBED composes Tools 60+3 @" + w + "/" + r + "/" + vol, x !== null && wil !== null && est !== null &&
      x.feesNeeded === wil.feesNeeded && x.holdValue === wil.holdValue && x.lpValue === wil.lpValue &&
      x.dailyFees === est.dailyFees && x.sharePct === est.sharePct);
    if (x !== null && est !== null && est.dailyFees > 0) {
      near("WBED days = hurdle / daily fees @" + w + "/" + r + "/" + vol, x.daysToBreakEven * est.dailyFees, wil.feesNeeded, 1e-6);
    }
  }
}
/* At a 50% weight every shared figure equals Tool 40's cpBreakEvenDays
   exactly — the 50/50 weighted pool IS Tool 40's pool */
{
  const combos = [[2, "1000", "10000"], [0.5, "1000", "10000"], [4, "2500", "77777"], [1.5, "500", "12345"], [3, "100", "999999"], [0.25, "10000", "5000"]];
  for (const [r, dep, vol] of combos) {
    const x = app.weightedBreakEvenDays("50", String(r), dep, vol, 25, "1000", "10000");
    const cp = app.cpBreakEvenDays(r, dep, vol, 25, "1000", "10000");
    check("WBED @50% = Tool 40 verbatim @r" + r, x !== null && cp !== null &&
      x.feesNeeded === cp.feesNeeded && x.holdValue === cp.holdValue && x.lpValue === cp.lpValue &&
      x.ilPct === cp.ilPct && x.dailyFees === cp.dailyFees && x.daysToBreakEven === cp.daysToBreakEven);
  }
}
/* Exact inverse of Tool 70: feeding its required volume for a target
   day count back through this calculator returns that count */
{
  for (const days of ["1", "7", "30", "90", "365"]) {
    const wrv = app.weightedRequiredVolume("80", "2", "1000", "1000", "10000", 25, days);
    const back = app.weightedBreakEvenDays("80", "2", "1000", String(wrv.requiredVolumePerDay), 25, "1000", "10000");
    near("WBED inverts Tool 70 @" + days + "d", back.daysToBreakEven, Number(days), 1e-6);
  }
}
/* Mirror: (w, r) vs (100-w, 1/r) — identical IL %, hurdle scaled by
   hold value, so the mirror breaks even in proportionally fewer days */
{
  const a = app.weightedBreakEvenDays("80", "2", "1000", "10000", 25, "1000", "10000");
  const b = app.weightedBreakEvenDays("20", "0.5", "1000", "10000", 25, "1000", "10000");
  near("WBED mirror IL", a.ilPct, b.ilPct, 1e-9);
  near("WBED mirror hurdle is half (hold 1800 vs 900)", b.feesNeeded, a.feesNeeded / 2, 1e-9);
  near("WBED mirror days are half", b.daysToBreakEven, a.daysToBreakEven / 2, 1e-9);
  near("WBED w10 @4x days", app.weightedBreakEvenDays("10", "4", "1000", "10000", 25, "1000", "10000").daysToBreakEven, 60.520658001, 1e-6);
}
/* Scaling: doubling volume or share halves the days */
near("WBED doubling volume halves days",
  app.weightedBreakEvenDays("80", "2", "1000", "20000", 25, "1000", "10000").daysToBreakEven * 2, wbed.daysToBreakEven, 1e-9);
near("WBED doubling share halves days",
  app.weightedBreakEvenDays("80", "2", "1000", "10000", 25, "2000", "10000").daysToBreakEven * 2, wbed.daysToBreakEven, 1e-9);
/* Honest edges: no move -> honestly 0 even at zero fee/volume; real
   hurdle with no daily fees -> Infinity, never a made-up count */
check("WBED no move is 0 days", app.weightedBreakEvenDays("80", "1", "1000", "10000", 25, "1000", "10000").daysToBreakEven === 0);
check("WBED no move at zero fee and zero volume is still 0", app.weightedBreakEvenDays("80", "1", "1000", "0", 0, "1000", "10000").daysToBreakEven === 0);
check("WBED real hurdle with zero volume never breaks even", app.weightedBreakEvenDays("80", "2", "1000", "0", 25, "1000", "10000").daysToBreakEven === Infinity);
check("WBED real hurdle with zero fee tier never breaks even", app.weightedBreakEvenDays("80", "2", "1000", "10000", 0, "1000", "10000").daysToBreakEven === Infinity);
check("WBED rejects bad weights via Tool 60", app.weightedBreakEvenDays("0", "2", "1000", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("100", "2", "1000", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("", "2", "1000", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("abc", "2", "1000", "10000", 25, "1000", "10000") === null);
check("WBED rejects bad ratio/deposit", app.weightedBreakEvenDays("80", "0", "1000", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("80", "-2", "1000", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", "0", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", "", "10000", 25, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", null, "10000", 25, "1000", "10000") === null);
check("WBED rejects bad volume/share/fee via Tool 3", app.weightedBreakEvenDays("80", "2", "1000", "-1", 25, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", "1000", "", 25, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", "1000", "10000", 25, "20000", "10000") === null && app.weightedBreakEvenDays("80", "2", "1000", "10000", 25, "0", "10000") === null && app.weightedBreakEvenDays("80", "2", "1000", "10000", 10001, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", "1000", "10000", 25.5, "1000", "10000") === null && app.weightedBreakEvenDays("80", "2", "1000", "10000", "", "1000", "10000") === null);
check("WBED composes Tools 60+3 in source", appSrc.includes("var wil = weightedImpermanentLoss(weightAPctStr, priceRatioStr, depositStr);") && appSrc.includes("var est = lpFees(volumeStr, feeBps, yourStr, tvlStr);"));
check("all wbed controls labelled",
  ["wbed-weight", "wbed-ratio", "wbed-deposit", "wbed-volume", "wbed-your", "wbed-tvl", "wbed-fee", "wbed-out"]
    .every(id => html.includes(`for="${id}"`)));
check("wbed tool present in index.html", html.includes('id="wbed-calc"') && html.includes('id="wbed-result"'));
check("wbed handler wired to its own form", appSrc.includes('getElementById("wbed-calc")') && appSrc.includes('getElementById("wbed-result")'));
check("wbed honesty: mirror-half and not-live labels", html.includes("breaks even in half the days") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers weighted break-even days", guide.includes("the weight sets the hurdle before the days are counted"));
check("README lists tool 72", readme.includes("72. **Weighted-pool break-even days calculator**"));

/* ---------- 73 · Stableswap break-even days calculator ---------- */
const sbed = app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "10000", 25);
check("SBED headline exists", sbed !== null);
near("SBED headline hurdle (Tool 69's figure)", sbed.feesNeeded, 6.42756656932977, 1e-9);
near("SBED headline hold value (10% of Tool 61's)", sbed.holdValueA, 190, 1e-9);
near("SBED headline LP value (10% of Tool 61's)", sbed.lpValueA, 183.57243343067023, 1e-9);
near("SBED headline deposit value", sbed.depositValueA, 200, 1e-9);
near("SBED headline loss % (Tool 61's figure)", sbed.lossPct, -3.3829297733314667, 1e-9);
near("SBED headline daily fees", sbed.dailyFees, 2.5, 1e-12);
near("SBED headline days", sbed.daysToBreakEven, 2.571026627731908, 1e-9);
check("SBED headline share/fee reported", sbed.sharePct === 10 && sbed.feeBps === 25 && sbed.feePct === 0.25);
/* Composition: hurdle = Tool 61's shortfall pro-rata = Tool 69's
   feesNeeded verbatim, across a sweep, so days can never drift */
{
  const combos = [
    ["1000", "1000", "100", "0.9", "10", "10000", 25],
    ["1000", "1000", "1", "0.9", "25", "5000", 30],
    ["1000", "1000", "5000", "0.95", "5", "7777", 100],
    ["2000", "500", "50", "0.85", "20", "5000", 30],
    ["500", "1500", "200", "1.1", "50", "123456", 5],
    ["1000", "1000", "100", "1.1", "10", "10000", 25],
    ["750", "1250", "10", "0.8", "100", "999", 0]
  ];
  for (const [ra, rb, amp, price, share, vol, fee] of combos) {
    const x = app.stableBreakEvenDays(ra, rb, amp, price, share, vol, fee);
    const dep = app.stableDepegLoss(ra, rb, amp, price);
    const snet = app.stableNetReturn(ra, rb, amp, price, share, "0");
    check("SBED composes Tools 61+69 @" + amp + "/" + price + "/" + share, x !== null && dep !== null && snet !== null &&
      x.feesNeeded === snet.feesNeeded && x.holdValueA === snet.holdValueA && x.lpValueA === snet.lpValueA &&
      x.lossPct === dep.lossPct && x.newReserveA === dep.newReserveA && x.newReserveB === dep.newReserveB);
    if (x !== null && x.dailyFees > 0) {
      near("SBED days = hurdle / daily fees @" + amp + "/" + price + "/" + share, x.daysToBreakEven * x.dailyFees, x.feesNeeded, 1e-6);
    }
  }
}
/* Exact inverse of Tool 71: feeding its required volume for a target
   day count back through this calculator returns that count */
{
  for (const days of ["1", "7", "30", "90", "365"]) {
    const srv = app.stableRequiredVolume("1000", "1000", "100", "0.9", "10", 25, days);
    const back = app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", String(srv.requiredVolumePerDay), 25);
    near("SBED inverts Tool 71 @" + days + "d", back.daysToBreakEven, Number(days), 1e-6);
  }
}
/* Tool 69 settles exactly even when fed the fees this count earns */
{
  const earned = sbed.dailyFees * sbed.daysToBreakEven;
  const settled = app.stableNetReturn("1000", "1000", "100", "0.9", "10", String(earned));
  check("SBED fees over the count settle Tool 69 even", settled !== null && settled.verdict === "even");
  near("SBED earned fees = hurdle", earned, sbed.feesNeeded, 1e-9);
}
/* Share invariance: hurdle and daily fees both scale with the share,
   so the day count is identical at every share */
{
  let first = null;
  for (const s of ["5", "10", "25", "100"]) {
    const x = app.stableBreakEvenDays("1000", "1000", "100", "0.9", s, "10000", 25);
    if (first === null) first = x;
    near("SBED days share-invariant @" + s + "%", x.daysToBreakEven, first.daysToBreakEven, 1e-9);
    near("SBED hurdle scales with share @" + s + "%", x.feesNeeded, first.feesNeeded * (Number(s) / 5), 1e-9);
  }
}
/* Amplification ordering: a higher A defends par longer, drains
   further, and so takes more days at the same rate */
near("SBED days at A=1", app.stableBreakEvenDays("1000", "1000", "1", "0.9", "10", "10000", 25).daysToBreakEven, 0.21009390949783438, 1e-9);
near("SBED days at A=5000", app.stableBreakEvenDays("1000", "1000", "5000", "0.9", "10", "10000", 25).daysToBreakEven, 3.7655692173934883, 1e-9);
check("SBED days grow with amplification",
  app.stableBreakEvenDays("1000", "1000", "1", "0.9", "10", "10000", 25).daysToBreakEven <
  sbed.daysToBreakEven &&
  sbed.daysToBreakEven <
  app.stableBreakEvenDays("1000", "1000", "5000", "0.9", "10", "10000", 25).daysToBreakEven);
/* Depeg severity ordering and the reverse drain above the spot */
check("SBED days grow with depeg severity",
  app.stableBreakEvenDays("1000", "1000", "100", "0.99", "10", "10000", 25).daysToBreakEven <
  app.stableBreakEvenDays("1000", "1000", "100", "0.95", "10", "10000", 25).daysToBreakEven &&
  app.stableBreakEvenDays("1000", "1000", "100", "0.95", "10", "10000", 25).daysToBreakEven <
  app.stableBreakEvenDays("1000", "1000", "100", "0.8", "10", "10000", 25).daysToBreakEven);
near("SBED reverse drain hurdle @1.1", app.stableBreakEvenDays("1000", "1000", "100", "1.1", "10", "10000", 25).feesNeeded, 6.268172217424308, 1e-9);
near("SBED reverse drain days @1.1", app.stableBreakEvenDays("1000", "1000", "100", "1.1", "10", "10000", 25).daysToBreakEven, 2.5072688869697233, 1e-9);
/* Scaling: doubling volume halves the days */
near("SBED doubling volume halves days",
  app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "20000", 25).daysToBreakEven * 2, sbed.daysToBreakEven, 1e-9);
/* Honest edges: peg holds -> honestly 0 even at zero fee/volume; real
   hurdle with no daily fees -> Infinity, never a made-up count */
check("SBED peg holds is 0 days", app.stableBreakEvenDays("1000", "1000", "100", "1", "10", "10000", 25).daysToBreakEven === 0);
check("SBED peg holds at zero fee and zero volume is still 0", app.stableBreakEvenDays("1000", "1000", "100", "1", "10", "0", 0).daysToBreakEven === 0);
check("SBED real hurdle with zero volume never breaks even", app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "0", 25).daysToBreakEven === Infinity);
check("SBED real hurdle with zero fee tier never breaks even", app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "10000", 0).daysToBreakEven === Infinity);
check("SBED rejects bad reserves/amp/price via Tool 61", app.stableBreakEvenDays("0", "1000", "100", "0.9", "10", "10000", 25) === null && app.stableBreakEvenDays("1000", "", "100", "0.9", "10", "10000", 25) === null && app.stableBreakEvenDays("1000", "1000", "0", "0.9", "10", "10000", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0", "10", "10000", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "-0.9", "10", "10000", 25) === null);
check("SBED rejects bad share", app.stableBreakEvenDays("1000", "1000", "100", "0.9", "0", "10000", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "101", "10000", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "", "10000", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "abc", "10000", 25) === null);
check("SBED rejects bad volume", app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "-1", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "abc", 25) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", null, 25) === null);
check("SBED rejects bad fee tier", app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "10000", 2.5) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "10000", -1) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "10000", 10001) === null && app.stableBreakEvenDays("1000", "1000", "100", "0.9", "10", "10000", "") === null);
check("SBED composes Tool 61 in source", appSrc.includes("function stableBreakEvenDays") && appSrc.includes("var dailyFees = volume * (fee / 10000) * share;"));
check("all sbed controls labelled",
  ["sbed-ra", "sbed-rb", "sbed-amp", "sbed-price", "sbed-share", "sbed-volume", "sbed-fee", "sbed-out"]
    .every(id => html.includes(`for="${id}"`)));
check("sbed tool present in index.html", html.includes('id="sbed-calc"') && html.includes('id="sbed-result"'));
check("sbed handler wired to its own form", appSrc.includes('getElementById("sbed-calc")') && appSrc.includes('getElementById("sbed-result")'));
check("sbed honesty: share-invariance and not-live labels", html.includes("the day count does not depend on your share") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers stableswap break-even days", guide.includes("the amplification sets the hurdle before the days are counted"));
check("README lists tool 73", readme.includes("73. **Stableswap break-even days calculator**"));


/* ---------- 74 · Curve comparison exact-out model ---------- */
/* Every leg is the source exact-out tool verbatim: tool 6's
   cpSwapExactOut (input string parsed back), tool 63's
   weightedSwapExactOut and tool 59's stableSwapExactOut. Headline
   vectors were computed in a clean foreground prototype before
   being written. */
const ccx = app.curveCompareExactOut("1000", "1000", "50", "100", "100", 25);
check("CCX headline non-null", ccx !== null);
near("CCX headline CP in", ccx.constantProduct.in, 111.389585075, 1e-9);
near("CCX headline CP spot", ccx.constantProduct.spotPrice, 1, 1e-12);
near("CCX headline CP impact", ccx.constantProduct.priceImpactPct, 10.225000000970697, 1e-6);
near("CCX headline weighted in", ccx.weighted.in, 111.3895850737956, 1e-9);
near("CCX 50/50 weighted leg is the CP leg", ccx.weighted.in, ccx.constantProduct.in, 1e-6);
near("CCX headline weighted spot", ccx.weighted.spotPrice, 1, 1e-12);
near("CCX headline stable in", ccx.stableswap.in, 100.35096849591363, 1e-9);
near("CCX headline stable spot", ccx.stableswap.spotPrice, 1, 1e-12);
near("CCX headline stable impact", ccx.stableswap.priceImpactPct, 0.3497410151332314, 1e-9);
check("CCX headline cheapest in is stableswap", ccx.cheapestIn === "stableswap");
near("CCX headline cheapest amount", ccx.cheapestInAmount, 100.35096849591363, 1e-9);
check("CCX headline lowest impact is stableswap", ccx.lowestImpact === "stableswap");
near("CCX headline in spread", ccx.inSpread, 111.389585075 - 100.35096849591363, 1e-6);

/* leg-for-leg equality with the source tools across a sweep */
for (const [rin, rout, w, amp, aout, fee] of [
  ["1000", "1000", "80", "100", "100", 25],
  ["1000", "1000", "20", "100", "100", 25],
  ["1000", "4000", "50", "100", "100", 25],
  ["5000", "2500", "35", "100", "250", 10],
  ["1000", "1000", "50", "1", "100", 25],
  ["1000", "1000", "50", "5000", "100", 0],
  ["2000", "500", "65", "20", "37.5", 100],
  ["1000", "500", "50", "100", "50", 25]
]) {
  const c = app.curveCompareExactOut(rin, rout, w, amp, aout, fee);
  const cp6 = app.cpSwapExactOut(rin, rout, aout, fee);
  const wt63 = app.weightedSwapExactOut(rin, rout, w, aout, fee);
  const st59 = app.stableSwapExactOut(rin, rout, amp, aout, fee);
  const tag = `CCX legs verbatim ${rin}/${rout} w${w} A${amp} out${aout} fee${fee}`;
  check(tag + " non-null", c !== null && cp6 !== null && wt63 !== null && st59 !== null);
  check(tag + " CP", c.constantProduct.in === Number(cp6.amountIn) && c.constantProduct.spotPrice === cp6.spotPrice && c.constantProduct.priceImpactPct === cp6.priceImpactPct);
  check(tag + " weighted", c.weighted.in === wt63.amountIn && c.weighted.spotPrice === wt63.spotPrice && c.weighted.priceImpactPct === wt63.priceImpactPct);
  check(tag + " stable", c.stableswap.in === st59.amountIn && c.stableswap.spotPrice === st59.spotPrice && c.stableswap.priceImpactPct === st59.priceImpactPct);
  check(tag + " cheapest consistent", c.cheapestInAmount === Math.min(c.constantProduct.in, c.weighted.in, c.stableswap.in) && c[c.cheapestIn].in === c.cheapestInAmount);
  check(tag + " lowestImpact consistent", c.lowestImpactPct === Math.min(c.constantProduct.priceImpactPct, c.weighted.priceImpactPct, c.stableswap.priceImpactPct) && c[c.lowestImpact].priceImpactPct === c.lowestImpactPct);
  /* round trip: each leg's gross input, fed through its own
     exact-in tool, returns the target */
  near(tag + " CP round-trips", Number(app.cpSwap(rin, rout, String(c.constantProduct.in), fee).out), Number(aout), 1e-6);
  near(tag + " weighted round-trips", app.weightedSwap(rin, rout, w, String(c.weighted.in), fee).out, Number(aout), 1e-6);
  near(tag + " stable round-trips", app.stableSwap(rin, rout, amp, String(c.stableswap.in), fee).out, Number(aout), 1e-6);
}

/* the honesty trap, reversed: at an 80% weight the weighted leg is
   the cheapest in raw input because its spot is 4, yet its impact
   is nowhere near the stableswap leg's — the two rankings split */
const ccx80 = app.curveCompareExactOut("1000", "1000", "80", "100", "100", 25);
near("CCX weight-80 weighted spot", ccx80.weighted.spotPrice, 4, 1e-9);
near("CCX weight-80 weighted in", ccx80.weighted.in, 26.756988551720266, 1e-9);
near("CCX weight-80 weighted impact", ccx80.weighted.priceImpactPct, 6.566465984481318, 1e-9);
check("CCX weight-80 cheapest in is weighted", ccx80.cheapestIn === "weighted");
check("CCX weight-80 lowest impact is NOT the cheapest", ccx80.lowestImpact === "stableswap" && ccx80.cheapestIn !== ccx80.lowestImpact);
const ccx20 = app.curveCompareExactOut("1000", "1000", "20", "100", "100", 25);
near("CCX weight-20 weighted spot", ccx20.weighted.spotPrice, 0.25, 1e-12);
near("CCX weight-20 weighted in", ccx20.weighted.in, 525.4715817130084, 1e-9);
check("CCX weight-20 cheapest in is stableswap", ccx20.cheapestIn === "stableswap");

/* parameter isolation: amp moves only the stable leg, weight only
   the weighted leg; the stable leg's cost falls as amp rises on
   balanced reserves */
const ccxA1 = app.curveCompareExactOut("1000", "1000", "50", "1", "100", 25);
const ccxA5000 = app.curveCompareExactOut("1000", "1000", "50", "5000", "100", 25);
check("CCX amp leaves CP and weighted legs untouched", ccxA1.constantProduct.in === ccx.constantProduct.in && ccxA1.weighted.in === ccx.weighted.in && ccxA5000.constantProduct.in === ccx.constantProduct.in);
near("CCX amp-1 stable in", ccxA1.stableswap.in, 105.54159520646438, 1e-9);
near("CCX amp-5000 stable in", ccxA5000.stableswap.in, 100.25265145971896, 1e-9);
check("CCX stable cost falls with amp at balanced reserves", ccxA1.stableswap.in > ccx.stableswap.in && ccx.stableswap.in > ccxA5000.stableswap.in);
check("CCX weight leaves CP and stable legs untouched", ccx80.constantProduct.in === ccx.constantProduct.in && ccx80.stableswap.in === ccx.stableswap.in);

/* zero fee, near-ceiling target, dust target */
const ccxF0 = app.curveCompareExactOut("1000", "1000", "50", "100", "100", 0);
near("CCX zero-fee CP in", ccxF0.constantProduct.in, 111.111111112, 1e-9);
near("CCX zero-fee stable in", ccxF0.stableswap.in, 100.10009107467386, 1e-9);
const ccx900 = app.curveCompareExactOut("1000", "1000", "50", "100", "900", 25);
near("CCX 900-out CP in", ccx900.constantProduct.in, 9022.556390978, 1e-6);
near("CCX 900-out stable in", ccx900.stableswap.in, 943.8660625266496, 1e-9);
check("CCX 900-out CP impact above 90%", ccx900.constantProduct.priceImpactPct > 90);
const ccxDust = app.curveCompareExactOut("1000", "1000", "50", "100", "0.001", 25);
near("CCX dust CP in", ccxDust.constantProduct.in, 0.001002509, 1e-12);
near("CCX dust stable in", ccxDust.stableswap.in, 0.0010025062757839415, 1e-12);

/* rejections: blanks, junk, bad ranges, the reserve ceiling, and
   any single leg rejecting */
check("CCX rejects blank and junk", app.curveCompareExactOut("", "1000", "50", "100", "100", 25) === null &&
  app.curveCompareExactOut("1000", "1000", "50", "100", "abc", 25) === null &&
  app.curveCompareExactOut("1000", "1000", " ", "100", "100", 25) === null);
check("CCX rejects non-positive inputs", app.curveCompareExactOut("0", "1000", "50", "100", "100", 25) === null &&
  app.curveCompareExactOut("1000", "-5", "50", "100", "100", 25) === null &&
  app.curveCompareExactOut("1000", "1000", "50", "100", "0", 25) === null &&
  app.curveCompareExactOut("1000", "1000", "50", "0", "100", 25) === null);
check("CCX rejects a target at or above the output reserve", app.curveCompareExactOut("1000", "1000", "50", "100", "1000", 25) === null &&
  app.curveCompareExactOut("1000", "1000", "50", "100", "1500", 25) === null);
check("CCX rejects weight at the edges", app.curveCompareExactOut("1000", "1000", "0", "100", "100", 25) === null &&
  app.curveCompareExactOut("1000", "1000", "100", "100", "100", 25) === null);
check("CCX rejects bad fee", app.curveCompareExactOut("1000", "1000", "50", "100", "100", -1) === null &&
  app.curveCompareExactOut("1000", "1000", "50", "100", "100", 10000) === null &&
  app.curveCompareExactOut("1000", "1000", "50", "100", "100", 25.5) === null);
check("CCX rejects inputs tool 6 cannot parse", app.curveCompareExactOut("1000", "1000", "50", "100", "0.0000000001", 25) === null &&
  app.curveCompareExactOut("1e3", "1000", "50", "100", "100", 25) === null);
check("CCX composes the three exact-out tools in source", appSrc.includes("function curveCompareExactOut") &&
  appSrc.includes("cpSwapExactOut(reserveInStr, reserveOutStr, amountOutStr, feeBps)") &&
  appSrc.includes("weightedSwapExactOut(reserveInStr, reserveOutStr, weightInPctStr, amountOutStr, feeBps)") &&
  appSrc.includes("stableSwapExactOut(reserveInStr, reserveOutStr, ampStr, amountOutStr, feeBps)"));
check("all ccx controls labelled",
  ["ccx-rin", "ccx-rout", "ccx-weight", "ccx-amp", "ccx-aout", "ccx-fee", "ccx-in"]
    .every(id => html.includes(`for="${id}"`)));
check("ccx tool present in index.html", html.includes('id="ccx-calc"') && html.includes('id="ccx-result"'));
check("ccx handler wired to its own form", appSrc.includes('getElementById("ccx-calc")') && appSrc.includes('getElementById("ccx-result")'));
check("ccx honesty: split rankings and not-live labels", html.includes("cheapest-in and lowest-impact name different curves") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers curve comparison exact-out", guide.includes("read the spot before ranking the cost"));
check("README lists tool 74", readme.includes("74. **Curve comparison exact-out model**"));


/* ---------- Tool 75: Weighted-pool IL tolerance band (WBAND) ---------- */
const wband = app.weightedIlBand("80", "1000", "50");
check("WBAND headline exists", wband !== null);
near("WBAND headline high edge", wband.priceRatioHigh, 1.9113813402601416, 1e-9);
near("WBAND headline low edge", wband.priceRatioLow, 0.34065281594534413, 1e-9);
near("WBAND headline move up %", wband.moveUpPct, 91.13813402601416, 1e-7);
near("WBAND headline move down %", wband.moveDownPct, 65.93471840546559, 1e-7);
near("WBAND headline max downside hurdle (B side's share)", wband.maxDownHurdle, 200, 1e-9);
near("WBAND headline fee % of deposit", wband.feePctOfDeposit, 5, 1e-12);
check("WBAND headline weights reported", wband.weightAPct === 80 && wband.weightBPct === 20 && wband.downUnbounded === false);
/* both edges are Tool 60's own hurdle equalling the fees fed in,
   across a weight / deposit / fee sweep */
for (const [w, d, f] of [[80, 1000, 50], [50, 1000, 50], [20, 1000, 50], [80, 1000, 10], [10, 1000, 100], [90, 500, 25], [35, 2000, 75], [65, 500, 5]]) {
  const x = app.weightedIlBand(String(w), String(d), String(f));
  check("WBAND band exists @" + w + "/" + d + "/" + f, x !== null && x.downUnbounded === false);
  near("WBAND Tool 60 hurdle at high edge @" + w + "/" + f, app.weightedImpermanentLoss(String(w), String(x.priceRatioHigh), String(d)).feesNeeded, f, 1e-6);
  near("WBAND Tool 60 hurdle at low edge @" + w + "/" + f, app.weightedImpermanentLoss(String(w), String(x.priceRatioLow), String(d)).feesNeeded, f, 1e-6);
  check("WBAND band straddles 1 @" + w + "/" + f, x.priceRatioLow < 1 && x.priceRatioHigh > 1);
}
/* at a 50% weight the band is Tool 21's closed form exactly */
for (const f of [10, 50, 100, 200, 499]) {
  const x = app.weightedIlBand("50", "1000", String(f));
  const t = app.ilToleranceBand("1000", String(f));
  near("WBAND equals Tool 21 high @fees " + f, x.priceRatioHigh, t.priceRatioHigh, 1e-9);
  near("WBAND equals Tool 21 low @fees " + f, x.priceRatioLow, t.priceRatioLow, 1e-6);
}
/* the band widens with the fees, on both sides */
{
  const small = app.weightedIlBand("80", "1000", "10"), big = app.weightedIlBand("80", "1000", "100");
  check("WBAND band widens with fees", big.priceRatioHigh > small.priceRatioHigh && big.priceRatioLow < small.priceRatioLow);
  near("WBAND small-fee high edge", small.priceRatioHigh, 1.3781451867380252, 1e-9);
  near("WBAND small-fee low edge", small.priceRatioLow, 0.6719309644575064, 1e-9);
}
/* scale-free: the band depends on fees/deposit and the weight only */
near("WBAND scale-free high", app.weightedIlBand("80", "250", "12.5").priceRatioHigh, wband.priceRatioHigh, 1e-9);
near("WBAND scale-free low", app.weightedIlBand("80", "250", "12.5").priceRatioLow, wband.priceRatioLow, 1e-9);
/* downside cap: fees at or above (1 - w) of the deposit cover any fall */
{
  const atCap = app.weightedIlBand("80", "1000", "200");
  check("WBAND down-unbounded at the cap (80% weight, $200)", atCap.downUnbounded === true && atCap.priceRatioLow === null && atCap.moveDownPct === null);
  near("WBAND unbounded high edge still solved", atCap.priceRatioHigh, 3.0517578124999987, 1e-9);
  check("WBAND down-unbounded above the cap", app.weightedIlBand("80", "1000", "250").downUnbounded === true);
  check("WBAND down-unbounded at the 20% weight cap ($800)", app.weightedIlBand("20", "1000", "800").downUnbounded === true);
  check("WBAND bounded just below the cap", app.weightedIlBand("80", "1000", "199").downUnbounded === false);
  near("WBAND max downside hurdle at 20% weight", app.weightedIlBand("20", "1000", "50").maxDownHurdle, 800, 1e-9);
}
/* zero fees collapse the band to exactly 1x */
{
  const zero = app.weightedIlBand("80", "1000", "0");
  check("WBAND zero fees collapse to 1x", zero.priceRatioHigh === 1 && zero.priceRatioLow === 1 && zero.moveUpPct === 0 && zero.moveDownPct === 0 && zero.downUnbounded === false);
}
/* rejections */
check("WBAND rejects blank and junk", app.weightedIlBand("", "1000", "50") === null && app.weightedIlBand("80", "1000", "abc") === null && app.weightedIlBand("80", " ", "50") === null);
check("WBAND rejects weight at the edges", app.weightedIlBand("0", "1000", "50") === null && app.weightedIlBand("100", "1000", "50") === null && app.weightedIlBand("-5", "1000", "50") === null);
check("WBAND rejects non-positive deposit", app.weightedIlBand("80", "0", "50") === null && app.weightedIlBand("80", "-100", "50") === null);
check("WBAND rejects negative fees", app.weightedIlBand("80", "1000", "-1") === null);
check("WBAND composes Tool 60 in source", appSrc.includes("function weightedIlBand") && appSrc.includes("weightedImpermanentLoss(weightAPctStr, String(r), depositStr)"));
check("all wband controls labelled",
  ["wband-weight", "wband-deposit", "wband-fees", "wband-out"]
    .every(id => html.includes(`for="${id}"`)));
check("wband tool present in index.html", html.includes('id="wband-calc"') && html.includes('id="wband-result"'));
check("wband handler wired to its own form", appSrc.includes('getElementById("wband-calc")') && appSrc.includes('getElementById("wband-result")'));
check("wband honesty: downside cap and not-live labels", html.includes("fees at or above that share cover any fall at all") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers weighted IL tolerance band", guide.includes("the downside hurdle is capped, the upside hurdle is not"));
check("README lists tool 75", readme.includes("75. **Weighted-pool IL tolerance band**"));

/* ---------- Tool 76: Stableswap IL tolerance band (SBAND) ---------- */
const sband = app.stableIlBand("1000", "1000", "100", "64.275666");
check("SBAND headline exists", sband !== null);
near("SBAND headline low edge is Tool 61's 0.90 depeg", sband.priceLow, 0.9, 1e-9);
near("SBAND headline high edge", sband.priceHigh, 1.1020394288840254, 1e-9);
near("SBAND headline move up %", sband.moveUpPct, 10.20394288840254, 1e-7);
near("SBAND headline move down %", sband.moveDownPct, 10.000000037947954, 1e-7);
near("SBAND headline starting spot", sband.startSpotB, 1, 1e-12);
near("SBAND headline pool value at spot", sband.poolValueA, 2000, 1e-9);
near("SBAND headline max downside hurdle (whole A reserve)", sband.maxDownHurdle, 1000, 1e-12);
near("SBAND headline max downside % of pool value", sband.maxDownHurdlePctOfPoolValue, 50, 1e-12);
near("SBAND headline fee % of pool value", sband.feePctOfPoolValue, 3.2137833, 1e-9);
check("SBAND headline bounded both sides", sband.downUnbounded === false && sband.amp === 100);
/* both edges are Tool 61's own loss equalling the fees fed in,
   across a reserve / amp / fee sweep */
for (const [ra, rb, a, f] of [["1000", "1000", "100", "50"], ["2000", "500", "20", "25"], ["500", "4000", "250", "80"], ["1000", "1000", "1", "5"], ["1000", "1000", "5000", "50"], ["1500", "500", "100", "50"], ["1000", "1000", "100", "900"], ["750", "1250", "75", "33.3"]]) {
  const x = app.stableIlBand(ra, rb, a, f);
  check("SBAND band exists @" + ra + "/" + rb + "/" + a + "/" + f, x !== null && x.downUnbounded === false);
  near("SBAND Tool 61 loss at low edge @" + ra + "/" + a + "/" + f, app.stableDepegLoss(ra, rb, a, String(x.priceLow)).lossA, -Number(f), 1e-6);
  near("SBAND Tool 61 loss at high edge @" + ra + "/" + a + "/" + f, app.stableDepegLoss(ra, rb, a, String(x.priceHigh)).lossA, -Number(f), 1e-6);
  check("SBAND band straddles the starting spot @" + ra + "/" + a + "/" + f, x.priceLow < x.startSpotB && x.priceHigh > x.startSpotB);
  near("SBAND starting spot is Tool 61's @" + ra + "/" + rb + "/" + a, x.startSpotB, app.stableDepegLoss(ra, rb, a, "1").startSpotB, 1e-12);
}
/* the A = 1 headline: Tool 61's 0.90 loss there is 5.252348 A */
near("SBAND A=1 low edge is the 0.90 depeg", app.stableIlBand("1000", "1000", "1", "5.252348").priceLow, 0.9, 1e-8);
/* the band narrows as the amplification rises, at fixed fees */
{
  const a1 = app.stableIlBand("1000", "1000", "1", "50");
  const a100 = app.stableIlBand("1000", "1000", "100", "50");
  const a5000 = app.stableIlBand("1000", "1000", "5000", "50");
  check("SBAND band narrows with amplification", a1.priceLow < a100.priceLow && a100.priceLow < a5000.priceLow && a1.priceHigh > a100.priceHigh && a100.priceHigh > a5000.priceHigh);
  near("SBAND A=1 low @fees 50", a1.priceLow, 0.7050523962995258, 1e-9);
  near("SBAND A=1 high @fees 50", a1.priceHigh, 1.3450008787110614, 1e-9);
  near("SBAND A=5000 low @fees 50", a5000.priceLow, 0.9456076894760878, 1e-9);
  near("SBAND A=5000 high @fees 50", a5000.priceHigh, 1.0545182599477672, 1e-9);
}
/* the band widens with the fees, on both sides */
{
  const small = app.stableIlBand("1000", "1000", "100", "10"), big = app.stableIlBand("1000", "1000", "100", "100");
  check("SBAND band widens with fees", big.priceHigh > small.priceHigh && big.priceLow < small.priceLow);
  near("SBAND small-fee low edge", small.priceLow, 0.9743236309868707, 1e-9);
  near("SBAND small-fee high edge", small.priceHigh, 1.025899141143307, 1e-9);
}
/* scale-free: scaling reserves and fees together keeps the band */
near("SBAND scale-free low", app.stableIlBand("10000", "10000", "100", "642.75666").priceLow, sband.priceLow, 1e-9);
near("SBAND scale-free high", app.stableIlBand("10000", "10000", "100", "642.75666").priceHigh, sband.priceHigh, 1e-9);
/* unbalanced pool: the band is centred on its own spot, not on 1 */
{
  const un = app.stableIlBand("1500", "500", "100", "50");
  near("SBAND unbalanced starting spot", un.startSpotB, 1.0175352411985896, 1e-12);
  near("SBAND unbalanced low edge", un.priceLow, 0.9534466057851216, 1e-9);
  near("SBAND unbalanced high edge", un.priceHigh, 1.2061639612641997, 1e-9);
  near("SBAND unbalanced max downside hurdle", un.maxDownHurdle, 1500, 1e-12);
}
/* downside cap: fees at or above the whole A reserve cover any fall */
{
  const atCap = app.stableIlBand("1000", "1000", "100", "1000");
  check("SBAND down-unbounded at the cap (fees = A reserve)", atCap.downUnbounded === true && atCap.priceLow === null && atCap.moveDownPct === null);
  near("SBAND unbounded high edge still solved", atCap.priceHigh, 2.1409933057124215, 1e-9);
  check("SBAND down-unbounded above the cap", app.stableIlBand("1000", "1000", "100", "1500").downUnbounded === true);
  check("SBAND bounded just below the cap", app.stableIlBand("1000", "1000", "100", "900").downUnbounded === false);
  near("SBAND near-cap low edge", app.stableIlBand("1000", "1000", "100", "900").priceLow, 0.06714889173897744, 1e-9);
}
/* zero fees collapse the band to exactly the starting spot */
{
  const zero = app.stableIlBand("1000", "1000", "100", "0");
  check("SBAND zero fees collapse to the spot", zero.priceHigh === 1 && zero.priceLow === 1 && zero.moveUpPct === 0 && zero.moveDownPct === 0 && zero.downUnbounded === false);
  const zeroUn = app.stableIlBand("1500", "500", "100", "0");
  check("SBAND zero fees collapse to an unbalanced spot", zeroUn.priceHigh === zeroUn.startSpotB && zeroUn.priceLow === zeroUn.startSpotB);
}
/* rejections */
check("SBAND rejects blank and junk", app.stableIlBand("", "1000", "100", "50") === null && app.stableIlBand("1000", "1000", "100", "abc") === null && app.stableIlBand("1000", " ", "100", "50") === null);
check("SBAND rejects non-positive reserves and amp", app.stableIlBand("0", "1000", "100", "50") === null && app.stableIlBand("1000", "-5", "100", "50") === null && app.stableIlBand("1000", "1000", "0", "50") === null && app.stableIlBand("1000", "1000", "-100", "50") === null);
check("SBAND rejects negative fees", app.stableIlBand("1000", "1000", "100", "-1") === null);
check("SBAND composes Tool 61 in source", appSrc.includes("function stableIlBand") && appSrc.includes("stableDepegLoss(reserveAStr, reserveBStr, ampStr, String(p))"));
check("all sband controls labelled",
  ["sband-ra", "sband-rb", "sband-amp", "sband-fees", "sband-out"]
    .every(id => html.includes(`for="${id}"`)));
check("sband tool present in index.html", html.includes('id="sband-calc"') && html.includes('id="sband-result"'));
check("sband handler wired to its own form", appSrc.includes('getElementById("sband-calc")') && appSrc.includes('getElementById("sband-result")'));
check("sband honesty: downside cap and not-live labels", html.includes("fees at or above that reserve cover any fall at all") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers stableswap IL tolerance band", guide.includes("the whole token A reserve is the most a fall can cost"));
check("README lists tool 76", readme.includes("76. **Stableswap IL tolerance band**"));

/* ---------- Tool 77: CLMM arbitrage (CARB) ---------- */
const carb = app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 0);
check("CARB headline exists", carb !== null);
check("CARB headline direction buy-a", carb.direction === "buy-a" && carb.inToken === "B" && carb.outToken === "A");
near("CARB headline net in is exactly 1000 B", carb.netIn, 1000, 1e-9);
near("CARB headline gross equals net at zero fee", carb.grossIn, 1000, 1e-9);
near("CARB headline amount out", carb.amountOut, 909.0909090909091, 1e-9);
near("CARB headline profit is exactly 100 B", carb.profitInB, 100, 1e-9);
near("CARB headline post-trade spot lands on the external price", carb.postTradeSpot, 1.21, 1e-12);
check("CARB headline not boundary-capped", carb.hitBoundary === false);
near("CARB headline gap pct", carb.priceGapPct, 21, 1e-9);
/* mirror: external 0.81 */
{
  const m = app.clmmArbitrage("10000", "0.5", "2", "1", "0.81", 0);
  check("CARB mirror direction sell-a", m.direction === "sell-a" && m.inToken === "A" && m.outToken === "B");
  near("CARB mirror net in", m.netIn, 1111.1111111111111, 1e-9);
  near("CARB mirror amount out is exactly 1000 B", m.amountOut, 1000, 1e-9);
  near("CARB mirror profit is exactly 100 B", m.profitInB, 100, 1e-9);
  near("CARB mirror post-trade spot", m.postTradeSpot, 0.81, 1e-12);
}
/* composition: the gross input through Tool 42 returns the output and lands on the price */
for (const [L, lo, up, p, pe, fee] of [
  ["10000", "0.5", "2", "1", "1.21", 0], ["10000", "0.5", "2", "1", "0.81", 0],
  ["10000", "0.5", "2", "1", "1.21", 25], ["10000", "0.5", "2", "1", "0.81", 25],
  ["5000", "0.8", "1.25", "1.1", "1.2", 5], ["20000", "0.25", "4", "0.9", "0.6", 100],
  ["10000", "0.5", "2", "1", "3", 0], ["10000", "0.5", "2", "1", "0.4", 30]
]) {
  const r = app.clmmArbitrage(L, lo, up, p, pe, fee);
  const dir = r.direction === "buy-a" ? "ba" : "ab";
  const sw = app.clmmSwap(L, lo, up, p, String(r.grossIn), fee, dir);
  check(`CARB composes Tool 42 at pe=${pe} fee=${fee}`,
    sw !== null && Math.abs(sw.amountOut - r.amountOut) < 1e-6 &&
    Math.abs(sw.newPrice - r.postTradeSpot) < 1e-9);
}
/* range wall: an external price beyond the edge caps at the edge */
{
  const upWall = app.clmmArbitrage("10000", "0.5", "2", "1", "3", 0);
  check("CARB up-wall flagged", upWall.hitBoundary === true && upWall.postTradeSpot === 2 && upWall.targetPrice === 2);
  near("CARB up-wall profit valued at the external price", upWall.profitInB, 4644.660940672625, 1e-9);
  const dnWall = app.clmmArbitrage("10000", "0.5", "2", "1", "0.4", 0);
  check("CARB down-wall flagged", dnWall.hitBoundary === true && dnWall.postTradeSpot === 0.5 && dnWall.targetPrice === 0.5);
  check("CARB external price exactly at the edge is the wall", app.clmmArbitrage("10000", "0.5", "2", "1", "2", 0).hitBoundary === true);
}
/* fee: grossed up, profit reduced; a gap below the fee is honestly negative */
{
  const f = app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 25);
  near("CARB fee gross in", f.grossIn, 1002.5062656641604, 1e-9);
  near("CARB fee profit", f.profitInB, 97.49373433583901, 1e-9);
  check("CARB fee leaves net in unchanged", Math.abs(f.netIn - carb.netIn) < 1e-9 && f.amountOut === carb.amountOut);
  const tiny = app.clmmArbitrage("10000", "0.5", "2", "1", "1.0001", 25);
  check("CARB tiny gap at 25 bps is honestly unprofitable", tiny.profitInB < 0);
  near("CARB tiny gap profit", tiny.profitInB, -0.0012281027557469182, 1e-12);
}
/* no gap, and scale freedom */
{
  const none = app.clmmArbitrage("10000", "0.5", "2", "1", "1", 25);
  check("CARB no gap is direction none with zeros", none.direction === "none" && none.netIn === 0 && none.grossIn === 0 && none.amountOut === 0 && none.profitInB === 0 && none.postTradeSpot === 1);
  const big = app.clmmArbitrage("100000", "0.5", "2", "1", "1.21", 0);
  check("CARB 10x liquidity scales every amount 10x",
    Math.abs(big.netIn / carb.netIn - 10) < 1e-12 && Math.abs(big.amountOut / carb.amountOut - 10) < 1e-12 && Math.abs(big.profitInB / carb.profitInB - 10) < 1e-12);
}
/* rejections */
check("CARB rejects blank and junk", app.clmmArbitrage("", "0.5", "2", "1", "1.21", 0) === null && app.clmmArbitrage("10000", "0.5", "2", "1", "abc", 0) === null && app.clmmArbitrage("10000", " ", "2", "1", "1.21", 0) === null);
check("CARB rejects non-positive inputs", app.clmmArbitrage("0", "0.5", "2", "1", "1.21", 0) === null && app.clmmArbitrage("10000", "0.5", "2", "1", "0", 0) === null && app.clmmArbitrage("10000", "-0.5", "2", "1", "1.21", 0) === null);
check("CARB rejects inverted range and price outside it", app.clmmArbitrage("10000", "2", "0.5", "1", "1.21", 0) === null && app.clmmArbitrage("10000", "0.5", "2", "0.5", "1.21", 0) === null && app.clmmArbitrage("10000", "0.5", "2", "2", "1.21", 0) === null && app.clmmArbitrage("10000", "0.5", "2", "3", "1.21", 0) === null);
check("CARB rejects bad fee tiers", app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", -1) === null && app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 10000) === null && app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 2.5) === null);
check("CARB composes Tool 42 in source", appSrc.includes("function clmmArbitrage"));
check("all carb controls labelled",
  ["carb-l", "carb-lower", "carb-upper", "carb-price", "carb-ext", "carb-fee", "carb-out"]
    .every(id => html.includes(`for="${id}"`)));
check("carb tool present in index.html", html.includes('id="carb-calc"') && html.includes('id="carb-result"'));
check("carb handler wired to its own form", appSrc.includes('getElementById("carb-calc")') && appSrc.includes('getElementById("carb-result")'));
check("carb honesty: range wall and not-live labels", html.includes("an external price beyond the edge caps the trade there") && html.includes("not live pool data, not a found opportunity, not financial advice"));
check("guide covers CLMM arbitrage", guide.includes("respect the range wall"));
check("README lists tool 77", readme.includes("77. **CLMM arbitrage model**"));

/* ---------- Tool 78: CLMM price-impact sizer (CIS) ---------- */
const cis = app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 0, "ab");
check("CIS headline exists and is feasible", cis !== null && cis.feasible === true && cis.hitBoundary === false);
check("CIS headline tokens", cis.inToken === "A" && cis.outToken === "B" && cis.direction === "ab");
near("CIS headline max in is exactly 1111.1111", cis.maxAmountIn, 1111.1111111111111, 1e-9);
near("CIS headline net equals gross at zero fee", cis.netIn, 1111.1111111111111, 1e-9);
near("CIS headline amount out is exactly 1000", cis.amountOut, 1000, 1e-9);
near("CIS headline new price is exactly 0.81", cis.newPrice, 0.81, 1e-12);
near("CIS headline actual impact is the cap", cis.actualImpactPct, 10, 1e-9);
near("CIS headline boundary impact", cis.boundaryImpactPct, 29.28932188134524, 1e-9);
/* mirror direction on the log-symmetric range: same amounts, reciprocal price */
{
  const m = app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 0, "ba");
  check("CIS mirror tokens", m.inToken === "B" && m.outToken === "A");
  near("CIS mirror max in", m.maxAmountIn, 1111.1111111111111, 1e-9);
  near("CIS mirror amount out is exactly 1000", m.amountOut, 1000, 1e-9);
  near("CIS mirror new price", m.newPrice, 1.2345679012345678, 1e-12);
  check("CIS mirror spot is reciprocal", m.spotRate === 1 && cis.spotRate === 1);
}
/* composition: the sized gross input through Tool 42 lands on the cap, both directions */
for (const [L, lo, up, p, cap, fee, dir] of [
  ["10000", "0.5", "2", "1", "10", 0, "ab"], ["10000", "0.5", "2", "1", "10", 0, "ba"],
  ["10000", "0.5", "2", "1", "10", 25, "ab"], ["10000", "0.5", "2", "1", "10", 25, "ba"],
  ["947.2135954999577", "0.8", "1.25", "1", "5", 25, "ab"], ["947.2135954999577", "0.8", "1.25", "1", "5", 25, "ba"],
  ["5000", "0.25", "4", "1.5", "20", 100, "ab"], ["5000", "0.25", "4", "1.5", "1", 5, "ba"],
  ["2000", "90", "110", "100", "2", 30, "ab"], ["2000", "90", "110", "100", "2", 30, "ba"]
]) {
  const r = app.clmmImpactSizer(L, lo, up, p, cap, fee, dir);
  const sw = app.clmmSwap(L, lo, up, p, String(r.maxAmountIn), fee, dir);
  check(`CIS composes Tool 42 at cap=${cap} fee=${fee} dir=${dir}`,
    r.feasible === true && r.hitBoundary === false && sw !== null &&
    Math.abs(sw.priceImpactPct - Number(cap)) < 1e-7 &&
    Math.abs(sw.amountOut - r.amountOut) < 1e-6 &&
    Math.abs(sw.newPrice - r.newPrice) < 1e-9);
}
/* fee: net is the zero-fee shape at the adjusted sqrt multiple, gross is net grossed up */
{
  const f = app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 25, "ab");
  near("CIS fee gross in", f.maxAmountIn, 1086.0484544695078, 1e-9);
  near("CIS fee net in", f.netIn, 1083.333333333334, 1e-9);
  near("CIS fee amount out", f.amountOut, 977.4436090225569, 1e-9);
  near("CIS fee new price", f.newPrice, 0.814065238283679, 1e-12);
  near("CIS fee boundary impact rises with the fee", f.boundaryImpactPct, 29.466098576641876, 1e-9);
}
/* range wall: a cap at or above the ceiling impact sizes the range-emptying trade */
{
  const b = app.clmmImpactSizer("10000", "0.5", "2", "1", "50", 0, "ab");
  check("CIS boundary flagged", b.hitBoundary === true && b.feasible === true);
  near("CIS boundary max in empties the range", b.maxAmountIn, 4142.13562373095, 1e-9);
  near("CIS boundary amount out is the range's whole B holding", b.amountOut, 2928.9321881345245, 1e-9);
  near("CIS boundary actual impact is the ceiling, not the cap", b.actualImpactPct, 29.28932188134524, 1e-9);
  check("CIS boundary new price is the lower edge", Math.abs(b.newPrice - 0.5) < 1e-12);
  const bm = app.clmmImpactSizer("10000", "0.5", "2", "1", "50", 0, "ba");
  check("CIS mirror boundary lands on the upper edge", bm.hitBoundary === true && Math.abs(bm.newPrice - 2) < 1e-12);
  near("CIS mirror boundary amount out", bm.amountOut, 2928.9321881345254, 1e-9);
  check("CIS cap exactly at the ceiling is the boundary trade", app.clmmImpactSizer("10000", "0.5", "2", "1", "29.28932188134524", 0, "ab").hitBoundary === true);
  check("CIS cap just below the ceiling stays inside", app.clmmImpactSizer("10000", "0.5", "2", "1", "29", 0, "ab").hitBoundary === false);
}
/* fee floor: a cap at or below the fee admits no trade; just above it admits a small one */
{
  const inf = app.clmmImpactSizer("10000", "0.5", "2", "1", "0.25", 25, "ab");
  check("CIS cap equal to the fee is infeasible", inf.feasible === false && inf.maxAmountIn === 0 && inf.amountOut === 0 && inf.actualImpactPct === 0.25);
  check("CIS cap below the fee is infeasible", app.clmmImpactSizer("10000", "0.5", "2", "1", "0.1", 25, "ba").feasible === false);
  const just = app.clmmImpactSizer("10000", "0.5", "2", "1", "0.26", 25, "ab");
  check("CIS cap just above the fee is feasible", just.feasible === true && just.maxAmountIn > 0);
  near("CIS just-above-fee max in", just.maxAmountIn, 1.0051195765639593, 1e-9);
  check("CIS zero fee admits any positive cap", app.clmmImpactSizer("10000", "0.5", "2", "1", "0.01", 0, "ab").feasible === true);
}
/* scale freedom and monotonicity */
{
  const big = app.clmmImpactSizer("100000", "0.5", "2", "1", "10", 0, "ab");
  check("CIS 10x liquidity scales amounts 10x and keeps the price",
    Math.abs(big.maxAmountIn / cis.maxAmountIn - 10) < 1e-12 && Math.abs(big.amountOut / cis.amountOut - 10) < 1e-12 && big.newPrice === cis.newPrice);
  check("CIS a tighter cap admits a smaller trade",
    app.clmmImpactSizer("10000", "0.5", "2", "1", "5", 0, "ab").maxAmountIn < cis.maxAmountIn &&
    app.clmmImpactSizer("10000", "0.5", "2", "1", "20", 0, "ab").maxAmountIn > cis.maxAmountIn);
  check("CIS a higher fee admits a smaller trade at the same cap",
    app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 100, "ab").maxAmountIn < app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 25, "ab").maxAmountIn);
}
/* rejections */
check("CIS rejects blank and junk", app.clmmImpactSizer("", "0.5", "2", "1", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "abc", 0, "ab") === null && app.clmmImpactSizer("10000", " ", "2", "1", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 0, "") === null);
check("CIS rejects non-positive inputs", app.clmmImpactSizer("0", "0.5", "2", "1", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "-0.5", "2", "1", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "0", "10", 0, "ab") === null);
check("CIS rejects caps outside (0,100)", app.clmmImpactSizer("10000", "0.5", "2", "1", "0", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "100", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "-5", 0, "ab") === null);
check("CIS rejects inverted range, price outside it and bad direction", app.clmmImpactSizer("10000", "2", "0.5", "1", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "0.5", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "2", "10", 0, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 0, "xx") === null);
check("CIS rejects bad fee tiers", app.clmmImpactSizer("10000", "0.5", "2", "1", "10", -1, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 10000, "ab") === null && app.clmmImpactSizer("10000", "0.5", "2", "1", "10", 2.5, "ab") === null);
check("CIS composes Tool 42 in source", appSrc.includes("function clmmImpactSizer"));
check("all cis controls labelled",
  ["cis-l", "cis-lower", "cis-upper", "cis-price", "cis-dir", "cis-cap", "cis-fee", "cis-out"]
    .every(id => html.includes(`for="${id}"`)));
check("cis tool present in index.html", html.includes('id="cis-calc"') && html.includes('id="cis-result"'));
check("cis handler wired to its own form", appSrc.includes('getElementById("cis-calc")') && appSrc.includes('getElementById("cis-result")'));
check("cis honesty: impact cap is not a drain cap and not-live labels", html.includes("an impact cap is not a drain cap") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers CLMM price-impact sizer", guide.includes("know the range's own ceiling"));
check("README lists tool 78", readme.includes("78. **CLMM price-impact sizer**"));

/* ---------- Tool 79: CLMM two-range arbitrage (XARB) ---------- */
const xarb = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "10000", "4");
check("XARB headline exists and crossed", xarb !== null && xarb.crossed === true && xarb.hitBoundary === true && xarb.hitSecondBoundary === false);
check("XARB headline direction buy-a", xarb.direction === "buy-a" && xarb.inToken === "B" && xarb.outToken === "A");
near("XARB headline leg 1 gross in", xarb.leg1GrossIn, 4142.135623730951, 1e-9);
near("XARB headline leg 1 out", xarb.leg1Out, 2928.9321881345254, 1e-9);
near("XARB headline leg 2 gross in", xarb.leg2GrossIn, 3178.3724519578204, 1e-9);
near("XARB headline leg 2 out", xarb.leg2Out, 1297.565119969216, 1e-9);
near("XARB headline gross in is the legs summed", xarb.grossIn, 7320.508075688771, 1e-9);
near("XARB headline amount out is the legs summed", xarb.amountOut, 4226.4973081037415, 1e-9);
near("XARB headline profit", xarb.profitInB, 5358.983848622453, 1e-9);
near("XARB headline post-trade spot lands on the external price", xarb.postTradeSpot, 3, 1e-12);
check("XARB headline second range is 2-4 with boundary 2", xarb.secondLowerPrice === 2 && xarb.secondUpperPrice === 4 && xarb.boundaryPrice === 2);
/* beyond the outer edge: the two legs are exact round numbers */
{
  const w = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4");
  check("XARB second wall flagged", w.hitSecondBoundary === true && w.crossed === true);
  near("XARB second wall gross in is exactly 10000", w.grossIn, 10000, 1e-9);
  near("XARB second wall amount out is exactly 5000", w.amountOut, 5000, 1e-9);
  near("XARB second wall profit", w.profitInB, 15000, 1e-9);
  near("XARB second wall post-trade spot is the outer edge", w.postTradeSpot, 4, 1e-12);
  check("XARB external price exactly at the outer edge is the second wall", app.clmmCrossArbitrage("10000", "0.5", "2", "1", "4", 0, "10000", "4").hitSecondBoundary === true);
}
/* mirror: external below, second range below */
{
  const m = app.clmmCrossArbitrage("10000", "0.5", "2", "1", String(1 / 3), 0, "10000", "0.25");
  check("XARB mirror direction sell-a and crossed", m.direction === "sell-a" && m.inToken === "A" && m.outToken === "B" && m.crossed === true);
  near("XARB mirror gross in matches the up headline", m.grossIn, 7320.508075688775, 1e-9);
  near("XARB mirror amount out", m.amountOut, 4226.497308103742, 1e-9);
  near("XARB mirror profit in B", m.profitInB, 1786.3279495408178, 1e-9);
  near("XARB mirror post-trade spot", m.postTradeSpot, 1 / 3, 1e-12);
  check("XARB mirror second range is 0.25-0.5 with boundary 0.5", m.secondLowerPrice === 0.25 && m.secondUpperPrice === 0.5 && m.boundaryPrice === 0.5);
}
/* inside the first range the answer is tool 77's verbatim */
{
  const w = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "1.21", 25, "10000", "4");
  const s = app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 25);
  check("XARB inside-range equals Tool 77 field by field",
    w.crossed === false && w.leg2GrossIn === 0 && w.leg2Out === 0 &&
    w.grossIn === s.grossIn && w.netIn === s.netIn && w.amountOut === s.amountOut &&
    w.profitInB === s.profitInB && w.postTradeSpot === s.postTradeSpot);
  const wd = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "0.81", 25, "10000", "0.25");
  const sd = app.clmmArbitrage("10000", "0.5", "2", "1", "0.81", 25);
  check("XARB inside-range mirror equals Tool 77", wd.crossed === false && wd.grossIn === sd.grossIn && wd.amountOut === sd.amountOut && wd.profitInB === sd.profitInB);
}
/* composition: the reported gross input through tool 43 returns the modelled output at the modelled price */
{
  const combos = [
    ["3", 0, "10000", "4", "ba"], ["5", 25, "10000", "4", "ba"], ["2.5", 100, "5000", "4", "ba"],
    [String(1 / 3), 25, "10000", "0.25", "ab"], ["0.2", 0, "20000", "0.25", "ab"], ["4", 50, "1000", "9", "ba"]
  ];
  for (const [pe, fee, l2, outer, dir] of combos) {
    const x = app.clmmCrossArbitrage("10000", "0.5", "2", "1", pe, fee, l2, outer);
    const cs = app.clmmCrossSwap("10000", "0.5", "2", "1", String(x.grossIn), fee, dir, l2, outer);
    check(`XARB composes Tool 43 at pe=${pe} fee=${fee} L2=${l2}`,
      cs !== null && cs.crossed === true && Math.abs(cs.amountOut - x.amountOut) < 1e-6 && Math.abs(cs.newPrice - x.postTradeSpot) < 1e-9);
    check(`XARB legs conserve at pe=${pe} fee=${fee}`,
      Math.abs(x.leg1GrossIn + x.leg2GrossIn - x.grossIn) < 1e-12 && Math.abs(x.leg1Out + x.leg2Out - x.amountOut) < 1e-12 && x.leg2GrossIn > 0);
  }
}
/* the fee is charged on each leg */
{
  const f = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 25, "10000", "4");
  near("XARB fee leg 2 gross is grossed up separately", f.leg2GrossIn, 3186.3382977020756, 1e-9);
  near("XARB fee gross in", f.grossIn, 7338.855213723079, 1e-9);
  near("XARB fee profit", f.profitInB, 5340.6367105881445, 1e-9);
  check("XARB fee leaves both legs' net and out unchanged", Math.abs(f.netIn - xarb.netIn) < 1e-9 && f.amountOut === xarb.amountOut && f.leg1NetIn === xarb.leg1NetIn);
}
/* second-range depth scales its leg, not its reach */
{
  const t = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "1000", "4");
  near("XARB tenth-depth leg 2 in", t.leg2GrossIn, 317.83724519578203, 1e-9);
  near("XARB tenth-depth leg 2 out", t.leg2Out, 129.75651199692163, 1e-9);
  check("XARB tenth-depth still lands on the external price", t.postTradeSpot === 3 && t.crossed === true);
  near("XARB tenth-depth profit", t.profitInB, 4716.093231467609, 1e-9);
}
/* no gap, and scale freedom */
{
  const none = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4");
  check("XARB no gap is direction none with zeros", none.direction === "none" && none.grossIn === 0 && none.amountOut === 0 && none.profitInB === 0 && none.crossed === false);
  const big = app.clmmCrossArbitrage("100000", "0.5", "2", "1", "3", 0, "100000", "4");
  check("XARB 10x liquidity on both ranges scales every amount 10x",
    Math.abs(big.grossIn / xarb.grossIn - 10) < 1e-12 && Math.abs(big.amountOut / xarb.amountOut - 10) < 1e-12 && big.postTradeSpot === xarb.postTradeSpot);
}
/* rejections */
check("XARB rejects blank and junk", app.clmmCrossArbitrage("", "0.5", "2", "1", "3", 0, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "abc", 0, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "10000", " ") === null);
check("XARB rejects non-positive inputs", app.clmmCrossArbitrage("0", "0.5", "2", "1", "3", 0, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "0", 0, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "0", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "10000", "0") === null);
check("XARB rejects an outer edge on the wrong side or inside the range", app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "10000", "1.5") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 0, "10000", "0.25") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "0.4", 0, "10000", "3") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "1.5") === null);
check("XARB rejects inverted range and price outside it", app.clmmCrossArbitrage("10000", "2", "0.5", "1", "3", 0, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "0.5", "3", 0, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "2", "3", 0, "10000", "4") === null);
check("XARB rejects bad fee tiers", app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", -1, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 10000, "10000", "4") === null && app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 2.5, "10000", "4") === null);
check("XARB composes Tool 77 in source", appSrc.includes("function clmmCrossArbitrage"));
check("all xarb controls labelled",
  ["xarb-l", "xarb-lower", "xarb-upper", "xarb-price", "xarb-ext", "xarb-fee", "xarb-l2", "xarb-outer", "xarb-out"]
    .every(id => html.includes(`for="${id}"`)));
check("xarb tool present in index.html", html.includes('id="xarb-calc"') && html.includes('id="xarb-result"'));
check("xarb handler wired to its own form", appSrc.includes('getElementById("xarb-calc")') && appSrc.includes('getElementById("xarb-result")'));
check("xarb honesty: second wall, second fee and not-live labels", html.includes("an external price beyond the outer edge caps the combined trade there") && html.includes("the fee is charged again on the second range") && html.includes("not live pool data, not a found opportunity, not financial advice"));
check("guide covers CLMM two-range arbitrage", guide.includes("price the second range too"));
check("README lists tool 79", readme.includes("79. **CLMM two-range arbitrage model**"));

/* ---------- Tool 80: CLMM three-range arbitrage (TARB) ---------- */
const tarb = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "10000", "8");
check("TARB headline exists and entered third", tarb !== null && tarb.enteredThird === true && tarb.crossed === true && tarb.hitSecondBoundary === true && tarb.hitThirdBoundary === false);
check("TARB headline direction buy-a", tarb.direction === "buy-a" && tarb.inToken === "B" && tarb.outToken === "A");
near("TARB headline leg 1 gross in", tarb.leg1GrossIn, 4142.135623730951, 1e-9);
near("TARB headline leg 1 out", tarb.leg1Out, 2928.9321881345254, 1e-9);
near("TARB headline leg 2 gross in", tarb.leg2GrossIn, 5857.86437626905, 1e-9);
near("TARB headline leg 2 out", tarb.leg2Out, 2071.06781186547, 1e-9);
near("TARB headline leg 3 gross in", tarb.leg3GrossIn, 2360.6797749979, 1e-9);
near("TARB headline leg 3 out", tarb.leg3Out, 527.864045000421, 1e-9);
near("TARB headline gross in is the legs summed", tarb.grossIn, 12360.6797749979, 1e-9);
near("TARB headline amount out is the legs summed", tarb.amountOut, 5527.86404500042, 1e-9);
near("TARB headline profit", tarb.profitInB, 15278.6404500042, 1e-9);
near("TARB headline post-trade spot lands on the external price", tarb.postTradeSpot, 5, 1e-12);
check("TARB headline ranges chain 0.5-2, 2-4, 4-8", tarb.secondLowerPrice === 2 && tarb.secondUpperPrice === 4 && tarb.thirdLowerPrice === 4 && tarb.thirdUpperPrice === 8 && tarb.boundaryPrice === 2 && tarb.secondBoundaryPrice === 4);
/* beyond the third edge: capped at the third wall */
{
  const w = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "9", 0, "10000", "4", "10000", "8");
  check("TARB third wall flagged", w.hitThirdBoundary === true && w.enteredThird === true);
  near("TARB third wall gross in", w.grossIn, 18284.2712474619, 1e-9);
  near("TARB third wall amount out", w.amountOut, 6464.46609406726, 1e-9);
  near("TARB third wall profit", w.profitInB, 39895.9235991435, 1e-9);
  near("TARB third wall post-trade spot is the third edge", w.postTradeSpot, 8, 1e-12);
  check("TARB external price exactly at the third edge is the third wall", app.clmmTripleArbitrage("10000", "0.5", "2", "1", "8", 0, "10000", "4", "10000", "8").hitThirdBoundary === true);
}
/* mirror: external below, ranges below */
{
  const m = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "0.2", 0, "10000", "0.25", "10000", "0.125");
  check("TARB mirror direction sell-a and entered third", m.direction === "sell-a" && m.inToken === "A" && m.outToken === "B" && m.enteredThird === true);
  near("TARB mirror gross in matches the up headline legs", m.grossIn, 12360.6797749979, 1e-9);
  near("TARB mirror amount out", m.amountOut, 5527.86404500042, 1e-9);
  near("TARB mirror profit in B", m.profitInB, 3055.72809000084, 1e-9);
  near("TARB mirror post-trade spot", m.postTradeSpot, 0.2, 1e-12);
  check("TARB mirror ranges chain down", m.thirdLowerPrice === 0.125 && m.thirdUpperPrice === 0.25 && m.secondBoundaryPrice === 0.25);
  const mc = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "0.1", 0, "10000", "0.25", "10000", "0.125");
  check("TARB mirror third wall flagged", mc.hitThirdBoundary === true);
  near("TARB mirror third wall post-trade spot is the third edge", mc.postTradeSpot, 0.125, 1e-12);
  near("TARB mirror third wall profit", mc.profitInB, 4636.03896932107, 1e-9);
}
/* inside the two ranges the answer is tool 79's verbatim; inside the first, tool 77's */
{
  const w = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "3", 25, "10000", "4", "10000", "8");
  const s = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "3", 25, "10000", "4");
  check("TARB inside-two-ranges equals Tool 79 field by field",
    w.enteredThird === false && w.leg3GrossIn === 0 && w.leg3Out === 0 &&
    w.grossIn === s.grossIn && w.netIn === s.netIn && w.amountOut === s.amountOut &&
    w.profitInB === s.profitInB && w.postTradeSpot === s.postTradeSpot && w.crossed === s.crossed);
  const w1 = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1.21", 25, "10000", "4", "10000", "8");
  const s1 = app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 25);
  check("TARB inside-first-range equals Tool 77", w1.enteredThird === false && w1.crossed === false && w1.grossIn === s1.grossIn && w1.amountOut === s1.amountOut && w1.profitInB === s1.profitInB);
}
/* composition: the reported gross input through tool 46 returns the modelled output at the modelled price */
{
  const combos = [
    ["5", 0, "10000", "4", "10000", "8", "ba"], ["9", 25, "10000", "4", "10000", "8", "ba"], ["6", 100, "5000", "4", "20000", "16", "ba"],
    ["0.2", 25, "10000", "0.25", "10000", "0.125", "ab"], ["0.1", 0, "20000", "0.25", "5000", "0.125", "ab"], ["12", 50, "1000", "9", "3000", "27", "ba"]
  ];
  for (const [pe, fee, l2, outer, l3, outer3, dir] of combos) {
    const x = app.clmmTripleArbitrage("10000", "0.5", "2", "1", pe, fee, l2, outer, l3, outer3);
    const ts = app.clmmTripleSwap("10000", "0.5", "2", "1", String(x.grossIn), fee, dir, l2, outer, l3, outer3);
    check(`TARB composes Tool 46 at pe=${pe} fee=${fee} L3=${l3}`,
      ts !== null && ts.enteredThird === true && Math.abs(ts.amountOut - x.amountOut) < 1e-6 && Math.abs(ts.newPrice - x.postTradeSpot) < 1e-9);
    check(`TARB legs conserve at pe=${pe} fee=${fee}`,
      Math.abs(x.leg1GrossIn + x.leg2GrossIn + x.leg3GrossIn - x.grossIn) < 1e-9 && Math.abs(x.leg1Out + x.leg2Out + x.leg3Out - x.amountOut) < 1e-12 && x.leg3GrossIn > 0);
  }
}
/* the fee is charged on each leg, a third time on the third */
{
  const f = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 25, "10000", "4", "10000", "8");
  near("TARB fee leg 3 gross is grossed up separately", f.leg3GrossIn, 2366.59626566205, 1e-9);
  near("TARB fee gross in", f.grossIn, 12391.6589223037, 1e-9);
  near("TARB fee profit", f.profitInB, 15247.6613026984, 1e-9);
  check("TARB fee leaves all legs' net and out unchanged", Math.abs(f.netIn - tarb.netIn) < 1e-9 && f.amountOut === tarb.amountOut && f.leg3NetIn === tarb.leg3NetIn);
}
/* third-range depth scales its leg, not its reach */
{
  const t = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "1000", "8");
  near("TARB tenth-depth leg 3 in", t.leg3GrossIn, 236.06797749979, 1e-9);
  near("TARB tenth-depth leg 3 out", t.leg3Out, 52.7864045000421, 1e-9);
  check("TARB tenth-depth still lands on the external price", t.postTradeSpot === 5 && t.enteredThird === true);
  near("TARB tenth-depth profit", t.profitInB, 15027.8640450004, 1e-9);
}
/* no gap, and scale freedom */
{
  const none = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "8");
  check("TARB no gap is direction none with zeros", none.direction === "none" && none.grossIn === 0 && none.amountOut === 0 && none.profitInB === 0 && none.enteredThird === false);
  const big = app.clmmTripleArbitrage("100000", "0.5", "2", "1", "5", 0, "100000", "4", "100000", "8");
  check("TARB 10x liquidity on all ranges scales every amount 10x",
    Math.abs(big.grossIn / tarb.grossIn - 10) < 1e-12 && Math.abs(big.amountOut / tarb.amountOut - 10) < 1e-12 && big.postTradeSpot === tarb.postTradeSpot);
}
/* rejections */
check("TARB rejects blank and junk", app.clmmTripleArbitrage("", "0.5", "2", "1", "5", 0, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "abc", 0, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "10000", " ") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "", "8") === null);
check("TARB rejects non-positive inputs", app.clmmTripleArbitrage("0", "0.5", "2", "1", "5", 0, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "0", 0, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "0", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "10000", "0") === null);
check("TARB rejects a third edge on the wrong side or at the second edge", app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "10000", "3") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "4", "10000", "4") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "0.2", 0, "10000", "0.25", "10000", "0.3") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "0.2", 0, "10000", "0.25", "10000", "0.25") === null);
check("TARB rejects a bad second edge and inverted range", app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 0, "10000", "1.5", "10000", "8") === null && app.clmmTripleArbitrage("10000", "2", "0.5", "1", "5", 0, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "2", "5", 0, "10000", "4", "10000", "8") === null);
check("TARB rejects bad fee tiers", app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", -1, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 10000, "10000", "4", "10000", "8") === null && app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 2.5, "10000", "4", "10000", "8") === null);
/* no gap: the third range chains on the side the second range sits, and is validated there too */
{
  const na = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "8");
  check("TARB no-gap second-above chains the third range above", na.direction === "none" && na.thirdLowerPrice === 4 && na.thirdUpperPrice === 8);
  const nb = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "0.25", "10000", "0.125");
  check("TARB no-gap second-below chains the third range below", nb.direction === "none" && nb.thirdLowerPrice === 0.125 && nb.thirdUpperPrice === 0.25 && nb.grossIn === 0);
  check("TARB no-gap rejects a third edge inside, at, or across the second range",
    app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "3") === null &&
    app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "4") === null &&
    app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "0.1") === null &&
    app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "0.25", "10000", "0.3") === null &&
    app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "0.25", "10000", "0.25") === null &&
    app.clmmTripleArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "0.25", "10000", "8") === null);
}
/* an external price exactly at the second edge stops there: tool 79's capped answer, not a rejection */
{
  const e = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "4", 0, "10000", "4", "10000", "8");
  const s = app.clmmCrossArbitrage("10000", "0.5", "2", "1", "4", 0, "10000", "4");
  check("TARB external exactly at the second edge returns the two-range answer",
    e !== null && e.enteredThird === false && e.leg3GrossIn === 0 && e.leg3Out === 0 &&
    e.hitSecondBoundary === true && e.hitThirdBoundary === false &&
    e.grossIn === s.grossIn && e.amountOut === s.amountOut && e.profitInB === s.profitInB && e.postTradeSpot === 4);
  const em = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "0.25", 25, "10000", "0.25", "10000", "0.125");
  check("TARB mirror external exactly at the second edge returns the two-range answer",
    em !== null && em.enteredThird === false && em.hitSecondBoundary === true && em.postTradeSpot === 0.25);
  const h = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "4.000001", 0, "10000", "4", "10000", "8");
  check("TARB a hair beyond the second edge still enters the third range", h.enteredThird === true && h.leg3GrossIn > 0);
}
check("TARB composes Tool 79 in source", appSrc.includes("function clmmTripleArbitrage") && appSrc.includes("clmmCrossArbitrage(liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps, secondLiquidityStr, secondOuterStr)"));
check("all tarb controls labelled",
  ["tarb-l", "tarb-lower", "tarb-upper", "tarb-price", "tarb-ext", "tarb-fee", "tarb-l2", "tarb-outer", "tarb-l3", "tarb-outer3", "tarb-out"]
    .every(id => html.includes(`for="${id}"`)));
check("tarb tool present in index.html", html.includes('id="tarb-calc"') && html.includes('id="tarb-result"'));
check("tarb handler wired to its own form", appSrc.includes('getElementById("tarb-calc")') && appSrc.includes('getElementById("tarb-result")'));
check("tarb honesty: third wall, third fee and not-live labels", html.includes("an external price beyond the third range's outer edge caps the combined trade there") && html.includes("the fee is charged again on the third range") && html.includes("not live pool data, not a found opportunity, not financial advice"));
check("app.js cache key bumped to v105", html.includes("app.js?v=105"));
check("guide covers CLMM three-range arbitrage", guide.includes("price the third range too"));
check("README lists tool 80", readme.includes("80. **CLMM three-range arbitrage model**"));

/* ---------- Tool 81: CLMM two-range price-impact sizer (XCIS) ---------- */
const xcis = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ba", "10000", "4");
check("XCIS headline exists and crosses", xcis !== null && xcis.feasible === true && xcis.crossed === true && xcis.hitBoundary === true && xcis.hitSecondBoundary === false);
check("XCIS headline tokens", xcis.inToken === "B" && xcis.outToken === "A" && xcis.boundaryPrice === 2);
near("XCIS headline max in is exactly 20000/3", xcis.maxAmountIn, 20000 / 3, 1e-6);
near("XCIS headline amount out is exactly 4000", xcis.amountOut, 4000, 1e-6);
near("XCIS headline lands on the cap", xcis.actualImpactPct, 40, 1e-9);
near("XCIS headline new price", xcis.newPrice, 25 / 9, 1e-9);
near("XCIS headline leg 1 in", xcis.leg1UsedIn, 4142.135623730951, 1e-6);
near("XCIS headline leg 1 out", xcis.leg1Out, 2928.9321881345254, 1e-9);
near("XCIS headline leg 2 in", xcis.leg2UsedIn, 2524.531042935719, 1e-6);
near("XCIS headline leg 2 out", xcis.leg2Out, 1071.067811865476, 1e-9);
near("XCIS headline two-range ceiling is exactly 50", xcis.secondBoundaryImpactPct, 50, 1e-9);
near("XCIS headline first-range ceiling", xcis.boundaryImpactPct, 29.289321881345252, 1e-9);
check("XCIS headline ranges chain 0.5-2, 2-4", xcis.secondLowerPrice === 2 && xcis.secondUpperPrice === 4);
/* mirror direction: same sizes, reciprocal landing price */
{
  const m = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ab", "10000", "0.25");
  check("XCIS mirror crosses downward", m !== null && m.crossed === true && m.inToken === "A" && m.boundaryPrice === 0.5 && m.secondLowerPrice === 0.25 && m.secondUpperPrice === 0.5);
  near("XCIS mirror max in", m.maxAmountIn, 20000 / 3, 1e-6);
  near("XCIS mirror amount out", m.amountOut, 4000, 1e-6);
  near("XCIS mirror new price", m.newPrice, 0.36, 1e-9);
  near("XCIS mirror lands on the cap", m.actualImpactPct, 40, 1e-9);
}
/* inside the first range the answer is tool 78's verbatim */
{
  const caps = [["5", 0], ["10", 0], ["10", 25], ["20", 100], ["29", 25]];
  check("XCIS inside the first range equals Tool 78 field by field", caps.every(([c, f]) => {
    const x = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", c, f, "ba", "10000", "4");
    const s = app.clmmImpactSizer("10000", "0.5", "2", "1", c, f, "ba");
    return x !== null && x.crossed === false && x.hitBoundary === false && x.leg2UsedIn === 0 && x.leg2Out === 0 &&
      x.maxAmountIn === s.maxAmountIn && x.netIn === s.netIn && x.amountOut === s.amountOut &&
      x.effectiveRate === s.effectiveRate && x.actualImpactPct === s.actualImpactPct && x.newPrice === s.newPrice;
  }));
}
/* the reported two-range ceiling is the impact of emptying BOTH ranges,
   even when the cap itself fits inside the first range (regression:
   the ceiling used to be built on the cap-sized trade, so an inside
   cap reported a "ceiling" that emptied neither range) */
{
  const x = app.clmmCrossImpactSizer("234841.01755148795", "0.11744241207805212", "0.22437868640222594", "0.15729858341014738", "8.944241184565977", 1, "ba", "2836.0488430904365", "5.25342201216398");
  check("XCIS inside-case ceiling exists and does not cross", x !== null && x.feasible === true && x.crossed === false);
  near("XCIS inside-case ceiling is the both-ranges-empty impact", x.secondBoundaryImpactPct, 31.631132107719097, 1e-6);
  const sB = Math.sqrt(0.22437868640222594), sOut = Math.sqrt(5.25342201216398), sP = Math.sqrt(0.15729858341014738);
  const capTotal = 234841.01755148795 * (sB - sP) / (1 - 0.0001) + 2836.0488430904365 * (sOut - sB) / (1 - 0.0001);
  const drain = app.clmmCrossSwap("234841.01755148795", "0.11744241207805212", "0.22437868640222594", "0.15729858341014738", String(capTotal), 1, "ba", "2836.0488430904365", "5.25342201216398");
  check("XCIS ceiling equals tool 43 at the true total capacity", drain !== null && drain.hitSecondBoundary === true && Math.abs(drain.priceImpactPct - x.secondBoundaryImpactPct) < 1e-9);
}
/* the sized input through tool 43 itself lands on the cap across a sweep */
{
  let ok = true;
  for (const dir of ["ab", "ba"]) for (const cap of [5, 15, 29.3, 35, 50, 70]) for (const fee of [0, 25, 100]) for (const L2 of [1000, 10000, 50000]) {
    const outer = dir === "ab" ? "0.25" : "4";
    const x = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", String(cap), fee, dir, String(L2), outer);
    if (x === null || !x.feasible) { ok = false; break; }
    const sw = app.clmmCrossSwap("10000", "0.5", "2", "1", String(x.maxAmountIn), fee, dir, String(L2), outer);
    if (sw === null || Math.abs(sw.priceImpactPct - x.actualImpactPct) > 1e-9) ok = false;
    if (x.actualImpactPct > cap + 1e-9) ok = false;
    if (!x.hitSecondBoundary && Math.abs(x.actualImpactPct - cap) > 1e-6) ok = false;
    if (x.hitSecondBoundary && Math.abs(x.actualImpactPct - x.secondBoundaryImpactPct) > 1e-9) ok = false;
  }
  check("XCIS composes Tool 43 across a 108-combo sweep", ok);
}
/* at or above the combined ceiling the trade empties both ranges */
{
  const d = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "90", 0, "ba", "10000", "4");
  check("XCIS ceiling case empties both ranges", d !== null && d.hitSecondBoundary === true && d.crossed === true);
  near("XCIS ceiling case max in is exactly 10000", d.maxAmountIn, 10000, 1e-9);
  near("XCIS ceiling case amount out is exactly 5000", d.amountOut, 5000, 1e-9);
  near("XCIS ceiling case actual impact is the ceiling, not the cap", d.actualImpactPct, 50, 1e-9);
  near("XCIS ceiling case new price is the outer edge", d.newPrice, 4, 1e-12);
  const thin = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ba", "1000", "4");
  check("XCIS a thin second range lowers the ceiling", thin !== null && thin.hitSecondBoundary === true && thin.secondBoundaryImpactPct < 50);
  near("XCIS thin ceiling value", thin.secondBoundaryImpactPct, 33.66982516584878, 1e-9);
  near("XCIS thin ceiling max in", thin.maxAmountIn, 4727.922061357856, 1e-6);
}
/* a cap exactly on the first ceiling returns the range-emptying trade, uncrossed */
{
  const s = app.clmmImpactSizer("10000", "0.5", "2", "1", "40", 0, "ba");
  const e = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", String(s.boundaryImpactPct), 0, "ba", "10000", "4");
  check("XCIS cap on the first ceiling stays uncrossed", e !== null && e.crossed === false && e.hitBoundary === true && e.maxAmountIn === s.maxAmountIn && e.amountOut === s.amountOut);
}
/* fee floor and a fee-bearing crossing */
{
  const fl = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "0.2", 25, "ba", "10000", "4");
  check("XCIS cap at or below the fee is infeasible", fl !== null && fl.feasible === false && fl.maxAmountIn === 0 && fl.crossed === false);
  const f40 = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 25, "ba", "10000", "4");
  check("XCIS fee-bearing crossing exists", f40 !== null && f40.crossed === true && f40.hitSecondBoundary === false);
  near("XCIS fee-bearing crossing lands on the cap", f40.actualImpactPct, 40, 1e-9);
  near("XCIS fee-bearing ceiling", f40.secondBoundaryImpactPct, 50.125, 1e-9);
  check("XCIS fee is charged across both legs", f40.feePaid > 0 && Math.abs(f40.netIn - (f40.maxAmountIn - f40.feePaid)) < 1e-9 && f40.leg1UsedIn + f40.leg2UsedIn === f40.maxAmountIn);
}
/* rejections */
check("XCIS rejects bad inputs", [
  () => app.clmmCrossImpactSizer("", "0.5", "2", "1", "40", 0, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("0", "0.5", "2", "1", "40", 0, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "2", "0.5", "1", "40", 0, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "2", "40", 0, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "0", 0, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "100", 0, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 25.5, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 10000, "ba", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "xx", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ba", "0", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ba", "10000", "2"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ba", "10000", "0.25"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ab", "10000", "4"),
  () => app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "40", 0, "ab", "10000", "0.5")
].every(fn => fn() === null));
check("XCIS composes Tools 78 and 43 in source", appSrc.includes("function clmmCrossImpactSizer") && appSrc.includes("clmmImpactSizer(liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction)") && appSrc.includes("clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, String(grossTotal), feeBps, direction, secondLiquidityStr, secondOuterStr)"));
check("all xcis controls labelled",
  ["xcis-l", "xcis-lower", "xcis-upper", "xcis-price", "xcis-dir", "xcis-cap", "xcis-fee", "xcis-l2", "xcis-outer", "xcis-out"]
    .every(id => html.includes(`for="${id}"`)));
check("xcis tool present in index.html", html.includes('id="xcis-calc"') && html.includes('id="xcis-result"'));
check("xcis handler wired to its own form", appSrc.includes('getElementById("xcis-calc")') && appSrc.includes('getElementById("xcis-result")'));
check("xcis honesty: second wall, fee floor and not-live labels", html.includes("emptying both ranges costs exactly 50% impact at zero fee") && html.includes("a cap at or below the fee tier admits no trade at all") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers CLMM two-range impact sizing", guide.includes("size the trade by its impact cap across the wall"));
check("README lists tool 81", readme.includes("81. **CLMM two-range price-impact sizer**"));

/* ---------- Tool 82: CLMM three-range price-impact sizer (TCIS) ---------- */
const tcis = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ba", "10000", "4", "10000", "8");
check("TCIS headline exists and enters the third range", tcis !== null && tcis.feasible === true && tcis.enteredThird === true && tcis.hitSecondBoundary === true && tcis.hitThirdBoundary === false);
check("TCIS headline tokens and boundaries", tcis.inToken === "B" && tcis.outToken === "A" && tcis.boundaryPrice === 2 && tcis.secondBoundaryPrice === 4);
near("TCIS headline max in is exactly 15000", tcis.maxAmountIn, 15000, 1e-6);
near("TCIS headline amount out is exactly 6000", tcis.amountOut, 6000, 1e-6);
near("TCIS headline lands on the cap", tcis.actualImpactPct, 60, 1e-9);
near("TCIS headline new price is exactly 6.25", tcis.newPrice, 6.25, 1e-9);
near("TCIS headline leg 3 in is exactly 5000", tcis.leg3UsedIn, 5000, 1e-6);
near("TCIS headline leg 3 out is exactly 1000", tcis.leg3Out, 1000, 1e-6);
near("TCIS headline three-range ceiling", tcis.thirdBoundaryImpactPct, 64.64466094067262, 1e-9);
near("TCIS headline two-range ceiling is exactly 50", tcis.secondBoundaryImpactPct, 50, 1e-9);
check("TCIS headline ranges chain 0.5-2, 2-4, 4-8", tcis.secondLowerPrice === 2 && tcis.secondUpperPrice === 4 && tcis.thirdLowerPrice === 4 && tcis.thirdUpperPrice === 8);
/* mirror direction: same sizes, reciprocal landing price */
{
  const m = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ab", "10000", "0.25", "10000", "0.125");
  check("TCIS mirror enters the third range downward", m !== null && m.enteredThird === true && m.inToken === "A" && m.thirdLowerPrice === 0.125 && m.thirdUpperPrice === 0.25);
  near("TCIS mirror max in", m.maxAmountIn, 15000, 1e-6);
  near("TCIS mirror amount out", m.amountOut, 6000, 1e-6);
  near("TCIS mirror new price", m.newPrice, 0.16, 1e-9);
  near("TCIS mirror lands on the cap", m.actualImpactPct, 60, 1e-9);
  near("TCIS mirror ceiling", m.thirdBoundaryImpactPct, 64.64466094067262, 1e-9);
}
/* inside two ranges the answer is tool 81's verbatim */
{
  const caps = [["5", 0], ["40", 0], ["40", 25], ["49", 100]];
  check("TCIS inside two ranges equals Tool 81 field by field", caps.every(([c, f]) => {
    const t = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", c, f, "ba", "10000", "4", "10000", "8");
    const x = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", c, f, "ba", "10000", "4");
    return t !== null && t.enteredThird === false && t.leg3UsedIn === 0 && t.leg3Out === 0 &&
      t.maxAmountIn === x.maxAmountIn && t.netIn === x.netIn && t.amountOut === x.amountOut &&
      t.effectiveRate === x.effectiveRate && t.actualImpactPct === x.actualImpactPct && t.newPrice === x.newPrice &&
      t.leg1UsedIn === x.leg1UsedIn && t.leg2UsedIn === x.leg2UsedIn;
  }));
}
/* a cap exactly on the two-range ceiling stays at the second wall */
{
  const x = app.clmmCrossImpactSizer("10000", "0.5", "2", "1", "50", 0, "ba", "10000", "4");
  const t = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "50", 0, "ba", "10000", "4", "10000", "8");
  check("TCIS cap on the two-range ceiling stays unentered", t !== null && t.enteredThird === false && t.hitSecondBoundary === true && t.maxAmountIn === x.maxAmountIn && t.amountOut === x.amountOut);
}
/* the sized input through tool 46 itself lands on the cap across a sweep */
{
  let ok = true;
  for (const dir of ["ab", "ba"]) for (const cap of [5, 40, 55, 60, 64]) for (const fee of [0, 25]) for (const L3 of [1000, 10000, 50000]) {
    const o2 = dir === "ab" ? "0.25" : "4", o3 = dir === "ab" ? "0.125" : "8";
    const t = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", String(cap), fee, dir, "10000", o2, String(L3), o3);
    if (t === null || !t.feasible) { ok = false; break; }
    const sw = app.clmmTripleSwap("10000", "0.5", "2", "1", String(t.maxAmountIn), fee, dir, "10000", o2, String(L3), o3);
    if (sw === null || Math.abs(sw.priceImpactPct - t.actualImpactPct) > 1e-9) ok = false;
    if (t.actualImpactPct > cap + 1e-9) ok = false;
    if (!t.hitThirdBoundary && Math.abs(t.actualImpactPct - cap) > 1e-6) ok = false;
    if (t.hitThirdBoundary && Math.abs(t.actualImpactPct - t.thirdBoundaryImpactPct) > 1e-9) ok = false;
    if (t.enteredThird !== sw.enteredThird) ok = false;
  }
  check("TCIS composes Tool 46 across a 120-combo sweep", ok);
}
/* at or above the three-range ceiling the trade empties all three ranges */
{
  const d = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "90", 0, "ba", "10000", "4", "10000", "8");
  check("TCIS ceiling case empties all three ranges", d !== null && d.hitThirdBoundary === true && d.enteredThird === true);
  near("TCIS ceiling case max in", d.maxAmountIn, 18284.271247461904, 1e-6);
  near("TCIS ceiling case amount out", d.amountOut, 6464.466094067263, 1e-6);
  near("TCIS ceiling case actual impact is the ceiling, not the cap", d.actualImpactPct, 64.64466094067262, 1e-9);
  near("TCIS ceiling case new price is the third edge", d.newPrice, 8, 1e-9);
  const thin = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "90", 0, "ba", "10000", "4", "1000", "8");
  check("TCIS a thin third range lowers the ceiling", thin !== null && thin.hitThirdBoundary === true && thin.thirdBoundaryImpactPct < 64.64466094067262);
  near("TCIS thin ceiling value", thin.thirdBoundaryImpactPct, 52.47281484080399, 1e-9);
  near("TCIS thin ceiling max in", thin.maxAmountIn, 10828.42712474619, 1e-6);
}
/* fee floor and a fee-bearing entry into the third range */
{
  const fl = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "0.2", 25, "ba", "10000", "4", "10000", "8");
  check("TCIS cap at or below the fee is infeasible", fl !== null && fl.feasible === false && fl.maxAmountIn === 0 && fl.enteredThird === false);
  const f55 = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "55", 25, "ba", "10000", "4", "10000", "8");
  check("TCIS fee-bearing entry exists", f55 !== null && f55.enteredThird === true && f55.hitThirdBoundary === false);
  near("TCIS fee-bearing entry lands on the cap", f55.actualImpactPct, 55, 1e-9);
  near("TCIS fee-bearing max in", f55.maxAmountIn, 12197.159565580618, 1e-6);
  check("TCIS fee is charged across all three legs", f55.feePaid > 0 && Math.abs(f55.netIn - (f55.maxAmountIn - f55.feePaid)) < 1e-9 && Math.abs(f55.leg1UsedIn + f55.leg2UsedIn + f55.leg3UsedIn - f55.maxAmountIn) < 1e-9);
}
/* rejections */
check("TCIS rejects bad inputs", [
  () => app.clmmTripleImpactSizer("", "0.5", "2", "1", "60", 0, "ba", "10000", "4", "10000", "8"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ba", "10000", "4", "0", "8"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ba", "10000", "4", "10000", "4"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ba", "10000", "4", "10000", "2"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ab", "10000", "0.25", "10000", "0.5"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "ab", "10000", "0.25", "10000", "8"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "0", 0, "ba", "10000", "4", "10000", "8"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "100", 0, "ba", "10000", "4", "10000", "8"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 25.5, "ba", "10000", "4", "10000", "8"),
  () => app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "60", 0, "xx", "10000", "4", "10000", "8")
].every(fn => fn() === null));
check("TCIS composes Tools 81 and 46 in source", appSrc.includes("function clmmTripleImpactSizer") && appSrc.includes("clmmCrossImpactSizer(liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction, secondLiquidityStr, secondOuterStr)") && appSrc.includes("clmmTripleSwap(liquidityStr, lowerStr, upperStr, priceStr, String(grossTotal), feeBps, direction, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr)"));
check("all tcis controls labelled",
  ["tcis-l", "tcis-lower", "tcis-upper", "tcis-price", "tcis-dir", "tcis-cap", "tcis-fee", "tcis-l2", "tcis-outer", "tcis-l3", "tcis-outer3", "tcis-out"]
    .every(id => html.includes(`for="${id}"`)));
check("tcis tool present in index.html", html.includes('id="tcis-calc"') && html.includes('id="tcis-result"'));
check("tcis handler wired to its own form", appSrc.includes('getElementById("tcis-calc")') && appSrc.includes('getElementById("tcis-result")'));
check("tcis honesty: third wall, fee floor and not-live labels", html.includes("emptying all three ranges costs ≈64.6447% impact at zero fee") && html.includes("a cap at or below the fee tier admits no trade at all") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers CLMM three-range impact sizing", guide.includes("size the trade across the third range too"));
check("README lists tool 82", readme.includes("82. **CLMM three-range price-impact sizer**"));

/* ---------- Tool 83: CLMM four-range swap model (QSWAP) ---------- */
const QSWAP_L = "947.2135954999577"; // Tool 8's L for 100 A @ P1 in 0.8-1.25; ranges chain x0.8 down / x1.25 up
const qOuter = d => d === "ab" ? ["0.64", "0.512", "0.4096"] : ["1.5625", "1.953125", "2.44140625"];
function qswap(ain, fee, dir, l4) {
  const o = qOuter(dir);
  return app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", String(ain), fee, dir, QSWAP_L, o[0], QSWAP_L, o[1], l4 || QSWAP_L, o[2]);
}
function tswap(ain, fee, dir) {
  const o = qOuter(dir);
  return app.clmmTripleSwap(QSWAP_L, "0.8", "1.25", "1", String(ain), fee, dir, QSWAP_L, o[0], QSWAP_L, o[1]);
}
/* a swap that never fills the third range is tool 46 verbatim */
{
  const q1 = qswap(10, 25, "ab"), t1 = tswap(10, 25, "ab");
  check("QSWAP small swap does not enter the fourth range", q1 !== null && q1.enteredFourth === false && q1.hitFourthBoundary === false && q1.leg4UsedIn === 0 && q1.leg4Out === 0);
  check("QSWAP small swap equals Tool 46 field by field", q1.amountOut === t1.amountOut && q1.usedIn === t1.usedIn && q1.newPrice === t1.newPrice && q1.feePaid === t1.feePaid && q1.leg3Out === t1.leg3Out);
  const q2 = qswap(300, 25, "ab"), t2 = tswap(300, 25, "ab");
  check("QSWAP third-range-only swap equals Tool 46 field by field", q2 !== null && q2.enteredThird === true && q2.enteredFourth === false && q2.amountOut === t2.amountOut && q2.usedIn === t2.usedIn && q2.newPrice === t2.newPrice);
}
/* headline: 500 in at zero fee crosses into the fourth range */
{
  const h = qswap(500, 0, "ab");
  check("QSWAP headline enters the fourth range without capping", h !== null && h.enteredFourth === true && h.hitFourthBoundary === false);
  near("QSWAP headline amount out", h.amountOut, 327.25424859373675, 1e-9);
  near("QSWAP headline new price", h.newPrice, 0.4283813728906052, 1e-9);
  near("QSWAP headline leg 4 in", h.leg4UsedIn, 123.44235253127368, 1e-9);
  near("QSWAP headline leg 4 out", h.leg4Out, 57.81152949374527, 1e-9);
  near("QSWAP headline impact", h.priceImpactPct, 34.54915028125265, 1e-9);
  check("QSWAP headline uses the whole input", h.usedIn === 500 && h.unfilledIn === 0);
  const hf = qswap(500, 25, "ab");
  near("QSWAP fee-bearing headline amount out", hf.amountOut, 326.7183089711595, 1e-9);
  near("QSWAP fee is the tier's share of the used input across all four legs", hf.feePaid, 1.25, 1e-9);
  const m = qswap(500, 0, "ba");
  check("QSWAP mirror pays the same amount out", m !== null && Math.abs(m.amountOut - h.amountOut) < 1e-9 && Math.abs(m.newPrice - 1 / h.newPrice) < 1e-9);
}
/* quad-cap: a huge input pays exactly the four holdings summed */
{
  const c = qswap(100000, 0, "ab");
  check("QSWAP quad-cap hits the fourth boundary", c !== null && c.hitFourthBoundary === true && c.enteredFourth === true);
  near("QSWAP quad-cap pays the four holdings summed", c.amountOut, 340.99689437998484, 1e-9);
  near("QSWAP quad-cap used in", c.usedIn, 532.8076474687261, 1e-9);
  near("QSWAP quad-cap new price is the fourth edge", c.newPrice, 0.4096, 1e-12);
  near("QSWAP quad-cap impact is exactly 36%", c.priceImpactPct, 36, 1e-9);
  check("QSWAP quad-cap leaves the rest unfilled", c.unfilledIn > 99000);
}
/* fourth-range depth moves the fill, not the reach */
{
  const thin = qswap(500, 0, "ab", String(947.2135954999577 / 10));
  check("QSWAP thin fourth range caps", thin !== null && thin.hitFourthBoundary === true);
  near("QSWAP thin fourth range pays a tenth of its holding", thin.leg4Out, 7.155417527999324, 1e-9);
  const deep = qswap(500, 0, "ab", String(947.2135954999577 * 10));
  check("QSWAP deep fourth range fills inside", deep !== null && deep.hitFourthBoundary === false && deep.amountOut > 327.25424859373675);
  near("QSWAP deep fourth range amount out", deep.amountOut, 332.0612822584264, 1e-9);
}
/* composition sweep: legs conserve, fee identity, first three legs are Tool 46's */
{
  let ok = true;
  for (const [ain, fee, dir] of [[50, 0, "ab"], [200, 25, "ab"], [450, 100, "ab"], [500, 0, "ba"], [700, 25, "ba"], [123.456, 5, "ab"], [1000, 25, "ab"]]) {
    const r = qswap(ain, fee, dir), t3 = tswap(ain, fee, dir);
    if (!r || !t3) { ok = false; break; }
    if (Math.abs(r.leg1UsedIn + r.leg2UsedIn + r.leg3UsedIn + r.leg4UsedIn - r.usedIn) > 1e-6) ok = false;
    if (Math.abs(r.leg1Out + r.leg2Out + r.leg3Out + r.leg4Out - r.amountOut) > 1e-6) ok = false;
    if (Math.abs(r.feePaid - r.usedIn * fee / 10000) > 1e-6) ok = false;
    if (Math.abs(r.usedIn + r.unfilledIn - r.amountIn) > 1e-9) ok = false;
    if (r.leg1Out !== t3.leg1Out || r.leg2Out !== t3.leg2Out || r.leg3Out !== t3.leg3Out) ok = false;
  }
  check("QSWAP composes Tool 46 across a 7-combo sweep", ok);
}
/* a dust remainder into a deep fourth range settles instead of rejecting */
{
  const d = app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "376.5576484687263", 0, "ab", QSWAP_L, "0.64", QSWAP_L, "0.512", "1000000000000", "0.4096");
  check("QSWAP dust remainder into a deep fourth range settles", d !== null && d.enteredFourth === true && d.leg4UsedIn > 0 && d.leg4Out > 0);
}
/* rejections */
check("QSWAP rejects bad inputs", [
  () => app.clmmQuadSwap("", "0.8", "1.25", "1", "500", 0, "ab", QSWAP_L, "0.64", QSWAP_L, "0.512", QSWAP_L, "0.4096"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "ab", QSWAP_L, "0.64", QSWAP_L, "0.512", "0", "0.4096"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "ab", QSWAP_L, "0.64", QSWAP_L, "0.512", QSWAP_L, "0.512"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "ab", QSWAP_L, "0.64", QSWAP_L, "0.512", QSWAP_L, "0.6"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "ba", QSWAP_L, "1.5625", QSWAP_L, "1.953125", QSWAP_L, "1.8"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "ba", QSWAP_L, "1.5625", QSWAP_L, "1.953125", QSWAP_L, "1.953125"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "xx", QSWAP_L, "0.64", QSWAP_L, "0.512", QSWAP_L, "0.4096"),
  () => app.clmmQuadSwap(QSWAP_L, "0.8", "1.25", "1", "500", 0, "ab", QSWAP_L, "0.64", QSWAP_L, "0.512", QSWAP_L, "")
].every(fn => fn() === null));
check("QSWAP composes Tool 46 in source", appSrc.includes("function clmmQuadSwap") && appSrc.includes("clmmTripleSwap(liquidityStr, lowerStr, upperStr, priceStr, amountInStr, feeBps, direction, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr)"));
check("all qswap controls labelled",
  ["qswap-liq", "qswap-lower", "qswap-upper", "qswap-price", "qswap-dir", "qswap-ain", "qswap-fee", "qswap-liq2", "qswap-outer", "qswap-liq3", "qswap-outer3", "qswap-liq4", "qswap-outer4", "qswap-out", "qswap-newprice", "qswap-used"]
    .every(id => html.includes(`for="${id}"`)));
check("qswap tool present in index.html", html.includes('id="qswap-calc"') && html.includes('id="qswap-result"'));
check("qswap handler wired to its own form", appSrc.includes('getElementById("qswap-calc")') && appSrc.includes('getElementById("qswap-result")'));
check("qswap honesty: fourth wall and not-live labels", html.includes("The fourth range is a wall too") && html.includes("continue into a fifth range, a sixth") && html.includes("not a live quote, not financial advice"));
check("guide covers CLMM four-range swaps", guide.includes("price the fourth range too"));
check("README lists tool 83", readme.includes("83. **CLMM four-range swap model**"));

/* ---------- Tool 84: CLMM four-range arbitrage (QARB) ---------- */
const qarb = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", "16");
check("QARB headline exists and entered fourth", qarb !== null && qarb.enteredFourth === true && qarb.enteredThird === true && qarb.crossed === true && qarb.hitThirdBoundary === true && qarb.hitFourthBoundary === false);
check("QARB headline direction buy-a", qarb.direction === "buy-a" && qarb.inToken === "B" && qarb.outToken === "A");
near("QARB headline legs 1-3 gross in are Tool 80's capped legs", qarb.leg1GrossIn + qarb.leg2GrossIn + qarb.leg3GrossIn, 18284.2712474619, 1e-9);
near("QARB headline leg 4 gross in", qarb.leg4GrossIn, 6356.744903915641, 1e-9);
near("QARB headline leg 4 out", qarb.leg4Out, 648.782559984608, 1e-9);
near("QARB headline gross in is the legs summed", qarb.grossIn, 24641.016151377546, 1e-9);
near("QARB headline amount out is the legs summed", qarb.amountOut, 7113.248654051871, 1e-9);
near("QARB headline profit", qarb.profitInB, 60717.9676972449, 1e-9);
near("QARB headline post-trade spot lands on the external price", qarb.postTradeSpot, 12, 1e-12);
check("QARB headline ranges chain 0.5-2, 2-4, 4-8, 8-16", qarb.secondLowerPrice === 2 && qarb.secondUpperPrice === 4 && qarb.thirdLowerPrice === 4 && qarb.thirdUpperPrice === 8 && qarb.fourthLowerPrice === 8 && qarb.fourthUpperPrice === 16 && qarb.boundaryPrice === 2 && qarb.secondBoundaryPrice === 4 && qarb.thirdBoundaryPrice === 8);
/* the fourth wall: an external price beyond the fourth edge caps there */
{
  const w = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "20", 0, "10000", "4", "10000", "8", "10000", "16");
  check("QARB fourth wall flagged", w.hitFourthBoundary === true && w.enteredFourth === true);
  near("QARB fourth wall gross in is exactly 30000", w.grossIn, 30000, 1e-9);
  near("QARB fourth wall amount out is exactly 7500", w.amountOut, 7500, 1e-9);
  near("QARB fourth wall profit", w.profitInB, 120000, 1e-9);
  near("QARB fourth wall post-trade spot is the fourth edge", w.postTradeSpot, 16, 1e-12);
  check("QARB external price exactly at the fourth edge is the fourth wall", app.clmmQuadArbitrage("10000", "0.5", "2", "1", "16", 0, "10000", "4", "10000", "8", "10000", "16").hitFourthBoundary === true);
  check("QARB external price exactly at the third edge returns Tool 80's capped answer unentered", (() => { const e = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "8", 0, "10000", "4", "10000", "8", "10000", "16"); return e.enteredFourth === false && e.leg4GrossIn === 0 && Math.abs(e.grossIn - 18284.2712474619) < 1e-9; })());
}
/* mirror: external price below, ranges chain downward */
{
  const m = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "0.1", 0, "10000", "0.25", "10000", "0.125", "10000", "0.0625");
  check("QARB mirror direction sell-a and entered fourth", m.direction === "sell-a" && m.inToken === "A" && m.outToken === "B" && m.enteredFourth === true);
  near("QARB mirror gross in", m.grossIn, 21622.77660168379, 1e-9);
  near("QARB mirror amount out", m.amountOut, 6837.72233983162, 1e-9);
  near("QARB mirror profit in B", m.profitInB, 4675.444679663241, 1e-9);
  near("QARB mirror post-trade spot", m.postTradeSpot, 0.1, 1e-12);
  check("QARB mirror ranges chain down", m.fourthLowerPrice === 0.0625 && m.fourthUpperPrice === 0.125 && m.thirdBoundaryPrice === 0.125);
  const mc = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "0.04", 0, "10000", "0.25", "10000", "0.125", "10000", "0.0625");
  check("QARB mirror fourth wall flagged", mc.hitFourthBoundary === true);
  near("QARB mirror fourth wall post-trade spot is the fourth edge", mc.postTradeSpot, 0.0625, 1e-12);
  near("QARB mirror fourth wall gross in is exactly 30000", mc.grossIn, 30000, 1e-9);
  near("QARB mirror fourth wall profit", mc.profitInB, 6300, 1e-9);
}
/* inside the three ranges the answer is tool 80's verbatim; inside the first, tool 77's */
{
  const w = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "5", 25, "10000", "4", "10000", "8", "10000", "16");
  const s = app.clmmTripleArbitrage("10000", "0.5", "2", "1", "5", 25, "10000", "4", "10000", "8");
  check("QARB inside-three-ranges equals Tool 80 field by field",
    w.enteredFourth === false && w.leg4GrossIn === 0 && w.leg4Out === 0 &&
    w.grossIn === s.grossIn && w.netIn === s.netIn && w.amountOut === s.amountOut &&
    w.profitInB === s.profitInB && w.postTradeSpot === s.postTradeSpot && w.crossed === s.crossed);
  const w1 = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "1.21", 25, "10000", "4", "10000", "8", "10000", "16");
  const s1 = app.clmmArbitrage("10000", "0.5", "2", "1", "1.21", 25);
  check("QARB inside-first-range equals Tool 77", w1.enteredFourth === false && w1.crossed === false && w1.grossIn === s1.grossIn && w1.amountOut === s1.amountOut && w1.profitInB === s1.profitInB);
}
/* composition: the reported gross input through tool 83 returns the modelled output at the modelled price */
{
  const combos = [
    ["12", 0, "10000", "4", "10000", "8", "10000", "16", "ba"], ["20", 25, "10000", "4", "10000", "8", "10000", "16", "ba"], ["20", 100, "5000", "4", "20000", "16", "10000", "32", "ba"],
    ["0.1", 25, "10000", "0.25", "10000", "0.125", "10000", "0.0625", "ab"], ["0.04", 0, "20000", "0.25", "5000", "0.125", "10000", "0.0625", "ab"], ["30", 50, "1000", "9", "3000", "27", "2000", "81", "ba"]
  ];
  for (const [pe, fee, l2, outer, l3, outer3, l4, outer4, dir] of combos) {
    const x = app.clmmQuadArbitrage("10000", "0.5", "2", "1", pe, fee, l2, outer, l3, outer3, l4, outer4);
    const qs = app.clmmQuadSwap("10000", "0.5", "2", "1", String(x.grossIn), fee, dir, l2, outer, l3, outer3, l4, outer4);
    check(`QARB composes Tool 83 at pe=${pe} fee=${fee} L4=${l4}`,
      qs !== null && qs.enteredFourth === true && Math.abs(qs.amountOut - x.amountOut) < 1e-6 && Math.abs(qs.newPrice - x.postTradeSpot) < 1e-9);
    check(`QARB legs conserve at pe=${pe} fee=${fee}`,
      Math.abs(x.leg1GrossIn + x.leg2GrossIn + x.leg3GrossIn + x.leg4GrossIn - x.grossIn) < 1e-9 && Math.abs(x.leg1Out + x.leg2Out + x.leg3Out + x.leg4Out - x.amountOut) < 1e-12 && x.leg4GrossIn > 0);
  }
}
/* the fee is charged on each leg, a fourth time on the fourth */
{
  const f = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 25, "10000", "4", "10000", "8", "10000", "16");
  near("QARB fee leg 4 gross is grossed up separately", f.leg4GrossIn, 6372.676595404151, 1e-9);
  near("QARB fee gross in", f.grossIn, 24702.77308408776, 1e-9);
  near("QARB fee profit", f.profitInB, 60656.210764534684, 1e-9);
  check("QARB fee leaves all legs' net and out unchanged", Math.abs(f.netIn - qarb.netIn) < 1e-9 && f.amountOut === qarb.amountOut && f.leg4NetIn === qarb.leg4NetIn);
}
/* the fourth range's depth scales its leg, not its reach */
{
  const t = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "1000", "16");
  near("QARB tenth-depth leg 4 in", t.leg4GrossIn, 635.6744903915641, 1e-9);
  near("QARB tenth-depth leg 4 out", t.leg4Out, 64.87825599846082, 1e-9);
  check("QARB tenth-depth still lands on the external price", t.postTradeSpot === 12 && t.enteredFourth === true);
  near("QARB tenth-depth profit", t.profitInB, 59432.18646293522, 1e-9);
}
/* no gap, and scale freedom */
{
  const none = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "8", "10000", "16");
  check("QARB no gap is direction none with zeros", none.direction === "none" && none.grossIn === 0 && none.amountOut === 0 && none.profitInB === 0 && none.enteredFourth === false);
  check("QARB no-gap chains the fourth range above", none.fourthLowerPrice === 8 && none.fourthUpperPrice === 16);
  const nb = app.clmmQuadArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "0.25", "10000", "0.125", "10000", "0.0625");
  check("QARB no-gap chains the fourth range below", nb.direction === "none" && nb.fourthLowerPrice === 0.0625 && nb.fourthUpperPrice === 0.125 && nb.grossIn === 0);
  check("QARB 10x liquidity on all ranges scales every amount 10x",
    (() => { const b = app.clmmQuadArbitrage("100000", "0.5", "2", "1", "12", 0, "100000", "4", "100000", "8", "100000", "16"); return Math.abs(b.grossIn - 10 * qarb.grossIn) < 1e-6 && Math.abs(b.amountOut - 10 * qarb.amountOut) < 1e-6 && Math.abs(b.profitInB - 10 * qarb.profitInB) < 1e-6; })());
}
check("QARB rejects blank and junk", app.clmmQuadArbitrage("", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "abc", 0, "10000", "4", "10000", "8", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", " ") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "", "16") === null);
check("QARB rejects non-positive inputs", app.clmmQuadArbitrage("0", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "0", 0, "10000", "4", "10000", "8", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "0", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", "0") === null);
check("QARB rejects a fourth edge on the wrong side or at the third edge", app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", "6") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "8", "10000", "8") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "0.1", 0, "10000", "0.25", "10000", "0.125", "10000", "0.2") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "0.1", 0, "10000", "0.25", "10000", "0.125", "10000", "0.125") === null);
check("QARB rejects a fourth edge on the wrong side when there is no gap", app.clmmQuadArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "4", "10000", "8", "10000", "0.4") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "1", 0, "10000", "0.25", "10000", "0.125", "10000", "3") === null);
check("QARB rejects a bad third edge and bad fee tiers", app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 0, "10000", "4", "10000", "3", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", -1, "10000", "4", "10000", "8", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 10000, "10000", "4", "10000", "8", "10000", "16") === null && app.clmmQuadArbitrage("10000", "0.5", "2", "1", "12", 2.5, "10000", "4", "10000", "8", "10000", "16") === null);
check("QARB composes Tool 80 in source", appSrc.includes("function clmmQuadArbitrage") && appSrc.includes("clmmTripleArbitrage(liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr)"));
check("all qarb controls labelled",
  ["qarb-l", "qarb-lower", "qarb-upper", "qarb-price", "qarb-ext", "qarb-fee", "qarb-l2", "qarb-outer", "qarb-l3", "qarb-outer3", "qarb-l4", "qarb-outer4", "qarb-out"]
    .every(id => html.includes(`for="${id}"`)));
check("qarb tool present in index.html", html.includes('id="qarb-calc"') && html.includes('id="qarb-result"'));
check("qarb handler wired to its own form", appSrc.includes('getElementById("qarb-calc")') && appSrc.includes('getElementById("qarb-result")'));
check("qarb honesty: fourth wall and not-live labels", html.includes("The fourth range is a wall too") && html.includes("not live pool data, not a found opportunity, not financial advice"));
check("guide covers CLMM four-range arbitrage", guide.includes("price the fourth range too — and pay its fee"));
check("README lists tool 84", readme.includes("84. **CLMM four-range arbitrage model**"));

/* ---------- Tool 85: CLMM four-range price-impact sizer (QCIS) ---------- */
const qcis = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "8", "10000", "16");
check("QCIS headline exists and enters the fourth range", qcis !== null && qcis.feasible === true && qcis.enteredFourth === true && qcis.hitThirdBoundary === true && qcis.hitFourthBoundary === false);
check("QCIS headline tokens and boundaries", qcis.inToken === "B" && qcis.outToken === "A" && qcis.boundaryPrice === 2 && qcis.secondBoundaryPrice === 4 && qcis.thirdBoundaryPrice === 8);
near("QCIS headline max in is exactly 23333.3333", qcis.maxAmountIn, 23333.333333333332, 1e-6);
near("QCIS headline amount out is exactly 7000", qcis.amountOut, 7000, 1e-6);
near("QCIS headline lands on the cap", qcis.actualImpactPct, 70, 1e-9);
near("QCIS headline new price is 100/9", qcis.newPrice, 100 / 9, 1e-9);
near("QCIS headline leg 4 in", qcis.leg4UsedIn, 5049.062085871443, 1e-6);
near("QCIS headline leg 4 out", qcis.leg4Out, 535.5339059327384, 1e-9);
near("QCIS headline four-range ceiling is exactly 75", qcis.fourthBoundaryImpactPct, 75, 1e-9);
near("QCIS headline three-range ceiling", qcis.thirdBoundaryImpactPct, 64.64466094067262, 1e-9);
check("QCIS headline ranges chain 0.5-2, 2-4, 4-8, 8-16", qcis.secondLowerPrice === 2 && qcis.secondUpperPrice === 4 && qcis.thirdLowerPrice === 4 && qcis.thirdUpperPrice === 8 && qcis.fourthLowerPrice === 8 && qcis.fourthUpperPrice === 16);
/* mirror direction: same sizes, reciprocal landing price */
{
  const m = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ab", "10000", "0.25", "10000", "0.125", "10000", "0.0625");
  check("QCIS mirror enters the fourth range downward", m !== null && m.enteredFourth === true && m.inToken === "A" && m.fourthLowerPrice === 0.0625 && m.fourthUpperPrice === 0.125);
  near("QCIS mirror max in", m.maxAmountIn, 23333.333333333332, 1e-6);
  near("QCIS mirror amount out", m.amountOut, 7000, 1e-6);
  near("QCIS mirror new price", m.newPrice, 0.09, 1e-9);
  near("QCIS mirror lands on the cap", m.actualImpactPct, 70, 1e-9);
  near("QCIS mirror ceiling is exactly 75", m.fourthBoundaryImpactPct, 75, 1e-9);
}
/* inside three ranges the answer is tool 82's verbatim */
{
  const caps = [["5", 0], ["40", 0], ["60", 0], ["55", 25]];
  check("QCIS inside three ranges equals Tool 82 field by field", caps.every(([c, f]) => {
    const q = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", c, f, "ba", "10000", "4", "10000", "8", "10000", "16");
    const t = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", c, f, "ba", "10000", "4", "10000", "8");
    return q !== null && q.enteredFourth === false && q.leg4UsedIn === 0 && q.leg4Out === 0 &&
      q.maxAmountIn === t.maxAmountIn && q.netIn === t.netIn && q.amountOut === t.amountOut &&
      q.effectiveRate === t.effectiveRate && q.actualImpactPct === t.actualImpactPct && q.newPrice === t.newPrice &&
      q.leg1UsedIn === t.leg1UsedIn && q.leg2UsedIn === t.leg2UsedIn && q.leg3UsedIn === t.leg3UsedIn;
  }));
}
/* a cap exactly on the three-range ceiling stays at the third wall */
{
  const t = app.clmmTripleImpactSizer("10000", "0.5", "2", "1", "64.64466094067262", 0, "ba", "10000", "4", "10000", "8");
  const q = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "64.64466094067262", 0, "ba", "10000", "4", "10000", "8", "10000", "16");
  check("QCIS cap on the three-range ceiling stays unentered", q !== null && q.enteredFourth === false && q.hitThirdBoundary === true && q.maxAmountIn === t.maxAmountIn && q.amountOut === t.amountOut);
}
/* the sized input through tool 83 itself lands on the cap across a sweep */
{
  let ok = true;
  for (const dir of ["ab", "ba"]) for (const cap of [5, 40, 60, 68, 70, 74]) for (const fee of [0, 25]) for (const L4 of [1000, 10000, 50000]) {
    const o2 = dir === "ab" ? "0.25" : "4", o3 = dir === "ab" ? "0.125" : "8", o4 = dir === "ab" ? "0.0625" : "16";
    const q = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", String(cap), fee, dir, "10000", o2, "10000", o3, String(L4), o4);
    if (q === null || !q.feasible) { ok = false; break; }
    const sw = app.clmmQuadSwap("10000", "0.5", "2", "1", String(q.maxAmountIn), fee, dir, "10000", o2, "10000", o3, String(L4), o4);
    if (sw === null || Math.abs(sw.priceImpactPct - q.actualImpactPct) > 1e-9) ok = false;
    if (q.actualImpactPct > cap + 1e-9) ok = false;
    if (!q.hitFourthBoundary && Math.abs(q.actualImpactPct - cap) > 1e-6) ok = false;
    if (q.hitFourthBoundary && Math.abs(q.actualImpactPct - q.fourthBoundaryImpactPct) > 1e-9) ok = false;
    if (q.enteredFourth !== sw.enteredFourth) ok = false;
  }
  check("QCIS composes Tool 83 across a 144-combo sweep", ok);
}
/* at or above the four-range ceiling the trade empties all four ranges */
{
  const d = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "90", 0, "ba", "10000", "4", "10000", "8", "10000", "16");
  check("QCIS ceiling case empties all four ranges", d !== null && d.hitFourthBoundary === true && d.enteredFourth === true);
  near("QCIS ceiling case max in is exactly 30000", d.maxAmountIn, 30000, 1e-6);
  near("QCIS ceiling case amount out is exactly 7500", d.amountOut, 7500, 1e-6);
  near("QCIS ceiling case actual impact is the ceiling, not the cap", d.actualImpactPct, 75, 1e-9);
  near("QCIS ceiling case new price is the fourth edge", d.newPrice, 16, 1e-9);
  const thin = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "90", 0, "ba", "10000", "4", "10000", "8", "1000", "16");
  check("QCIS a thin fourth range lowers the ceiling", thin !== null && thin.hitFourthBoundary === true && thin.fourthBoundaryImpactPct < 75);
  near("QCIS thin ceiling value", thin.fourthBoundaryImpactPct, 66.24140570188865, 1e-9);
  near("QCIS thin ceiling max in", thin.maxAmountIn, 19455.844122715713, 1e-6);
  near("QCIS thin ceiling amount out", thin.amountOut, 6568.019484660536, 1e-6);
}
/* fee floor and a fee-bearing entry into the fourth range */
{
  const fl = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "0.2", 25, "ba", "10000", "4", "10000", "8", "10000", "16");
  check("QCIS cap at or below the fee is infeasible", fl !== null && fl.feasible === false && fl.maxAmountIn === 0 && fl.enteredFourth === false);
  const f70 = app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 25, "ba", "10000", "4", "10000", "8", "10000", "16");
  check("QCIS fee-bearing entry exists", f70 !== null && f70.enteredFourth === true && f70.hitFourthBoundary === false);
  near("QCIS fee-bearing entry lands on the cap", f70.actualImpactPct, 70, 1e-9);
  near("QCIS fee-bearing max in", f70.maxAmountIn, 23308.270676691744, 1e-6);
  near("QCIS fee-bearing amount out", f70.amountOut, 6992.481203007521, 1e-6);
  near("QCIS fee-bearing new price", f70.newPrice, 11.055625, 1e-9);
  near("QCIS fee-bearing four-range ceiling", f70.fourthBoundaryImpactPct, 75.0625, 1e-9);
  check("QCIS fee is charged across all four legs", f70.feePaid > 0 && Math.abs(f70.netIn - (f70.maxAmountIn - f70.feePaid)) < 1e-9 && Math.abs(f70.leg1UsedIn + f70.leg2UsedIn + f70.leg3UsedIn + f70.leg4UsedIn - f70.maxAmountIn) < 1e-9);
}
/* rejections */
check("QCIS rejects bad inputs", [
  () => app.clmmQuadImpactSizer("", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "8", "10000", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "8", "0", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "8", "10000", "8"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "8", "10000", "6"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ab", "10000", "0.25", "10000", "0.125", "10000", "0.125"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ab", "10000", "0.25", "10000", "0.125", "10000", "0.2"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "4", "10000", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "0", 0, "ba", "10000", "4", "10000", "8", "10000", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "100", 0, "ba", "10000", "4", "10000", "8", "10000", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 25.5, "ba", "10000", "4", "10000", "8", "10000", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "xx", "10000", "4", "10000", "8", "10000", "16"),
  () => app.clmmQuadImpactSizer("10000", "0.5", "2", "1", "70", 0, "ba", "10000", "4", "10000", "8", "10000", "")
].every(fn => fn() === null));
check("QCIS composes Tools 82 and 83 in source", appSrc.includes("function clmmQuadImpactSizer") && appSrc.includes("clmmTripleImpactSizer(liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr)") && appSrc.includes("clmmQuadSwap(liquidityStr, lowerStr, upperStr, priceStr, String(grossTotal), feeBps, direction, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr, fourthLiquidityStr, fourthOuterStr)"));
check("all qcis controls labelled",
  ["qcis-l", "qcis-lower", "qcis-upper", "qcis-price", "qcis-dir", "qcis-cap", "qcis-fee", "qcis-l2", "qcis-outer", "qcis-l3", "qcis-outer3", "qcis-l4", "qcis-outer4", "qcis-out"]
    .every(id => html.includes(`for="${id}"`)));
check("qcis tool present in index.html", html.includes('id="qcis-calc"') && html.includes('id="qcis-result"'));
check("qcis handler wired to its own form", appSrc.includes('getElementById("qcis-calc")') && appSrc.includes('getElementById("qcis-result")'));
check("qcis honesty: fourth wall, fee floor and not-live labels", html.includes("emptying all four ranges costs exactly 75% impact at zero fee") && html.includes("a cap at or below the fee tier admits no trade at all") && html.includes("not live pool data, not a live quote, not financial advice"));
check("guide covers CLMM four-range impact sizing", guide.includes("size the trade across the fourth range too"));
check("README lists tool 85", readme.includes("85. **CLMM four-range price-impact sizer**"));

console.log(failures === 0 ? "\nALL TESTS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
