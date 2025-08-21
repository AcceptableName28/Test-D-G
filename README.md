# Dieline Editor — Prototype

This is a minimal, self‑contained prototype for building dielines with **exact dimensions**, **template presets**, **snap‑to editing**, **cut/crease/perf strokes** and a **basic manufacturing check**.

## How to run
1. Unzip.
2. Open `index.html` in a modern browser (Chrome/Edge/Firefox). No server needed.

## What’s included
- Templates (starter set): Reverse Tuck End (RTE), Mailer (0427‑style simplified), Sleeve. Add more via `TEMPLATES` in `app.js`.
- Exact dimensions in **mm** or **inches**.
- Material presets with **thickness (caliper)**; thickness is used for simple allowances and checks.
- Snap‑to: **grid** or **existing vertices**, plus **draggable** vertex handles.
- **Cut / Crease / Perf** rendered as **strokes** (0.25 pt). Colors are Illustrator‑friendly:
  - Cut: #FF0000
  - Crease: #00A0FF (dashed)
  - Perf: #FF7F00 (dashed)
- **Export SVG** and **DXF** (LINE entities on named layers). Both open in Adobe Illustrator for editing.

## Manufacturing checks (basic)
Rules implemented in `validate()`:
- Minimum glue flap: `max(10 mm, 3×caliper)` for paperboard; `max(20 mm, 4×caliper)` for corrugated.
- Tuck flap ≥ ~20% of panel length (guardrail).
- Panel minimums: L/W/H ≥ 15 mm.
- Parallel crease spacing ≥ 2× caliper.

> These are conservative guardrails — please tailor to your converter’s specs.

## Extending
- Add templates: push new objects to `TEMPLATES` with a `build(params, caliper)` function that returns `cut`, `crease`, `perf` arrays of segments.
- Add validations: extend `validate()`.
- Add export formats: see `exportSVG()` and `exportDXF()` as patterns.

## Illustrator usage
- Open exported **SVG** or **DXF**. Strokes are on layers: CUT, CREASE, PERF.
- (Optional) Map each color to a named **spot color** swatch if your workflow requires it (e.g., “CutContour”, “Crease”).

## Roadmap (next)
- More parametric templates (tuck‑top auto bottom, 4/6‑corner, gable, pillow, trays, hang tab, header card).
- User‑placed **tear/perf** segments with length & pitch control.
- **ZIP export** bundling SVG, DXF and a spec sheet (add JSZip or generate server‑side).
- Material **bending allowances** and **K‑factor** for corrugate.

