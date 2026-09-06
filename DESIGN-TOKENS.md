# SkinPhD Confirm design tokens

What the UI actually uses today, named so the next change reuses these instead of picking a new arbitrary value. This documents the system in `src/styles.css`, `src/components/ui/button.tsx`, `src/components/ui/card.tsx`, and `src/components/workspace.tsx`.

## Color

Defined in `src/styles.css` under `@theme`. Use these, not hex codes, in new UI.

- `--color-forest` / `--color-forest-dark` — sidebar gradient, `Button` `dark` variant
- `--color-accent` / `--color-accent-hover` — links, focus rings, `Button` `primary` variant
- `--color-gold` / `--color-gold-hover` / `--color-gold-soft` / `--color-gold-fg` — the secondary accent (2026-09). Decorative/delight use only: the sign-in step markers, the sign-in card's mark, the "Remind" desk tile when reminders are due, `Button` `gold` variant. Deliberately kept separate from `--color-warn-*`/`--color-status-amber-*` so decorative gold is never confused with the warning semantic — don't reach for gold to mean "caution."
- `--color-ink` — body text
- `--color-muted` — secondary text, captions, table headers (darkened 2026-09 to clear WCAG AA at small sizes — keep it at or above this darkness)
- `--color-line` — borders
- `--color-paper` / `--color-ground` / `--color-sage` — surfaces, from lightest to the pale-green card fill
- `--color-sidebar-text` / `--color-sidebar-soft` / `--color-sidebar-label` — text on the dark sidebar only
- `--color-warn-*`, `--color-danger-*` — the amber legal-boundary banner, `Button` `danger` variant
- `--color-status-{amber,blue,violet,green,red,slate}-{bg,fg}` — agreement status pills (`STATUS_TONE` in `src/lib/confirm/rules.ts` maps status to one of these)

## Buttons — use the `Button` component

`src/components/ui/button.tsx` (cva-based). Every actionable button in the app goes through it —
don't hand-roll a new one. Variants:

| Variant | Use for |
|---|---|
| `primary` (default) | the main action in a form or panel |
| `dark` | forest-green, for buttons that need to sit on a light card but read as equally weighted to primary (rare — check before reaching for this over `primary`) |
| `secondary` | Cancel/Close, "Edit", anything next to a primary action |
| `ghost` | text-only actions like "Create new →", inline links |
| `danger` | Decline, Delete, destructive actions |
| `gold` | the secondary accent — rare, intentional, not a default choice |

Sizes: `sm` (min-h-9), `md` (min-h-10, default), `lg` (min-h-11, for the sign-in submit and the
sign/decline panel). Hover, disabled, and the press/focus treatment from the base layer all come
free — pass a `variant`/`size` and nothing else.

**Deliberately left outside `Button`** — these look like buttons but aren't CTAs, they're
data-bound compound elements with their own layout: the "Who signs next" desk filter tiles, the
Home queue row (the whole row is the click target), the Agreements table row action isn't one of
these — that one *does* use `Button`. Sidebar nav items and the desk "Clear filter" pill are also
bespoke. If you're adding a new bordered/colored clickable thing, ask whether it's an action
(→ `Button`) or a data tile (→ bespoke, matching the patterns above) before copying either.

## Cards — use the `Card` component where it fits

`src/components/ui/card.tsx`. `radius`: `tile` (rounded-2xl) or `section` (rounded-3xl, default).
`elevation`: `flat`/`sm`/`md`/`lg`. `padding`: `none` (default)/`sm`/`md`. Not every bordered
container has been migrated to it yet — the Staff directory cards and the sign-in card use it; most
page-level `<section>`s still use the raw classes because they carry conditional/compound className
logic `cva` doesn't fit cleanly. Prefer `Card` for a new simple bordered box; keep hand-rolling
sections whose classes are already assembled with `cn(...)` conditionals.

## Shadows — a real elevation scale

`--shadow-xs/sm/md/lg` and `--shadow-glow` in `@theme`. Tailwind v4's `--shadow-*` keys redefine
the matching utility the same way `--radius-*` does — so plain `shadow-sm`/`shadow-md`/`shadow-lg`
classes anywhere in the app already pick these up, not Tailwind's stock values. Use the plain
utility classes, not an arbitrary `shadow-[...]` string — the one arbitrary shadow still in the
codebase (the sidebar's horizontal-offset shadow) stays arbitrary on purpose, it's a directional
shadow, not a card elevation, and doesn't fit the scale.

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
**11.2px**, not Tailwind's stock 6px. That token drives `Button` and every other `rounded-md`
element (~109 uses). Deleting it as "unused" would silently reshape most of the app. Measured
values:

| Class | Computes to | Used for |
|---|---|---|
| `rounded-md` | 11.2px (`--radius-md`) | `Button`, inputs, small controls — the default |
| `rounded-xl` | 12px | modal container, sign-in inputs, nested cards |
| `rounded-lg` | 16px (`--radius-lg`) | not used directly |
| `rounded-2xl` | 16px | stat tiles, stat cards, `Card radius="tile"` |
| `rounded-3xl` | 24px | page-level sections, `Card radius="section"` (default) |
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

Every interactive element gets a hover state; `Button` gives you this for free. The base layer in
`styles.css` animates `background-color`, `border-color`, `box-shadow` and `transform` over 0.16s
on buttons and inputs, and gives `:active` a `scale(0.98)` press. Focus rings are handled globally
by the `:focus-visible` rule; do not override them.

For the bespoke elements that intentionally sit outside `Button` (see above):

| Element | Default | Hover |
|---|---|---|
| Table + queue row | transparent | `transition-colors hover:bg-sage/40` (queue uses `/60`) |
| Stat / summary card | `shadow-sm` | `hover:-translate-y-0.5 hover:shadow-md` |
| Sidebar nav item | `text-sidebar-text` | `hover:bg-white/8 hover:text-paper` |
| Desk filter tile (has a value) | `bg-sage text-ink` (or `bg-gold-soft` for "remind") | `hover:bg-forest hover:text-paper` |

## Known drift (not fixed here)

- Radius: five class names resolve to three distinct values (`md`≈`xl`, `lg`==`2xl`). Collapsing the
  aliases would be a no-op visually (0.8px at most) but touches ~10 call sites for no user-visible
  gain, so it is recorded rather than done.
- Type: a few one-off heading combos exist outside the two dominant patterns.
- Not every bordered container is a `Card` yet — see the Cards section above.

None of these block anything today. If a broader pass to collapse them is wanted, it's a separate, larger diff — flag it rather than drifting further when touching nearby code.
