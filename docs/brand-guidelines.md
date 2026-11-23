# ACADNEX — Brand Guidelines

**Brand:** ACADNEX · Academic Performance Intelligence Platform
**Category:** Academic Intelligence & Analytics
**Tagline:** Academic Intelligence. Elevated.
**Personality:** Professional, intelligent, trustworthy, modern, data-driven.

---

## Colour system

| Token | Hex | Role |
|---|---|---|
| Midnight Navy | `#080D1B` | Application background |
| Deep Navy | `#0D1426` | Sidebar, cards, panels |
| Electric Blue | `#2563EB` | Primary actions |
| Neon Cyan | `#22D3EE` | Highlights, active states |
| Soft White | `#F1F5F9` | Primary text |
| Slate Grey | `#94A3B8` | Secondary text |
| Success Green | `#22C55E` | Positive performance |
| Warning Amber | `#F59E0B` | Attention |
| Alert Red | `#EF4444` | Critical alerts |

These are declared once as CSS variables in `src/app/globals.css` and exposed to
Tailwind through the `@theme` block. Use the variables (`--brand-*`) rather than
raw hex values in new UI.

## Logo

- `public/brand/acadnex-icon.svg` — standalone mark (dark surfaces).
- `public/brand/acadnex-logo-dark.svg` — full wordmark for dark surfaces.
- `public/brand/acadnex-logo-light.svg` — full wordmark for light surfaces.
- `src/app/icon.svg` + `src/app/favicon.ico` — app icons. Regenerate the ICO with
  `python scripts/generate-favicon.py` (requires Pillow).

The mark is an ascending data progression: three bars of increasing height crossed
by a rising line with a cyan endpoint. It expresses growth, analytics and forward
motion without graduation-cap or brain clichés. In React, use `BrandMark` /
`BrandLogo` from `src/components/brand.tsx` — the same geometry is drawn by
`src/lib/progress-report.ts` for the PDF.

**Clear space:** keep at least one icon-height of padding around the mark.
**Minimum size:** 24 px for the icon, 120 px wide for the full wordmark.

## Typography & voice

- Headings: tight tracking, semibold/bold, sentence case in product UI.
- Body: neutral, 13–14 px in dense data views, generous line-height.
- Numerals: tabular alignment in tables and KPI cards.
- Voice: precise and calm. State the number and its meaning; never invent data.

## Data integrity

Every statistic in ACADNEX is read from Postgres. No demo/mock values are rendered
as real. Audit logs stay append-only, and marks are never scaled or converted —
all exam types are recorded and displayed out of 100.
