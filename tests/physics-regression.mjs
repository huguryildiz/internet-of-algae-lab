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

// Figs. 5–8: channel loss, channel delay, and decoded response remain finite at 6 mm.
const qs = context.computeQS({ D: 5e-10, tauLoss: 2, Cth: 1, Km: 1 });
close(interp(qs.dArr, qs.Ac, 3), 0.21, 0.02, 'QS A_C(3 mm)');
close(interp(qs.dArr, qs.Ac, 6), 0.04, 0.01, 'QS A_C(6 mm)');
close(interp(qs.dArr, qs.tC, 3), 60, 2, 'QS tau_C(3 mm)');
close(interp(qs.dArr, qs.Av, 6), 0.65, 0.04, 'QS A_v(6 mm)');
close(interp(qs.dArr, qs.tV, 6), 58, 2, 'QS tau_v(6 mm)');

// Figs. 10–13: normalized attenuation is bounded and the analytic peak time is d/v.
for (const v of [0.05, 0.2, 0.5, 1]) {
  const voc = context.computeVOC({ v, tauLoss: 25, kon: 1 });
  close(interp(voc.dArr, voc.ach, 10), Math.sqrt(0.5 / 10), 7e-4,
    `VOC alpha_ch(10 m), v=${v}`);
  close(interp(voc.dArr, voc.tch, 10), 10 / v, 0.02,
    `VOC tau_ch(10 m), v=${v}`);
  assert.ok(Math.max(...voc.ach) <= 1 + 1e-12, `VOC channel attenuation bounded, v=${v}`);
  assert.ok(Math.max(...voc.ae) <= 1 + 1e-12, `VOC end-to-end attenuation bounded, v=${v}`);
}

// Figs. 15–18: channel and decoded metrics are both present.
const electrical = context.computeElec({ lam: 0.12, tm: 0.05, vh: 0.2, k: 0.05 });
close(interp(electrical.dArr, electrical.Av, 0.4), 0.01, 0.003, 'electrical A_V(0.4 m)');
close(interp(electrical.dArr, electrical.tV, 0.4), 0.08, 0.005, 'electrical tau_V(0.4 m)');
assert.ok(Number.isFinite(interp(electrical.dArr, electrical.tP, 0.4)),
  'electrical end-to-end delay must be finite');

// Figs. 20–23: Beer–Lambert gain, saturated response, and absolute flash timing.
const optical = context.computeOpt({ d: 2, cext: 0.305, taur: 0.01, trec: 0.05, logKR: 5 });
close(10 * Math.log10(optical.gain(5, 0.305)), -131.6, 0.2, 'optical gain at 5 m');
close(interp(optical.dArr, optical.As, 5), 0.994, 0.006, 'optical A_S(5 m)');
close(optical.tI, 0.155, 0.001, 'optical channel delay');
close(interp(optical.dArr, optical.tS, 2), 0.185, 0.001, 'optical end-to-end delay');

const weakSaturation = context.computeOpt({ d: 2, cext: 0.305, taur: 0.01, trec: 0.05, logKR: Math.log10(5e5) });
close(interp(weakSaturation.dArr, weakSaturation.As, 5), 0.975, 0.006,
  'optical A_S(5 m), K_R=5e5');

for (const [trec, expected] of [[0.02, 0.164], [0.05, 0.185], [0.08, 0.205], [0.15, 0.254]]) {
  const result = context.computeOpt({ d: 2, cext: 0.305, taur: 0.01, trec, logKR: 5 });
  close(interp(result.dArr, result.tS, 2), expected, 0.005,
    `optical tau_S, tau_rec=${trec}`);
}

console.log('physics regression checks passed');
