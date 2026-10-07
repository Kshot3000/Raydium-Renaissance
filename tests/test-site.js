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
  ["q", "rin", "rout", "ain", "aout", "swap-fee", "ratio", "deposit", "volume", "tvl", "your-liq", "fee-fee", "be-ratio", "be-deposit", "be-daily", "dep-ra", "dep-rb", "dep-aa", "dep-reqb"]
    .every(id => html.includes(`for="${id}"`)));
check("cache keys present", html.includes("styles.css?v=1") && html.includes("app.js?v=3"));
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

console.log(failures === 0 ? "\nALL TESTS PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
