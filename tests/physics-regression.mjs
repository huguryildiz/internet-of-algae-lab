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

function close(actual, expected, tolerance, label) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, got ${actual}`);
}

function closeCurve(result, key, distances, expected, tolerance, label) {
  for (let i = 0; i < distances.length; i++) {
    close(interp(result.dArr, result[key], distances[i]), expected[i], tolerance,
      `${label}, d=${distances[i]}`);
  }
}

// Digitized publication data. Tolerances reflect plot resolution: roughly 5% of
// the displayed axis range, or half a minor grid interval for delay plots.
const qsD = [1, 3, 6];
for (const [D, expected] of [
  [2e-10, [0.4323, 0.0811, 0.01375]],
  [5e-10, [0.5952, 0.2045, 0.04674]],
  [1e-9, [0.6966, 0.3388, 0.1381]],
]) {
  const result = context.computeQS({ D, tauLoss: 2, Cth: 1, Km: 1 });
  closeCurve(result, 'Ac', qsD, expected, 0.05, `Fig. 5, D=${D}`);
}
for (const [tauLoss, expected] of [
  [1, [58.7505, 58.7278, 60.1134]],
  [2, [58.6742, 59.8577, 61.0371]],
  [4, [59.8124, 61.0722, 63.5897]],
]) {
  const result = context.computeQS({ D: 5e-10, tauLoss, Cth: 1, Km: 1 });
  // Tolerance is half the paper's own ~1.2–1.3 h staircase step (its snapshot
  // quantization biases the plotted first-crossing times upward); the solver here
  // interpolates the 50% crossing continuously.
  closeCurve(result, 'tC', qsD, expected, 0.65, `Fig. 6, tau_loss=${tauLoss}`);
}
for (const [Cth, expected] of [
  [0.5, [0.9899, 0.9437, 0.7452]],
  [1, [0.9880, 0.9247, 0.6592]],
  [2, [0.9757, 0.8856, 0.4839]],
]) {
  const result = context.computeQS({ D: 5e-10, tauLoss: 2, Cth, Km: 1 });
  closeCurve(result, 'Av', qsD, expected, 0.03, `Fig. 7, C_th=${Cth}`);
}
for (const [Km, expected] of [
  [0.5, [25.06, 37.43, 56.80]],
  [1, [26.63, 38.20, 57.44]],
  [2, [30.75, 41.35, 59.33]],
]) {
  const result = context.computeQS({ D: 5e-10, tauLoss: 2, Cth: 1, Km });
  closeCurve(result, 'tV', qsD, expected, 2, `Fig. 8, K_m=${Km}`);
}

const vocD = [0.5, 3, 5.5, 10];
const vocPaper = new Map([
  [0.05, { ae: [1, 0.98767, 0.98017, 0.97069], te: [11.6, 60.2, 112.6, 203.1] }],
  [0.2, { ae: [1, 0.9981, 0.9969, 0.9950], te: [2.9, 14.9, 28.0, 50.0] }],
  [0.5, { ae: [1, 0.99928, 0.99907, 0.99859], te: [1.0, 6.1, 11.2, 20.1] }],
  [1, { ae: [1, 0.99973, 0.99963, 0.99944], te: [0.5, 3.0, 5.5, 10.1] }],
]);
for (const v of [0.05, 0.2, 0.5, 1]) {
  const result = context.computeVOC({ v, tauLoss: 25, kon: 1 });
  const channelAttenuation = vocD.map(d => Math.sqrt(0.5 / d));
  const channelDelay = vocD.map(d => d / v);
  closeCurve(result, 'ach', vocD, channelAttenuation, 0.003, `Fig. 10, v=${v}`);
  closeCurve(result, 'tch', vocD, channelDelay, 0.2, `Fig. 11, v=${v}`);
  closeCurve(result, 'ae', vocD, vocPaper.get(v).ae, 6e-4, `Fig. 12, v=${v}`);
  closeCurve(result, 'te', vocD, vocPaper.get(v).te, 3, `Fig. 13, v=${v}`);
}

const electricalD = [0.08, 0.4, 0.8];
for (const [lam, expected] of [
  [0.08, [0.24, 0.002, 0]], [0.12, [0.38, 0.01, 0]], [0.18, [0.52, 0.04, 0.003]],
]) {
  const result = context.computeElec({ lam, tm: 0.05, vh: 0.2, k: 0.05 });
  closeCurve(result, 'Av', electricalD, expected, 0.05, `Fig. 15, lambda=${lam}`);
}
for (const [tm, expected] of [
  [0.02, [0.043, 0.060, 0.085]], [0.05, [0.046, 0.081, 0.138]],
  [0.1, [0.050, 0.112, 0.23]],
]) {
  const result = context.computeElec({ lam: 0.12, tm, vh: 0.2, k: 0.05 });
  closeCurve(result, 'tV', electricalD, expected, 0.008, `Fig. 16, tau_m=${tm}`);
}
for (const [vh, expected] of [
  [0.1, [0.99, 0.03, 0]], [0.2, [0.98, 0.005, 0]], [0.3, [0.84, 0, 0]],
]) {
  const result = context.computeElec({ lam: 0.12, tm: 0.05, vh, k: 0.05 });
  closeCurve(result, 'Ap', electricalD, expected, 0.08, `Fig. 17, V_1/2=${vh}`);
}
for (const k of [0.03, 0.05, 0.08]) {
  const result = context.computeElec({ lam: 0.12, tm: 0.05, vh: 0.2, k });
  closeCurve(result, 'tP', electricalD, [0.047, 0.081, 0.139], 0.006, `Fig. 18, k=${k}`);
}

// Peak-time delays: tau_C^peak (paper SS IV-B) and tau_V^peak (Eq. 36). Neither is
// plotted, so they are checked as invariants — finite, non-decreasing with distance,
// and never earlier than the corresponding 50% rise time on the same waveform.
for (const [label, result, rise, peak] of [
  ['QS', ...(() => { const r = context.computeQS({ D: 5e-10, tauLoss: 2, Cth: 1, Km: 1 }); return [r, r.tC, r.tCpk]; })()],
  ['electrical', ...(() => { const r = context.computeElec({ lam: 0.12, tm: 0.05, vh: 0.2, k: 0.05 }); return [r, r.tV, r.tVpk]; })()],
]) {
  assert.equal(peak.length, result.dArr.length, `${label}: peak-time array must span the distance axis`);
  for (let i = 0; i < peak.length; i++) {
    assert.ok(Number.isFinite(peak[i]), `${label} tau^peak must be finite at d=${result.dArr[i]}`);
    assert.ok(peak[i] >= rise[i] - 1e-9,
      `${label} tau^peak must not precede the 50% rise at d=${result.dArr[i]}`);
    if (i > 0) assert.ok(peak[i] >= peak[i - 1] - 1e-9,
      `${label} tau^peak must not decrease with distance at d=${result.dArr[i]}`);
  }
}

const opticalBase = { d: 2, cext: 0.305, taur: 0.01, trec: 0.05, logKR: 5, nFlash: 3, flashGap: 0.30 };
const optical = context.computeOpt(opticalBase);
const opticalChannelD = [0.1, 1, 3, 5];
for (const [cext, expected] of [
  [0.056, [-90.94, -111.23, -121.26, -126.19]],
  [0.150, [-90.98, -111.64, -122.49, -128.23]],
  [0.305, [-91.04, -112.32, -124.51, -131.59]],
  [2.170, [-91.85, -120.41, -148.81, -172.09]],
]) {
  const index = optical.types.indexOf(cext);
  for (let i = 0; i < opticalChannelD.length; i++) {
    close(interp(optical.dArr, optical.gdB[index], opticalChannelD[i]), expected[i], 0.25,
      `Fig. 20, c_ext=${cext}, d=${opticalChannelD[i]}`);
  }
}
// tau_I follows Eq. (52) with the paper's stated rho = 0.5, applied to the Eq. (42)
// flash train: the global irradiance peak belongs to the largest flash (A = 1.1 per
// Table IV), which is what lifts the crossing above the single-flash 50% point.
// Tolerance is a tenth of the plot's 2 ms minor grid interval.
for (const [taur, expected] of [[0.005, 0.1531], [0.01, 0.1551], [0.02, 0.1581], [0.04, 0.1615]]) {
  const result = context.computeOpt({ ...opticalBase, taur });
  close(result.tI, expected, 2e-4, `Fig. 21, tau_r=${taur}`);
}
const opticalD = [1, 3, 5];
for (const [KR, expected] of [
  [1e4, [1, 1, 0.99935]], [5e4, [0.9999, 0.99948, 0.9970]],
  [1e5, [0.9998, 0.9989, 0.99389]], [5e5, [0.99964, 0.99385, 0.97423]],
]) {
  const result = context.computeOpt({ ...opticalBase, logKR: Math.log10(KR) });
  closeCurve(result, 'AsFigure', opticalD, expected, 0.0012, `Fig. 22 reconstruction, K_R=${KR}`);
  assert.deepEqual(result.As, result.AsPaper, 'canonical optical attenuation must be literal Eq. (53)');
}
// Eq. (53) uses the dynamic Eq. (47) response at transmitter and receiver. It must remain
// distinct from the quasi-steady convention needed to reproduce Fig. 22. At the least
// saturated plotted case the distinction is material, not numerical noise.
{
  const result = context.computeOpt({ ...opticalBase, logKR: Math.log10(5e5) });
  const paperAt5m = interp(result.dArr, result.AsPaper, 5);
  const figureAt5m = interp(result.dArr, result.AsFigure, 5);
  close(paperAt5m, 0.9225, 0.0015, 'Eq. (53) dynamic attenuation, K_R=5e5, d=5 m');
  assert.ok(figureAt5m - paperAt5m > 0.045,
    'Fig. 22 reconstruction must not silently collapse into the dynamic Eq. (53) path');
}
for (const [trec, expected] of [
  // Distance independence is now a result of the saturated receiver, not an assumption:
  // tau_S is integrated from Eq. (47) at every distance. The residual droop at d = 5 m is
  // real desaturation, so the tolerance is half the plot's 5 ms minor grid interval.
  [0.02, 0.164], [0.05, 0.1845], [0.08, 0.2055], [0.15, 0.254],
]) {
  const result = context.computeOpt({ ...opticalBase, trec });
  closeCurve(result, 'tS', [0.01, 1, 3], [expected, expected, expected], 0.002,
    `Fig. 23, tau_rec=${trec}`);
  // The published tau_rec = 0.15 s curve is itself not perfectly flat — it droops a few
  // milliseconds by d = 5 m, which is the desaturation the paper's own discussion notes
  // ("R_rx remains well above K_R for the lower three curves"). Bound the droop instead
  // of demanding exact distance independence.
  const spread = Math.max(...result.tS) - Math.min(...result.tS);
  assert.ok(spread <= 0.005, `Fig. 23 tau_S must stay flat with distance, spread=${spread}`);
}

function grid(min, max, step) {
  const values = [];
  for (let value = min; value <= max + step / 100; value += step) values.push(value);
  return values;
}

function sweepCases(defaults, valuesByKey) {
  const cases = [];
  for (const [key, values] of Object.entries(valuesByKey)) {
    for (const value of values) cases.push({ ...defaults, [key]: value });
  }
  const keys = Object.keys(valuesByKey);
  for (let mask = 0; mask < 2 ** keys.length; mask++) {
    const params = { ...defaults };
    keys.forEach((key, i) => {
      const values = valuesByKey[key];
      params[key] = values[(mask >> i) & 1 ? values.length - 1 : 0];
    });
    cases.push(params);
  }
  return [...new Map(cases.map(params => [JSON.stringify(params), params])).values()];
}

function assertBounded(label, arrays) {
  for (const values of arrays) for (const value of values) {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1 + 1e-12,
      `${label} normalized attenuation must remain in [0, 1], got ${value}`);
  }
}

// Full declared slider grids, plus every lower/upper parameter corner. Distance is
// already swept by each returned array; noise belongs only to the teaching extension.
for (const params of sweepCases(
  { D: 5e-10, tauLoss: 2, Cth: 1, Km: 1 },
  { D: grid(2, 10, 1).map(x => x * 1e-10), tauLoss: grid(1, 4, 0.5),
    Cth: grid(0.5, 2, 0.25), Km: grid(0.5, 2, 0.25) },
)) {
  const result = context.computeQS(params);
  assertBounded('QS', [result.Ac, result.Av]);
}
for (const params of sweepCases(
  { v: 0.2, tauLoss: 25, kon: 1 },
  { v: grid(0.05, 1, 0.05), tauLoss: grid(5, 50, 5), kon: grid(0.2, 3, 0.2) },
)) {
  const result = context.computeVOC(params);
  assertBounded('VOC', [result.ach, result.ae]);
}
for (const params of sweepCases(
  { lam: 0.12, tm: 0.05, vh: 0.2, k: 0.05, txMode: 'pulse', dg: 30, branches: 1, xJunction: 0.3 },
  // Only the four plotted parameters take part in the corner sweep: each extra key
  // doubles the corner count against a ~170 ms solve. The unplotted transmitter and
  // junction blocks get their own invariant checks below.
  { lam: grid(0.08, 0.18, 0.01), tm: grid(0.02, 0.1, 0.01),
    vh: grid(0.1, 0.3, 0.02), k: grid(0.03, 0.08, 0.01) },
)) {
  const result = context.computeElec(params);
  assertBounded('electrical', [result.Av, result.Ap]);
}
for (const params of sweepCases(
  { d: 2, cext: 0.305, taur: 0.01, trec: 0.05, logKR: 5, nFlash: 3, flashGap: 0.30 },
  { cext: [0.056, 0.150, 0.305, 2.170], taur: grid(0.005, 0.04, 0.005),
    trec: grid(0.02, 0.15, 0.01), logKR: grid(4, 5.7, 0.1),
    // Corners plus a midpoint: tau_S is now integrated at all 120 distances, so an
    // exhaustive flash-train grid here would dominate the suite's runtime.
    nFlash: [1, 3, 8], flashGap: [0.1, 0.3, 0.5] },
)) {
  const result = context.computeOpt(params);
  const channelAttenuations = result.types.flatMap(cext => result.dArr.map(d => result.gain(d, cext)));
  assertBounded('optical', [result.AsPaper, result.AsFigure, channelAttenuations]);
}

// ── Blocks the paper specifies but never plots. No digitized targets exist for these,
// so they are pinned by structural invariants only.

// Eqs. (28)–(29): the explicit ion-channel transmitter must produce a single, bounded,
// causal depolarization from rest — the behaviour Eq. (40)'s Gaussian stands in for.
{
  const base = { lam: 0.12, tm: 0.05, vh: 0.2, k: 0.05, branches: 1, xJunction: 0.3 };
  for (const dg of [5, 30, 100]) {
    for (const tm of [0.02, 0.05, 0.1]) {
      const channels = context.computeElec({ ...base, tm, dg, txMode: 'channels' });
      assertBounded(`electrical ion-channel transmitter (dg=${dg}, tm=${tm})`, [channels.Av, channels.Ap]);
      for (let i = 1; i < channels.Av.length; i++) {
        assert.ok(channels.Av[i] <= channels.Av[i - 1] + 1e-9,
          `ion-channel transmitter attenuation must decay with distance at d=${channels.dArr[i]}`);
      }
    }
  }
}

// §VI-A-3 junction: splitting axial current across M daughters can only cost amplitude
// downstream of the junction, and must leave the unbranched segment untouched at M = 1.
{
  for (const xJunction of [0.05, 0.3, 0.8]) {
    const base = { lam: 0.12, tm: 0.05, vh: 0.2, k: 0.05, txMode: 'pulse', dg: 30, xJunction };
    const plain = context.computeElec({ ...base, branches: 1 });
    for (const branches of [2, 3, 4]) {
      const split = context.computeElec({ ...base, branches });
      assertBounded(`electrical junction M=${branches}`, [split.Av, split.Ap]);
      for (let i = 0; i < plain.dArr.length; i++) {
        if (plain.dArr[i] <= xJunction) continue;
        assert.ok(split.Av[i] <= plain.Av[i] + 1e-9,
          `M=${branches} must not exceed the unbranched amplitude past x_J=${xJunction} (d=${plain.dArr[i]})`);
      }
    }
  }
}

// Eqs. (13)–(21): multi-species VOC encoding.
{
  const base = { d: 5, v: 0.2, tauLoss: 25, kon: 1, gamma: 0.01 };
  const silent = context.computeVOCSpecies({ ...base, N: 6, sigmaS: 0, sigmaL: 0, sigmaN: 0 });
  assert.equal(silent.detected, 0, 'a null stimulus vector must not trigger detection');
  for (const sp of silent.species) {
    assert.equal(sp.emission, 0, 'a null stimulus vector must produce zero emission');
    assert.equal(sp.occupancy, 0, 'a null stimulus vector must leave receptors unbound');
  }
  for (const N of [2, 6, 12]) {
    for (const sigma of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [0.3, 0.3, 0.9]]) {
      const r = context.computeVOCSpecies({ ...base, N, sigmaS: sigma[0], sigmaL: sigma[1], sigmaN: sigma[2] });
      assert.equal(r.species.length, N, 'the emission vector must span the declared repertoire');
      let best = -1, bestValue = -1;
      for (const sp of r.species) {
        assert.ok(Number.isFinite(sp.occupancy) && sp.occupancy >= 0 && sp.occupancy <= 1,
          `receptor occupancy must stay in [0, 1], got ${sp.occupancy}`);
        // Eq. (15) coefficients are three cosines 120 degrees apart, so they sum to 3/2.
        assert.ok(Math.abs(sp.a[0] + sp.a[1] + sp.a[2] - 1.5) < 1e-9,
          'stimulus-to-emission coupling must be a balanced three-phase pattern');
        for (const a of sp.a) assert.ok(a >= -1e-12 && a <= 1 + 1e-12, 'coupling weights must stay in [0, 1]');
        if (sp.occupancy > bestValue) { bestValue = sp.occupancy; best = sp.index; }
      }
      assert.equal(r.dominant, best, 'the dominant species must be the occupancy argmax');
      close(r.peakOccupancy, bestValue, 1e-12, 'peak occupancy must match the dominant species');
      assert.equal(r.detected, bestValue >= base.gamma ? 1 : 0, 'Eq. (21) must threshold the dominant VOC');
    }
  }
  // Raising every stimulus can only raise emission, hence occupancy.
  const low = context.computeVOCSpecies({ ...base, N: 6, sigmaS: 0.2, sigmaL: 0.2, sigmaN: 0.2 });
  const high = context.computeVOCSpecies({ ...base, N: 6, sigmaS: 0.9, sigmaL: 0.9, sigmaN: 0.9 });
  for (let i = 0; i < low.species.length; i++) {
    assert.ok(high.species[i].occupancy >= low.species[i].occupancy - 1e-12,
      'a stronger stimulus vector must not reduce receptor occupancy');
  }
}

// MTDM companion paper (Akyildiz et al., NANOCOM '26, doi 10.1145/3818305.3830272).
{
  const base = { N: 100, L: 4, kappa: 20, rUm: 10, MwMax: 204 };
  const m = context.computeMTDM(base);
  // Section 3: D_min ≈ 6.7e-10 m²/s from Stokes–Einstein, a 1.49× spread, T_s ≈ 0.49 s.
  close(m.Dmin, 6.7e-10, 0.05e-10, 'MTDM D_min (paper rounds to two figures)');
  close(m.spread, 1.49, 0.005, 'MTDM D spread');
  close(m.Ts, 0.49, 0.005, 'MTDM symbol period');
  // Section 2: kappa = 20 keeps one symbol's tail at the next sampling instant below 5% of peak.
  // From Eq. (1), h(t)/h(t_pk) = (t/t_pk)^(-3/2) e^{1.5(1 - t_pk/t)} with t = (k kappa + 1) t_pk.
  const tailRatio = u => Math.pow(u, -1.5) * Math.exp(1.5 * (1 - 1 / u));
  close(m.isi, tailRatio(21), 1e-12, 'MTDM one-symbol tail closed form');
  assert.ok(m.isi < 0.05, 'kappa = 20 must keep the one-symbol tail below 5%');
  // The worst-case sum over all earlier symbols is not small; check it against a much longer direct sum.
  let accum = 0;
  for (let k = 1; k <= 200000; k++) accum += tailRatio(20 * k + 1);
  accum += Math.exp(1.5) * Math.pow(20, -1.5) * 2 / Math.sqrt(200000.5);
  close(m.isiAccum, accum, 1e-4, 'MTDM accumulated worst-case tail');
  close(m.isiAccum, 0.1214, 0.001, 'MTDM accumulated tail at kappa = 20');
  // Table 1, bits/symbol (exact) and bps. The paper's bps use D_min rounded to 6.7e-10;
  // Stokes–Einstein gives 6.72e-10, so the tolerance is 0.6% of each value.
  const table = [['mosk', 6.6, 14], ['hybrid', 8.6, 18], ['mrsk', 198, 406], ['mtdm', 200, 410]];
  for (const [key, bits, bps] of table) {
    const s = m.schemes.find(x => x.key === key);
    close(s.bits, bits, 0.05, `Table 1 ${key} bits/symbol`);
    close(s.bps, bps, Math.max(0.6, 0.006 * bps), `Table 1 ${key} bps`);
  }
  // Fig. 2: published range N = 10…200; at N = 100 the five curves read 200, 100, 198, log2 400, log2 100.
  assert.equal(m.vsN.N[0], 10, 'Fig. 2 starts at N = 10');
  assert.equal(m.vsN.N.at(-1), 200, 'Fig. 2 ends at N = 200');
  const i100 = m.vsN.N.indexOf(100);
  for (const [key, want] of [['mtdm', 200], ['mtdm2', 100], ['mrsk', 198], ['hybrid', Math.log2(400)], ['mosk', Math.log2(100)]]) {
    close(m.vsN[key][i100], want, 1e-9, `Fig. 2 ${key} at N = 100`);
  }
  close(m.vsN.mtdm.at(-1), 400, 1e-9, 'Fig. 2 MTDM L=4 at N = 200');
  // Fig. 2 structure: MTDM leads MRSK by exactly log2 L, Hybrid leads MoSK by log2 L.
  for (let i = 0; i < m.vsN.N.length; i++) {
    close(m.vsN.mtdm[i] - m.vsN.mrsk[i], 2, 1e-9, 'MTDM − MRSK = log2 L');
    close(m.vsN.hybrid[i] - m.vsN.mosk[i], 2, 1e-9, 'Hybrid − MoSK = log2 L');
  }
  // Eq. (1) peaks at (r−a)²/(6D); Eq. (2) closed form matches the ratio of Eq. (1) curves.
  const { t, light, heavy, ratio } = m.cir;
  const argmax = arr => arr.reduce((bi, v, i) => v > arr[bi] ? i : bi, 0);
  close(t[argmax(light)], m.tLight, 2 * (t[1] - t[0]), 'Eq. (1) peak time, lightest species');
  close(t[argmax(heavy)], m.tHeavy, 2 * (t[1] - t[0]), 'Eq. (1) peak time, heaviest species');
  const x = 10e-6 - 0.1e-6;
  for (let i = 0; i < t.length; i += 37) {
    const eq2 = Math.sqrt(m.Dmin / m.Dmax) * Math.exp(-(x * x) / (4 * t[i]) * (1 / m.Dmax - 1 / m.Dmin));
    close(ratio[i] / eq2, 1, 1e-9, 'Eq. (2) ratio');
  }
  // Equal diffusion makes the ratio time-invariant.
  const flat = context.computeMTDM({ ...base, MwMax: 62 });
  for (const v of flat.cir.ratio) close(v, 1, 1e-9, 'equal-D ratio must be constant');
}

// Fig. 3. MTDM curves: digitized from the published figure (log10 BER). Tolerance 0.05 decades is about
// half the plotted line width on its six-decade axis. MRSK curves: this page's reconstruction, pinned by
// enumeration and structural checks only.
{
  const b = context.computeMTDMBER({ N: 100, L: 4, MwMax: 204, rUm: 10 });
  const fig3 = {
    mtdm2: [[2.5, -0.598], [6, -0.797], [10, -1.240], [13, -1.891], [16, -3.097]],
    mtdmL: [[4, -0.520], [9, -0.632], [16, -0.953], [20, -1.439], [24, -2.519], [27, -4.118]],
  };
  for (const [key, pts] of Object.entries(fig3)) {
    for (const [db, logBer] of pts) {
      close(Math.log10(interp(b.snrDb, b[key], db)), logBer, 0.05, `Fig. 3 ${key} at ${db} dB`);
    }
  }
  // The published MTDM curves are Gray PAM with constant Gaussian variance n̄_max; check the closed form.
  for (const [L, n] of [[2, 1], [4, 300], [8, 50]]) {
    const z = Math.sqrt(n) / (2 * (L - 1));
    let q = 0;                                            // Q(z) by midpoint quadrature, independent of mtdmQ
    for (let i = 0, h = 1e-4; i < 2e5; i++) { const x = z + (i + 0.5) * h; q += Math.exp(-x * x / 2) * h; }
    q /= Math.sqrt(2 * Math.PI);
    const want = 2 * (L - 1) / (L * Math.log2(L)) * q;
    close(context.mtdmPaperBER(L, n) / want, 1, 1e-6, `MTDM paper BER closed form, L=${L}`);
  }
  // Bounds hold everywhere. The MTDM curves are a decreasing Q-function for every L. For the page's own
  // ratio-keying reconstruction, monotonicity holds at these defaults only: a biased fixed decoder can
  // approach its wrong decision as noise falls (and the paper's own MRSK-on-VOC curve is not monotone).
  for (const key of ['mtdm2', 'mtdmL', 'mrskIdeal', 'mrskVOC']) {
    for (let i = 0; i < b.snrDb.length; i++) {
      assert.ok(b[key][i] >= 0 && b[key][i] <= 0.5 + 1e-9, `${key} must stay a probability ≤ 0.5`);
      if (i > 0) assert.ok(b[key][i] <= b[key][i - 1] + 1e-9, `${key} should not rise with SNR at the defaults`);
    }
  }
  // Independent brute-force enumeration of the ratio-keying reconstruction over small counts.
  const pois = (lam, k) => lam === 0 ? (k === 0 ? 1 : 0) : Math.exp(-lam + k * Math.log(lam) - lnFactorial(k));
  function lnFactorial(k) { let s = 0; for (let i = 2; i <= k; i++) s += Math.log(i); return s; }
  const grayBits = (u, v) => { let z = (u ^ (u >> 1)) ^ (v ^ (v >> 1)), c = 0; while (z) { c += z & 1; z >>= 1; } return c; };
  {
    const L = 4, n = 3;
    const got = context.computeMTDMBER({ N: 2, L, MwMax: 204, rUm: 10, snrDb: [10 * Math.log10(n)] });
    const B = got.bias[0];
    let err = 0;
    for (let s = 0; s < L; s++) {
      for (let nr = 0; nr <= 60; nr++) {
        const pr = pois(n, nr);
        if (nr === 0) { for (let m = 0; m < L; m++) err += pr * grayBits(s, m) / L; continue; }
        for (let nj = 0; nj <= 80; nj++) {
          let m = 0;                                      // largest level with nj/nr ≥ (m − ½)/(L − 1)
          for (let l = 1; l < L; l++) if (2 * (L - 1) * nj >= (2 * l - 1) * nr) m = l;
          err += pr * pois(n * B * s / (L - 1), nj) * grayBits(s, m);
        }
      }
    }
    close(got.mrskVOC[0], err / (L * Math.log2(L)), 1e-9, 'ratio keying brute force, one biased pair');
  }
  // High-SNR limit: noise vanishes and each biased pair follows the deterministic decision map
  // n_j/n_ref → B·s/(L−1). Convergence is slow for species whose biased ratio sits near a boundary,
  // so the 50 dB value is compared with the analytic limit to within 0.004.
  for (const L of [4, 8]) {
    const hi = context.computeMTDMBER({ N: 12, L, MwMax: 204, rUm: 10, snrDb: [50] });
    let limit = 0;
    for (const B of hi.bias) {
      for (let s = 0; s < L; s++) {
        let m = 0;
        for (let l = 1; l < L; l++) if (2 * (L - 1) * B * s / (L - 1) >= 2 * l - 1) m = l;
        limit += grayBits(s, m);
      }
    }
    limit /= hi.bias.length * L * Math.log2(L);
    close(hi.mrskVOC[0], limit, 0.004, `ratio keying high-SNR decision-map limit, L=${L}`);
  }
  // Exact midpoints go to the upper level without float drift: (4.5/7)·42 = 27.
  assert.equal(context.mtdmRatioLevelStart(5, 42, 8), 27, 'ratio boundary must use exact integer ceiling');
  const last = b.snrDb.length - 1, at20 = b.snrDb.indexOf(20);
  // Equal-D MRSK keeps improving; the fixed decoder on heterogeneous VOCs flattens into a floor.
  assert.ok(b.mrskIdeal[last] < 1e-4, 'equal-D MRSK must reach low BER at 30 dB');
  assert.ok(b.mrskVOC[last] > 1e-2, 'heterogeneous-D MRSK with a fixed decoder must floor');
  assert.ok(b.mrskVOC[at20] / b.mrskVOC[last] < 3, 'the heterogeneous-D floor must be nearly flat from 20 to 30 dB');
  assert.ok(b.mtdmL[last] < b.mrskVOC[last] * 1e-3, 'MTDM must not inherit the ratio bias');
  // Equal diffusion removes the bias: the two MRSK curves coincide.
  const eq = context.computeMTDMBER({ N: 12, L: 4, MwMax: 62, rUm: 10 });
  for (let i = 0; i < eq.snrDb.length; i++) close(eq.mrskVOC[i], eq.mrskIdeal[i], 1e-12, 'equal-D MRSK curves must coincide');
}

// Published-reference contract: the digitized MRSK curves of NANOCOM '26 Fig. 3 are presentation data
// below the BER banner, so they are read separately from the physics slice.
{
  const startRef = html.indexOf('const MTDM_FIG3_MRSK = {');
  const endRef = html.indexOf('};', startRef);
  assert.ok(startRef > html.indexOf('/* ════════════════════════════ BER'), 'reference data must stay outside the physics slice');
  const ref = vm.runInNewContext(`(${html.slice(startRef + 'const MTDM_FIG3_MRSK = '.length, endRef + 1)})`);
  const spec = { uniformD: [33, -4, 28], algaeVOC: [34, -4, 29] };
  for (const [key, [len, first, last]] of Object.entries(spec)) {
    const pts = ref[key];
    assert.equal(pts.length, len, `${key} sample count`);
    assert.equal(pts[0][0], first, `${key} first SNR`);
    assert.equal(pts.at(-1)[0], last, `${key} last SNR`);
    pts.forEach(([db, y], i) => {
      if (i) assert.equal(db - pts[i - 1][0], 1, `${key} samples must be consecutive 1-dB steps`);
      assert.ok(y <= 0 && y >= -6, `${key} must lie on the published six-decade axis`);
    });
  }
  // Ordinates independently re-measured from the raster during review (log10 BER, ±0.01).
  const checks = { uniformD: [[-4, -0.374], [15, -0.972], [20, -1.692], [28, -5.694]],
    algaeVOC: [[0, -0.355], [15, -0.472], [26, -0.331], [29, -0.304]] };
  for (const [key, pts] of Object.entries(checks)) {
    for (const [db, y] of pts) close(ref[key].find(p => p[0] === db)[1], y, 0.01, `${key} at ${db} dB`);
  }
}

console.log('physics regression checks passed');
