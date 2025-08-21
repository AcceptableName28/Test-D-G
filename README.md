
# Dieline Lab Pro (React + TypeScript)

A fuller prototype of an adaptive dieline UI with live SVG, export, presets, and JSON save/load.

## Quick start
```bash
npm i
npm run dev
```

## Features
- Field matrix with dynamic show/hide (top/bottom styles).
- Presets: RTE+Snap, STE+Auto, Mailer (TTAB).
- Window cutout with rounded corners on a chosen panel.
- Thumb notch (toggle + width).
- Corrugated mode flag (wire up downstream rules as needed).
- Dimension overlay with arrows and labels.
- Export **SVG** and **PNG** (client-side).
- Save/Load state as **JSON** for QA and sharing.
- Vitest unit tests for dimension math.
- GitHub Actions: CI and Pages deploy.

## Build & Deploy
```bash
npm run build
npm run preview  # local preview of dist
```

To deploy on GitHub Pages, keep the included workflow and enable Pages → GitHub Actions in repo settings.

## Where to extend
- Add SRP tear lines, hanger tab, score compensation, and full DXF/PDF export.
- Refactor `buildDielineSVG` into a geometry model that can emit both SVG and DXF.
- Add Storybook or Playwright visual tests for presets.
