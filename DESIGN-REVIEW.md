# Design Review — GRC Intelligence Engine

**Date:** 2026-06-24 · **Build:** v0.4.0 · **Status:** ✅ WCAG 2.1 AA across the reviewed surface

A UI/UX hardening pass run before putting the prototype in front of reviewers. The goal was an
auditor-grade interface: every assertion measurable, nothing conveyed by color alone, fully
keyboard- and motion-accessible.

## Methodology

1. **`ui-ux-pro-max` skill** — priority-ranked review across accessibility, touch/interaction,
   typography/color, layout, and data-density rules.
2. **Computed WCAG contrast** — every text/surface token pair calculated (relative-luminance
   formula), not eyeballed.
3. **21st.dev Magic MCP** — generated a reference Risk Register card; its best ideas were ported
   into the engine's native inline-style system (no Tailwind added).

---

## WCAG AA sign-off — measured contrast

All values are computed ratios against the actual surface tokens. AA requires **4.5:1** for normal
text, **3:1** for large text / UI glyphs.

| Token (use) | On panel `#161E26` | Verdict |
|---|---|---|
| `ink` `#E8EEF2` — primary text | 14.38 | AAA |
| `inkDim` `#93A4B1` — secondary text | 6.56 | AA |
| `inkFaint` `#7E8E9E` — labels/hints **(was `#5E6F7C` = 3.24 ❌)** | **5.01** | **AA (fixed)** |
| `red` `#E5544B` — Critical | 4.57 | AA |
| `amber` `#F5A623` — High / Corrective | 8.30 | AAA |
| `teal` `#46B3A4` — Medium / Preventive | 6.61 | AA |
| `violet` `#8B7FD6` — Detective | 4.89 | AA |

Primary text on the page background (`canvas #0E1419`) measures **15.84:1**.

---

## Findings & fixes (all applied)

### Accessibility (was critical)
- **Tertiary-text contrast** — `inkFaint` raised `#5E6F7C → #7E8E9E` (3.24 → 5.01:1). Lifts every
  mono label, "drill in" hint, timestamp, and section subtitle over the AA line. Placeholder text
  aligned to the same token.
- **Focus rings restored** — the hero `<textarea>` and Library filter `<input>` set inline
  `outline:none`, which overrode the global `*:focus-visible` ring (inline beats the pseudo-class).
  Removed, so keyboard focus is visible again (2px `#F5A623`, 2px offset).
- **Reduced motion** — added a `prefers-reduced-motion: reduce` block (neutralizes transitions,
  animations, and smooth scroll) plus a JS guard on the section-nav scroll. Previously unhandled.

### Touch & interaction
- **Target size** — ID chips raised to a measured **24px** min height; section-nav buttons to
  **32px**. Targets **WCAG 2.5.8 (AA, 24px)** deliberately — 44px (mobile/AAA) is wrong for a
  desktop-first data grid and would destroy density.
- **Color-not-by-alone** — severity now carries a **distinct shape** as well as color and label:
  ▲ Critical · ◆ High · ● Medium · — Low (`SevIcon`, dependency-free SVG, on 26 rating pills).
  Color-blind reviewers can read severity without hue.

### Typography & polish
- **Tabular figures** — data figures use IBM Plex Mono (inherently tabular); `tabular-nums` added
  explicitly to the risk-card ID and meta row so nothing shifts.
- **Spacing** — shared `Card` snapped to the 8pt grid (radius 12, padding 14×16). The scale was
  already ~90% consistent, so this was kept surgical.

### Brand
- **Logo** — replaced the generic gradient "G" tile with a **3-node graph triad** mark: the engine's
  thesis is a navigable risk↔control↔framework knowledge graph, so the mark now says that. (Magic's
  `logo_search` is a company brand-logo library and correctly returned nothing for a fictional
  product — a custom mark was the right call.)

---

## Magic MCP contribution

Magic generated a Risk Register card (React/Tailwind/shadcn). Three ideas were ported to the
engine-native card:
1. **Severity icon inside both pills** (inherent → residual).
2. **Chevron "Inspect ›" affordance** that warms and nudges 3px on card hover/focus (respects
   reduced-motion).
3. **`line-clamp-2` on statements** → uniform card heights, a more scannable register.

---

## Design tokens (source of truth: `src/App.jsx` → `C`)

| Group | Tokens |
|---|---|
| Surfaces | `canvas #0E1419` · `panel #161E26` · `panelHi #1D2832` · `line #26333F` |
| Text | `ink #E8EEF2` · `inkDim #93A4B1` · `inkFaint #7E8E9E` |
| Status | severity: red/amber/teal/inkDim · control-type: teal (Preventive) / violet (Detective) / amber (Corrective) |
| Focus | `#F5A623`, 2px, 2px offset (never override on inputs) |
| Type | Inter (UI) + IBM Plex Mono (data/IDs) — kept deliberately; it already follows mono-for-data, sans-for-labels |

---

## Intentionally NOT changed

- **List virtualization** — the generated package is a *document*. Virtualizing it would break
  Ctrl-F, print, and the standalone HTML export. Keeping it in the DOM is correct; the sticky
  section nav is what makes the length navigable.
- **Font pairing** — the skill suggested Fira Code/Fira Sans; Inter + IBM Plex Mono is a more
  refined pairing on the same principle. Not changed.

---

## Reproduce the review

```bash
# Contrast + skill review tooling
/ui-ux-pro-max                      # the design-intelligence skill (priority-ranked rules)
# Magic MCP (component generation):  21st_magic_component_builder / _refiner / logo_search
npm run build                       # ~98 KB gzip, no Tailwind, no backend
```
