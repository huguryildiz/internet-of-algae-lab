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
| **Optical · Bioluminescence** | Inverse-square + Beer–Lambert channel (Petzold water types); flash waveform + Hill photoreceptor | cm–m — µs-to-ms |

Each tab has a **live particle animation** (press *Start* to watch molecules, voltage pulses, or
photons travel from the transmitter to the receiver, with arrival counters), plus
**attenuation-vs-distance** and **delay-vs-distance** curves computed in the browser directly from
the paper's equations and parameter tables (Tables I–IV). A *Compare* tab reproduces the
range–latency–energy comparison of the paper's §VIII.

## Faithfulness and scope

- The deterministic channel/receiver models, their parameters, and the *channel-only vs.
  end-to-end* distinction follow the reference paper. No figures are reproduced from the
  publication; every curve is recomputed from the equations.
- The particle animations are stochastic *visualizations* of the same transport physics, so the
  channel becomes visible; counters count those simulated particles.
- **The bit-error-rate panels are a teaching extension, not part of the paper.** The paper is
  deliberately deterministic and leaves noise/SNR/capacity analysis open (§X). The BER layer
  assumes on–off keying with additive Gaussian receiver noise, BER = Q(A/2σ), and is marked
  *"extension — not in paper"* wherever it appears.

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

## License

Code is released under the [MIT License](LICENSE). The reference paper is © IEEE and is **not**
included in this repository; please access it via the DOI above.
