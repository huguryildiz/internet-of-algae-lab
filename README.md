<!-- markdownlint-disable MD033 MD041 -->
<!-- Inline HTML is intentional: centered hero header and badge row. -->

<p align="center">
  <img src="assets/icon.svg" alt="Internet of Algae Lab logo" width="120" height="120">
</p>

<h1 align="center">Internet of Algae Lab</h1>

<p align="center">
  <strong>Interactive Channel Simulations for Photosynthetic Molecular Networks</strong><br>
  <sub>A single static page that turns the end-to-end algae communication models of Akyildiz et al. (IEEE TMBMC 2026) into live, parameter-driven simulations. Press Start and watch the molecules arrive.</sub>
</p>

<p align="center">
  <a href="https://algae-molecular-communication.vercel.app"><img src="https://img.shields.io/badge/algae--molecular--communication.vercel.app-020810?style=for-the-badge&logo=vercel&logoColor=3EF2A0" alt="The public page"></a>
  &nbsp;
  <a href="index.html"><img src="https://img.shields.io/badge/index.html-0F3040?style=for-the-badge&logo=html5&logoColor=FAF8F4" alt="The interactive page"></a>
  &nbsp;
  <img src="https://img.shields.io/badge/Static%20%C2%B7%20no%20build-0F3040?style=for-the-badge&logoColor=white" alt="Static, no build step">
  <img src="https://img.shields.io/badge/KaTeX%20vendored-0F3040?style=for-the-badge&logo=latex&logoColor=white" alt="KaTeX vendored">
  <img src="https://img.shields.io/badge/WebGL%20hero-0F3040?style=for-the-badge&logo=webgl&logoColor=3EF2A0" alt="WebGL bioluminescence hero">
  <a href="https://doi.org/10.1109/TMBMC.2026.3711050"><img src="https://img.shields.io/badge/IEEE%20TMBMC%202026%20%C2%B7%20doi-0F3040?style=for-the-badge&logoColor=white" alt="Reference paper DOI"></a>
  <img src="https://img.shields.io/badge/QS%20%C2%B7%20VOC%20%C2%B7%20Electrical%20%C2%B7%20Optical-0F3040?style=for-the-badge" alt="Four signaling modalities">
</p>

---

## Overview

Interactive, browser-based teaching simulations of the four communication channels that algae
colonies use — built as an educational companion to:

> I. F. Akyildiz, S. H. Sayin, E. I. Saygili, and B. D. Unluturk, **"The Internet of Algae:
> End-to-End Communication-Theoretic Models for Photosynthetic Molecular Networks,"** *IEEE
> Transactions on Molecular, Biological, and Multi-Scale Communications*, vol. 12, pp. 796–816,
> 2026. doi: [10.1109/TMBMC.2026.3711050](https://doi.org/10.1109/TMBMC.2026.3711050)

## What it does

One self-contained page (`index.html`) with a tab per signaling modality:

| Tab | Physics simulated | Range / latency niche |
| --- | --- | --- |
| **Quorum Sensing** | 1-D diffusion–reaction PDE with a logistic source; thresholded Michaelis–Menten receiver | mm — minutes-to-hours |
| **VOC · Airborne** | Closed-form advection–diffusion–decay Green's function; ligand–receptor binding ODE | m–km — seconds-to-minutes |
| **Electrical · Cable** | Reduced cable equation (live finite-difference solve); sigmoidal voltage-gated receiver | cm–m — ms-to-s |
| **Optical · Bioluminescence** | Inverse-square + Beer–Lambert channel (Petzold water types); flash waveform + Hill photoreceptor | cm–m — 153–254 ms in the paper's numerical figures |

Each tab has a **live particle animation** (press *Start* to watch molecules, voltage pulses, or
photons travel from the transmitter to the receiver, with arrival counters), plus
**attenuation-vs-distance** and **delay-vs-distance** curves recomputed in the browser from the
paper's equations, parameter tables, and the figure-reproduction conventions documented below.
A *Compare* tab reports both the paper's qualitative Table V category and the numerical optical
latency shown in Figs. 21 and 23.

## Faithfulness and scope

- The deterministic channel/receiver equations, tabulated parameters, and the *channel-only vs.
  end-to-end* distinction follow the reference paper. No figures are copied from the publication;
  every curve is recomputed.
- The paper does not tabulate every initial or source convention needed to regenerate its figures.
  The inverse-calibrated conventions are `N(0) = 0.003224 K` and a 1.47 boundary-cell source
  weight for QS; a `5e-8 M` reference concentration for the VOC impulse magnitude; and, for
  optical, a 0.15 s flash start plus a single `0.2445` scale standing in for the unreported
  absolute emitted irradiance. Everything else in the optical chain follows the paper directly:
  both delay metrics use its stated ρ = 0.5, the emitted signal is the Eq. (42) flash train with
  Table IV's [1.0, 1.1] amplitudes, and the end-to-end delay is integrated at every distance — its
  flatness is a photoreceptor-saturation result rather than an assumption. The published
  end-to-end *attenuation* still requires the quasi-steady Hill response; the finite-time
  relaxation peak misses that curve by ~2e-2, so Figs. 22 and 23 remain two conventions. These are
  numerical figure-reproduction conventions inferred from the plots, not independently measured
  biological parameters.
- Three blocks that the paper specifies but never plots are implemented here as documented
  reconstructions: the multi-species VOC encoder (Eqs. 13–21, including the stimulus vector,
  the coupling matrix and the bound-receptor codeword), the explicit ion-channel transmitter
  (Eqs. 28–29), and the branch-junction conditions (§VI-A-3). The paper tabulates no values for
  any of them and publishes no figure to check them against, so the regression suite pins them by
  structural invariants only, and their defaults leave the plotted curves untouched.
- **The bit-error-rate panels are a teaching extension, not part of the paper.** The paper is
  deliberately deterministic and leaves noise/SNR/capacity analysis open (§X). The BER layer
  assumes on–off keying with additive Gaussian receiver noise, BER = Q(A/2σ), and is marked
  *"extension — not in paper"* wherever it appears.
- The animated particle counters are stochastic illustrations. They are not Monte Carlo estimates
  of the deterministic attenuation and delay curves and should not be used as validation data.

## Running

It is a static site — no build step.

```bash
# any static server works, e.g.:
python3 -m http.server 8000
# then open http://localhost:8000
```

Opening `index.html` directly from the filesystem also works.

## Third-party components

- **[KaTeX](https://katex.org)** (MIT) — vendored under `assets/katex/` for math typesetting.
- **[Radiant Shaders](https://radiant-shaders.com)** "Bioluminescence" (MIT,
  [pbakaus/radiant](https://github.com/pbakaus/radiant)) — WebGL hero background, adapted and
  recolored to this page's palette (inline in `index.html`).
- Google Fonts: Newsreader, IBM Plex Sans, IBM Plex Mono (loaded from fonts.googleapis.com).

The reference paper (`reference.pdf`) is **not** checked in — it is listed in `.gitignore` and
kept only as a local comparison copy for numerical verification; access the paper via the DOI above.

## License

Code is released under the [MIT License](LICENSE). The reference paper is © IEEE and is not covered
by this repository's MIT license; use the DOI above for the publisher version.
