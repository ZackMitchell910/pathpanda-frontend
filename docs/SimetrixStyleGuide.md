# Simetrix Visual & Experience Language

This guide captures the core design language that runs across the Simetrix product family (Marketing/Landing, Prediction Dashboard, Market Simulator, AI Trader, and forthcoming surfaces). Treat it as the baseline when standing up new experiences so every touchpoint feels unmistakably Simetrix.

---

## Brand Pillars

- **Sci‑grade credibility** – interface choices should feel like purpose-built analyst tools, never skeuomorphic or playful. Favor clarity, data density, and restrained animation.
- **Command precision** – borrow visual tropes from operator consoles: dark substrates, subtle grid outlines, accent glows used sparingly to highlight interactivity.
- **Explainable intelligence** – every visual flourish must reinforce understanding (tooltips, legends, contextual copy). Avoid decoration without narrative.
- **Composable surfaces** – design primitives must be reusable between platforms; the same card shell or metric tile should drop into Admin, Trader, or Marketing with minimal tweaks.

---

## Core Palette

| Token                | Hex        | Usage                                                                 |
| -------------------- | ---------- | --------------------------------------------------------------------- |
| `ink-1000`           | `#020304`  | Page background, full-screen canvases (Trader, App shell).           |
| `ink-900`            | `#040607`  | Primary surface; ensures depth without pure black.                   |
| `ink-800`            | `#090b0d`  | Card backgrounds, drawers, modals.                                   |
| `ink-700`            | `#0a0d0f`  | Nested surfaces, headers, inline widgets.                            |
| `ink-600`            | `#0c1012`  | Buttons, filter pills, dense UI chrome.                              |
| `accent-emerald`     | `#7bc89d`  | Positive state (PnL up, “Passing” badges). Apply at 60–70% opacity.  |
| `accent-forest`      | `#3d6550`  | Border highlights / pills when accent needed without neon.           |
| `accent-amber`       | `#f0b35a`  | Warnings (latency spikes, guardrail notices).                        |
| `accent-rose`        | `#f18795`  | Errors, risk/guardrail halts, negative PnL.                          |
| `neutral-400`        | `#c1c7cd`  | Mid-line dividers, inactive timeline tokens, captions.               |
| `neutral-200`        | `#e1e4e8`  | Rare highlight on light backgrounds (marketing hero only).          |

**Gradients:** use muted green gradients (`from #2b4733 → via #22392c → to #1a2a21`) purely for progress bars, risk meters, or card backgrounds requiring depth; avoid rainbow gradients.

---

## Typography

- **Brand Headline:** `font-brand` (adopts custom high-contrast serif used on landing hero). Only for major headlines.
- **Core UI:** `Inter` stack: `Inter, "Segoe UI", system-ui`.
- **Weights:** `700` for titles, `600` for card headings, `500` for primary labels, `400` for body. Resist light weights (`<400`).
- **Tracking:** uppercase chips use wide tracking (0.28–0.3em) to evoke instrumentation labels.

---

## Layout & Spacing

- Global page gutters: `max-w-7xl` with `px-6 md:px-8`.
- Standard vertical rhythm: `py-6` for sections inside dashboards, `py-16+` for marketing/Docs.
- Grid preference: responsive `grid-cols-1` → `md:grid-cols-2` → `xl:grid-cols-4` for cards; keep consistent breakpoints across apps.
- Cards: `rounded-2xl`, `border border-white/10`, background derived from palette table. Avoid drop shadows heavier than `shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]`.
- Dividers: use `border-white/10` or `bg-white/10` lines; stay away from solid white.

---

## Motion & Interaction

- **Hover:** subtle translate (`y: -4`) and `border-white/20` highlight on interactive cards.
- **Tap:** slight scale down (`0.99`) for button-like cards, easing `spring` with high stiffness for responsiveness.
- **Glows:** marketing nav uses radial blue glow; operational surfaces switch to very faint green glows (opacity ≤ 0.2) only on critical CTAs.
- **Toasts/alerts:** use `react-hot-toast` with accent-matched background; keep copy terse.

---

## Platform Nuances

### Landing / Marketing
- Background layering: noise overlays, gentle gradients, minimal grid lines.
- Use white text at ~80% opacity; reserve pure white for headlines and call-to-action copy.
- Cards may use `bg-white/5` to lighten; maintain compatibility with hero fan chart.
- Interactivity: more pronounced motion (Framer staggering, hero transitions).

### Prediction Dashboard (`/app`)
- Layout anchored around card stacks with lazy-loaded charts.
- Heavy usage of `Card`, `CardHeader`, `CardContent` primitives from `@/components/ui`.
- Chart fallbacks use text overlays (`text-white/60`) on dark background.
- Buttons: rectangular, border-driven, avoid filled backgrounds unless primary action.

### Market Simulator (`/market-simulator`)
- “Coming soon” variant mirrors landing palette with amber CTA chips.
- Once live, reuse simulation card primitives; emphasise scenario tags with amber gradients.

### AI Trader (`/trader`)
- Uses deepest blacks (`ink-1000`, `ink-900`) and muted sage highlights.
- Metrics rely on sparklines (`text-[#6abf8b]`), progress meters with forest gradients, and timeline split (Events vs Alerts).
- Details drawer features runbook, ensuring operations have contextual access.
- Filter pills: default `bg-[#0c1012]` + `border-white/10`, selected `border-[#3d6550]/40` with soft green text.

### Admin (`/admin`)
- Shares design tokens with Trader but leans on structured tables, audit logs.
- Incorporates cautionary color ramp more heavily (amber/rose).

---

## Components & Patterns

- **Cards:** wrap in `<Card>` utility; always include header + content; footers optional.
- **Pills:** uppercase, `text-xs`, `tracking-wide`, backgrounds `bg-white/10` (neutral) or accent-specific.
- **Tables:** prefer condensed tables with subtle zebra via `bg-white/[0.02]`; header text `text-white/50`.
- **Timeline events:** left accent dot with tone color; content box `bg-[#0a0d0f]`, hover scale `1.01`.
- **Buttons:** default size `px-3 py-1.5`, border first. Filled buttons only for CTA (landing) or destructive/primary (use accent colors).
- **Drawers/Modals:** `bg-[#0b141c]`, `border-white/10`, apply `backdrop-blur-sm`.

---

## Voice & Microcopy

- **Tone:** authoritative, succinct, never verbose; use action verbs: “Launch”, “Monitor”, “Reset”.
- **Labels:** prefer domain language (PnL, guardrail, latency) to generic alternatives.
- **Runbook copy:** instructive, written for operators; include direct actions (“request reset”, “poll /health”).
- **Tooltips:** optional but recommended for metrics that need formula context.

---

## Implementation Checklist

1. Import shared tokens (tailwind classes or CSS vars) before building new modules.
2. Start from existing primitives (`Card`, `LoadingButton`, `InfoTooltip`, `QuotaCard`).
3. Keep interaction states (hover, focus, disabled) consistent with existing components.
4. Validate dark mode contrast (aim for AA on text with backgrounds).
5. Add story/tests for new visual elements to ensure regressions are caught early.

---

Use this document as the canonical reference. When expanding to new modules or services, propose additions here before diverging—consistency keeps Simetrix recognisable whether you’re on the marketing hero, the prediction console, or the live trading desk.

