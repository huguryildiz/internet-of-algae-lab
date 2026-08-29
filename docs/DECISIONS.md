# Scientific model decisions

## 2026-08-29 — Separate literal Eq. (53) from the Figure 22 reconstruction

**Decision.** The canonical optical end-to-end attenuation output is now the dynamic peak ratio
defined by Eqs. (47), (50), and (53). The quasi-steady Hill calculation remains available under
the separate name `AsFigure` solely to reproduce Fig. 22. The interface plots both curves.

**Reason.** A single hidden convention cannot simultaneously claim literal equation fidelity and
agreement with Fig. 22. At `K_R = 5e5` and `d = 5 m`, the dynamic result is approximately 0.923,
whereas the quasi-steady reconstruction is approximately 0.973.

**Canonical parameters.** No physical default changed. The existing inferred irradiance scale,
flash timing, and all Table I–IV defaults are preserved. Only the interpretation of the primary
`As` output changed; the old figure-calibrated result remains explicitly available as `AsFigure`.

**Evidence impact.** Fig. 22 regression checks now target `AsFigure`; a separate correctness check
pins the dynamic Eq. (53) result and requires the two paths to remain materially distinct. Existing
QS, VOC, electrical, optical channel, and delay baselines remain unchanged.
