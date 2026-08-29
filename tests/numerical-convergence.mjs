import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('/* ════════════════════════════ QS physics');
const end = html.indexOf('/* ════════════════════════════ BER');
assert.ok(start >= 0 && end > start, 'physics source markers must exist');

const context = { Math, Float64Array, Array, isFinite, NaN };
vm.createContext(context);
vm.runInContext(`
  function linspace(a, b, n) {
    const r = new Array(n);
    for (let i = 0; i < n; i++) r[i] = a + (b - a) * i / (n - 1);
    return r;
  }
  ${html.slice(start, end)}
`, context);

function interp(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) {
    if (xs[i] >= x) {
      const f = (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
      return ys[i - 1] + f * (ys[i] - ys[i - 1]);
    }
  }
  return ys.at(-1);
}

function samples(result, key, distances) {
  return distances.map(distance => interp(result.dArr, result[key], distance));
}

function maxAbs(left, right) {
  assert.equal(left.length, right.length);
  return Math.max(...left.map((value, i) => Math.abs(value - right[i])));
}

const report = [];
function checkRefinement(label, coarse, canonical, refined, tolerance, slack = 1.25, requireReduction = true) {
  const coarseDelta = maxAbs(coarse, canonical);
  const refinedDelta = maxAbs(canonical, refined);
  assert.ok(refinedDelta <= tolerance,
    `${label}: canonical-to-refined delta ${refinedDelta} exceeds ${tolerance}`);
  if (requireReduction) {
    assert.ok(refinedDelta <= slack * coarseDelta + tolerance * 0.05,
      `${label}: refinement did not reduce/stabilize error (coarse=${coarseDelta}, refined=${refinedDelta})`);
  }
  report.push({ label, coarseDelta, refinedDelta, tolerance });
}

// Tier B (tolerance-reproducible) checks. Canonical values remain unchanged; resolution
// controls are script-level probes, as required for a protected scientific operating point.

{
  const params = { D: 5e-10, tauLoss: 2, Cth: 1, Km: 1 };
  const distances = [1, 3, 6];
  const coarse = context.computeQS({ ...params, numerics: { nx: 80, cfl: 0.35, records: 450 } });
  const canonical = context.computeQS(params);
  const refined = context.computeQS({ ...params, numerics: { nx: 180, cfl: 0.25, maxDt: 10, records: 1200 } });
  checkRefinement('QS A_C', samples(coarse, 'Ac', distances), samples(canonical, 'Ac', distances), samples(refined, 'Ac', distances), 1e-4);
  checkRefinement('QS tau_C (h)', samples(coarse, 'tC', distances), samples(canonical, 'tC', distances), samples(refined, 'tC', distances), 0.002);
  checkRefinement('QS A_v', samples(coarse, 'Av', distances), samples(canonical, 'Av', distances), samples(refined, 'Av', distances), 1e-4);
  checkRefinement('QS tau_v (h)', samples(coarse, 'tV', distances), samples(canonical, 'tV', distances), samples(refined, 'tV', distances), 0.002);
}

{
  const params = { v: 0.2, tauLoss: 25, kon: 1 };
  const distances = [0.5, 3, 5.5, 10];
  const coarse = context.computeVOC({ ...params, numerics: { steps: 660 } });
  const canonical = context.computeVOC(params);
  const refined = context.computeVOC({ ...params, numerics: { steps: 2640 } });
  checkRefinement('VOC alpha_e2e', samples(coarse, 'ae', distances), samples(canonical, 'ae', distances), samples(refined, 'ae', distances), 1e-6);
  checkRefinement('VOC tau_e2e (s)', samples(coarse, 'te', distances), samples(canonical, 'te', distances), samples(refined, 'te', distances), 0.003);
}

{
  const params = { lam: 0.12, tm: 0.05, vh: 0.2, k: 0.05, txMode: 'pulse', dg: 30, branches: 1, xJunction: 0.3 };
  const distances = [0.08, 0.4, 0.8];
  const coarse = context.computeElec({ ...params, numerics: { nx: 80, cfl: 0.35, records: 350 } });
  const canonical = context.computeElec(params);
  const refined = context.computeElec({ ...params, numerics: { nx: 180, cfl: 0.25, records: 900 } });
  checkRefinement('electrical A_V', samples(coarse, 'Av', distances), samples(canonical, 'Av', distances), samples(refined, 'Av', distances), 0.002);
  checkRefinement('electrical tau_V (s)', samples(coarse, 'tV', distances), samples(canonical, 'tV', distances), samples(refined, 'tV', distances), 2e-4);
  checkRefinement('electrical A_P', samples(coarse, 'Ap', distances), samples(canonical, 'Ap', distances), samples(refined, 'Ap', distances), 0.002);
  checkRefinement('electrical tau_P (s)', samples(coarse, 'tP', distances), samples(canonical, 'tP', distances), samples(refined, 'tP', distances), 2e-4);
}

{
  const params = { d: 2, cext: 0.305, taur: 0.01, trec: 0.05, logKR: Math.log10(5e5), nFlash: 3, flashGap: 0.30 };
  const distances = [0.01, 1, 3, 5];
  const coarse = context.computeOpt({ ...params, numerics: { dt: 1e-3, distancePoints: 120 } });
  const canonical = context.computeOpt(params);
  const refined = context.computeOpt({ ...params, numerics: { dt: 2.5e-4, distancePoints: 120 } });
  checkRefinement('optical A_S Eq. 53', samples(coarse, 'AsPaper', distances), samples(canonical, 'AsPaper', distances), samples(refined, 'AsPaper', distances), 3e-4);
  checkRefinement('optical tau_S (s)', samples(coarse, 'tS', distances), samples(canonical, 'tS', distances), samples(refined, 'tS', distances), 4e-4);
  checkRefinement('optical A_S Fig. 22', samples(coarse, 'AsFigure', distances), samples(canonical, 'AsFigure', distances), samples(refined, 'AsFigure', distances), 5e-6, 1.25, false);
  checkRefinement('optical tau_I (s)', [coarse.tI], [canonical.tI], [refined.tI], 2e-6, 1.25, false);
}

console.log('numerical convergence checks passed (Tier B tolerance-reproducible)');
for (const row of report) {
  console.log(`${row.label}: coarse->canonical=${row.coarseDelta.toExponential(3)}, canonical->refined=${row.refinedDelta.toExponential(3)}, limit=${row.tolerance}`);
}
