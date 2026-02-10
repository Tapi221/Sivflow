# CardShell / Paper Mode Specification

Last updated: 2026-02-09

## Purpose

Unify full-screen card rendering around a 4:3 "paper" baseline while keeping content flexible:

- The card has a 4:3 *base minimum height* (not a fixed aspect ratio).
- Content may extend vertically, but past a shared cap the card scrolls *internally*.
- Action icons (link/audio/etc.) stay fixed in an overlay and never scroll away.
- Device behavior differs by intent:
  - iPad/tablet: drawing-first -> treat the card as a fixed-size paper.
  - phone: viewing-first -> follow viewport width by default (no horizontal scroll).
  - phone drawing mode: exception -> same fixed paper size as iPad, operated via pan + pinch-zoom (no scrollbars).

## Terms

- **Base width (W)**: the card’s effective layout width.
- **Base min-height (Hmin)**: the guaranteed minimum height derived from W.
  - `Hmin = W * 3/4` (4:3 baseline)
- **Shell**: the outer card container (responsible for sizing, max-height, overlay).
- **Body**: the scrollable content region inside the shell.
- **Paper mode**: fixed paper sizing for drawing-oriented experiences.
- **Draw mode**: pan/zoom interaction mode (used mainly on phones for paper mode).

## Requirements

### R1. 4:3 baseline as min-height

- Guarantee `min-height: W * 3/4`.
- Do **not** use `aspect-ratio` for the outer card, because the card is allowed to grow vertically when content increases.

### R2. Prevent unbounded growth + internal scrolling

- The shell has a shared `max-height` across screens.
- If content exceeds this cap, **only the Body scrolls**.
- Shell layout rules:
  - shell: `display:flex; flex-direction:column`
  - body: `flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain`

### R3. Title is outside CardShell

- CardShell must never render the title.
- Screens decide where/how to show a title (for list views, show it above the paper when desired).

### R4. Fixed action overlay

- Actions are rendered in an overlay fixed to the shell (top-right).
- Overlay uses `position:absolute` (shell is `relative`) + `z-index`.
- Body must include top padding to avoid content being hidden under the overlay (e.g. `pt-12`).
- Design rule: show at most **2** actions directly; remaining actions go into a `...` overflow menu.

### R5. Consistency across screens

- All major card presentations should compose the same `CardShell`:
  - lists (folders/explorer/search/recent/etc.)
  - detail/review
  - edit preview

## Device Behavior

### Tablet / iPad (paper as default)

- Treat the card as a fixed paper size, based on `--card-base-width` (default `640px`).
- The 4:3 baseline is computed from the fixed width (e.g. `640x480` base), but the card may still grow vertically until `--card-max-height`, after which the Body scrolls.

### Phone (default viewing mode)

- Default behavior is **no horizontal scroll**:
  - the card width follows the viewport (`width: 100%`)
  - 4:3 is kept as a baseline min-height derived from the actual rendered width.

### Phone (drawing mode exception)

- Use the same fixed paper sizing as tablet (paper mode).
- The paper is operated by **pan + pinch-zoom**:
  - no horizontal scrollbars
  - the user moves the paper inside a viewport and scales it

## Implementation (Current)

### Components

- `src/Components/card/CardShell.tsx`
  - Owns sizing, max-height, body scrolling, action overlay.
  - Computes `--card-w` using `ResizeObserver` from the shell element’s width.
  - Supports `drawMode?: boolean`:
    - When `drawMode=false`: normal shell (body scroll).
    - When `drawMode=true`: renders a `card-shell-viewport` wrapper with a pan/zoom transform layer.
    - Overlay remains fixed to the paper (inside the transformed shell).

- `src/Components/card/Flashcard.tsx`
  - Uses `CardShell` for the card body.
  - Supports `drawMode?: boolean` and forwards it to `CardShell`.
  - Current default: if `drawMode` is not provided, enable on **phone + preview mode**.

- `src/Components/card/CardList.tsx`
  - Uses `CardShell` for list cards.
  - For some list modes (`grid`, `gallery`, `hero`, `magazine`), renders `card.title` outside the shell (above the paper).

### Styling / Constants

Defined in `src/index.css`:

- `--card-base-width` (default `640px`)
- `--card-max-height` (default `min(70vh, 560px)`)

Primary classes:

- `.card-shell`
  - `width: var(--card-base-width)` on tablet/desktop
  - `min-height: calc(var(--card-w) * 3 / 4)`
  - `max-height: var(--card-max-height)`
- `.card-shell-body`
  - scrollable region with top padding for the overlay
- `.card-shell-actions`, `.card-shell-overflow`
  - fixed overlay
- `.card-shell-viewport`, `.card-shell-panzoom`, `.card-shell--paper`
  - draw mode pan/zoom wrapper and fixed paper sizing

Phone overrides (`@media (max-width: 640px)`):

- `.card-shell { width: 100%; }` (viewing default)
- `.card-shell.card-shell--paper { width: var(--card-base-width); max-width: none; }` (drawing exception)

## API

### `CardShell`

Props:

- `actions?: React.ReactNode`
  - Rendered in a fixed overlay.
  - First 2 actions are shown directly; others go into `...`.
- `children: React.ReactNode`
  - Rendered in the scrollable Body.
- `className?: string`
- `drawMode?: boolean`
  - Enables pan/zoom wrapper and fixed paper sizing.

### `Flashcard`

Props (relevant):

- `drawMode?: boolean`
  - Explicitly sets draw mode behavior for that card.
  - If omitted, defaults may apply (see implementation notes).

## Interaction Rules (Draw Mode)

- Pan:
  - One-finger drag moves the paper (or scrolls the internal body if the drag starts on the body).
- Pinch zoom:
  - Two-finger pinch scales the paper (clamped to a safe range).
- Interactive UI elements:
  - Buttons/links/inputs are not hijacked by pan/zoom gestures.

## Non-Goals

- Implementing a full drawing canvas or stroke rendering (this spec only covers paper sizing + navigation mechanics).
- Perfect gesture physics or inertia (acceptable to keep the interaction simple and predictable).

## Open Questions / Follow-ups

- How screens enter "drawing mode" outside of preview (global toggle? route param? per-card setting?).
- Whether iPad/tablet should always be paper mode, or only in specific routes/features.
