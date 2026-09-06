# SkinPhD Confirm design tokens

What the UI actually uses today, named so the next change reuses these instead of picking a new arbitrary value. This documents the existing system in `src/styles.css` and `src/components/workspace.tsx` — it does not change any of it.

## Color

Defined in `src/styles.css` under `@theme`. Use these, not hex codes, in new UI.

- `--color-forest` / `--color-forest-dark` — sidebar gradient, primary buttons
- `--color-accent` / `--color-accent-hover` — links, focus rings, active state
- `--color-ink` — body text
- `--color-muted` — secondary text, captions, table headers (darkened 2026-09 to clear WCAG AA at small sizes — keep it at or above this darkness)
- `--color-line` — borders
- `--color-paper` / `--color-ground` / `--color-sage` — surfaces, from lightest to the pale-green card fill
- `--color-sidebar-text` / `--color-sidebar-soft` / `--color-sidebar-label` — text on the dark sidebar only
- `--color-warn-*`, `--color-danger-*` — the amber legal-boundary banner, destructive actions
- `--color-status-{amber,blue,violet,green,red,slate}-{bg,fg}` — agreement status pills (`STATUS_TONE` in `src/lib/confirm/rules.ts` maps status to one of these)

## Type

No custom font-size tokens exist — everything below is a Tailwind utility combo. These are the ones already in repeated use; treat them as the de facto scale.

| Role | Classes | Where |
|---|---|---|
| Page heading | `font-display text-3xl font-medium` (stat numbers use the same combo) | Home hero, desk tile numbers |
| Section heading | `font-display text-xl font-medium` | the large majority of card/section titles — the default for any new section header |
| Eyebrow / kicker | `text-[10px] font-extrabold tracking-[0.1em] uppercase text-muted` | above nearly every heading |
| Body | `text-sm` | form labels, descriptions |
| Table / list meta | `text-[11px]` or `text-[12px]` | row captions, secondary info |
| Smallest badges | `text-[9px]` | count pills only |

`text-[13px]` appears 3 times and doesn't map to a clear role — treat as a one-off, not a pattern to repeat. A handful of headings (`text-lg font-semibold`, `text-lg font-bold`, `text-2xl font-semibold`, `text-sm font-bold`) are similar one-off drift from the two dominant combos above; not worth a mass find-replace, but new headings should use the dominant combos, not add a fifth variant.

## Radius

**`--radius-md` and `--radius-lg` are load-bearing.** Under Tailwind v4, a `--radius-*` entry in
`@theme` redefines the matching utility — so `--radius-md: 0.7rem` makes `rounded-md` compute to
**11.2px**, not Tailwind's stock 6px. That one token drives all ~109 `rounded-md` elements.
Deleting it as "unused" would silently reshape most of the app. Measured values:

| Class | Computes to | Used for |
|---|---|---|
| `rounded-md` | 11.2px (`--radius-md`) | buttons, inputs, small controls — ~109 uses |
| `rounded-xl` | 12px | modal container, sign-in controls, nested cards |
| `rounded-lg` | 16px (`--radius-lg`) | not used directly |
| `rounded-2xl` | 16px | stat tiles, stat cards, the sign-in card |
| `rounded-3xl` | 24px | page-level sections — ~14 uses |
| `rounded-full` | — | pills, avatars, circular badges |

Five names, three real tiers: `md`≈`xl` (within 0.8px) and `lg`==`2xl` (identical). The grouping in
use is nonetheless coherent — controls small, tiles medium, page sections large — so prefer
`rounded-md` for controls, `rounded-2xl` for tiles/cards, `rounded-3xl` for page sections, and treat
`rounded-xl`/`rounded-lg` as aliases not worth introducing in new code.

## Spacing

No custom spacing tokens; Tailwind's default 4px-based scale is the standard, used consistently:

- Card padding: `p-5` (20px) is the norm for a card interior
- Section/row padding: `px-5 py-4` or `px-6 py-5`
- Gaps: `gap-2` and `gap-3` dominate; `gap-1` for tight label+value pairs
- Consent/legal copy blocks: keep clickable labels at `py-1` minimum around the text so the tap target isn't just the control (see the sign-consent checkbox in `workspace.tsx`)

## Interactive states

Every interactive element gets a hover state. The base layer in `styles.css` already animates
`background-color`, `border-color`, `box-shadow` and `transform` over 0.16s on buttons and inputs,
and gives `:active` a `scale(0.98)` press — so adding a hover class is all that is needed for it
to animate. Focus rings are handled globally by the `:focus-visible` rule; do not override them.

| Element | Default | Hover |
|---|---|---|
| Primary button | `bg-accent text-paper` | `hover:bg-accent-hover` |
| Secondary / outline button | `border-line bg-paper text-accent` | `hover:border-accent hover:bg-ground` |
| Quiet / icon button | `border-line bg-paper text-muted` | `hover:bg-ground hover:text-ink` |
| Table + queue row | transparent | `transition-colors hover:bg-sage/40` (queue uses `/60`) |
| Stat / summary card | `shadow-[0_8px_24px_...]` | `hover:-translate-y-0.5` + deeper shadow |
| Sidebar nav item | `text-sidebar-text` | `hover:bg-white/8 hover:text-paper` |

`--color-accent-hover` exists for exactly one purpose: the primary-button hover. Use it there and
nowhere else.

## Known drift (not fixed here)

- **No shared `Button` element.** All 43 buttons are hand-rolled inline in `workspace.tsx`, which
  is why hover states had to be applied signature-by-signature rather than in one place. A real
  `<Button variant>` component is the correct fix, but it is a 43-call-site refactor — out of scope
  for incremental work. Until then, copy the signatures in the table above rather than inventing new ones.
- Radius: five class names resolve to three distinct values (`md`≈`xl`, `lg`==`2xl`). Collapsing the
  aliases would be a no-op visually (0.8px at most) but touches ~10 call sites for no user-visible
  gain, so it is recorded rather than done.
- Type: a few one-off heading combos exist outside the two dominant patterns.

None of these block anything today. If a broader pass to collapse them is wanted, it's a separate, larger diff — flag it rather than drifting further when touching nearby code.
