# Scientific model decisions

## 2026-10-10 — Add MTDM from NANOCOM '26 as a separate model in its own tab

**Decision.** Molecular Type Division Multiplexing (Akyildiz et al., NANOCOM '26, doi
10.1145/3818305.3830272) is implemented in its own MTDM tab (it began as a section at the bottom of the VOC tab), with
`computeMTDM` and `computeMTDMBER` inside the tested physics slice. It shares no parameter with the
Table II airborne VOC channel.

**Reason.** MTDM is a micrometre-scale link (3-D free diffusion to a fully absorbing receiver), not
the metre-scale advection channel of the journal paper. Sharing parameters would mix two models
that make different physical assumptions.

**Canonical parameters.** Table 1, Fig. 2 and Eqs. (1)–(2) are evaluated from their closed forms.
Diffusion coefficients follow Stokes–Einstein from DMS (62 Da, `D_max = 1e-9 m²/s`). The paper does
not say how intermediate species masses are distributed, so they are spaced linearly; this is the
only unreported convention. Because Stokes–Einstein gives `D_min = 6.72e-10 m²/s` where the paper
rounds to 6.7, the bps column differs from Table 1 by −2.3 % to +0.4 %.

**Fig. 3.** The paper names no detector. Its MTDM curves were identified by digitizing the figure as
Gray PAM with Gaussian noise of constant variance `n̄_max` (`mtdmPaperBER`), and eleven digitized
points are pinned within 0.05 decades. No decoder derivable from the paper or from Kilic & Akan
reproduces its MRSK curves, so the page computes its own Poisson ratio-keying reconstruction and
overlays the published MRSK curves as digitized markers (the paper is CC BY 4.0). The computed
algae-VOC floor (about 3e-2) does not match the published rise toward 0.5. The gap is documented,
not tuned away.

**Evidence impact.** New regression checks cover Table 1, the Fig. 2 structure, the Fig. 3 digitized
points and the published-reference overlay contract. No existing QS, VOC, electrical, optical or
BER baseline changed. The provenance ledger still covers the journal paper only.

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
