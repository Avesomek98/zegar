# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

"Kalendarz Pracy" (Work Calendar) — a Polish-language PWA for tracking work hours, vacation, and sick leave, built for someone who commutes on a cycle between Poland and Germany. It auto-calculates net/night/Sunday hours and shows a Poland⇄Germany status based on a configurable travel cycle. Single-tenant per Supabase account; each account only ever sees its own data (Supabase RLS).

## Running it locally

There is no build step, no bundler, no npm project (no `package.json`). `index.html`, `script.js`, `style.css` are loaded directly by the browser (`script.js` is an ES module, imported via `<script type="module">`).

To run locally, serve the directory with any static file server, e.g.:
```
npx http-server -p 8877 -c-1
```
Then open `http://localhost:8877/index.html`. A service worker (`sw.js`) is registered, but it does network-first fetching for HTML/JS/CSS, so edits show up on a normal reload (no need to unregister it while developing).

There is no automated test suite and no linter configured. Verification is manual: load the app, log in, exercise the feature in the browser.

## Backend

Supabase (Postgres + Auth), credentials in `config.js` (anon key only — schema changes require the Supabase SQL editor, not something doable from this repo). Two tables, both scoped per-user via RLS (queries never manually filter by `user_id` beyond setting it on insert):

- **`work_sessions`** — one row per logged day. Columns: `start_time`, `end_time`, `hours`, `break_minutes`, `note`, `color`, `user_id`. There's no separate "type" column — the type of a day is inferred from `note`/`hours`/timestamps by convention:
  - Vacation day: `note === "Urlop"`, `hours: 0`, `start_time === end_time`.
  - Sick leave: `note` starts with `SICK_LEAVE_NOTE_PREFIX` ("Zwolnienie lekarskie").
  - "Day off" marker (e.g. after a Poland trip): `hours === 0` and `start_time === end_time`, no special note required.
  - Regular worked day: everything else.
  - `color`: nullable, only set when the user manually overrides the calendar color for that specific day (see "Color system" below) — usually `null`, meaning "derive the color automatically."
- **`app_settings`** — one row per user. Notable columns:
  - `active_shift` (jsonb) — the currently selected "Dzisiejsza zmiana" (today's shift): `{start, end, label, breakMinutes, color}`.
  - `schedule` (jsonb) — holds **both** `customPresets` (the user's saved shift templates) and `extraPolandRanges` (ad-hoc Poland stays outside the normal cycle) in one column, added later without a schema migration. **Any write to this column must include the current value of both sub-keys** — overwriting one with a stale/empty copy of the other is a real footgun (see `saveCustomPresets`/`saveExtraPolandRanges` in script.js, which both go through `saveScheduleColumn`).
  - `poland_trip_anchor` / `poland_trip_cycle_weeks` / `poland_trip_home_days` — the Poland⇄Germany cycle config.
  - `vacation_days_per_year`, `employee_number`.

A custom preset object: `{ label, start, end, color, breakMinutes }`. `color` and `breakMinutes` may be absent on older presets; always read them through `presetColorKey(preset, index)` (falls back to a cycling palette color by index) rather than `preset.color` directly, and via `preset.breakMinutes ?? DEFAULT_BREAK_MINUTES` for the break.

## Architecture of script.js (~3700 lines, single file, no modules beyond the Supabase import)

Everything is top-level: DOM element references are `const`s grabbed once near the top of the file, app/UI state lives in module-scope `let` variables (e.g. `customPresetsCache`, `activeShiftCache`, `selectedMonthKey`, `editingDate`), and most interactivity is wired via `el.onclick = ...` / `el.onsubmit = ...` assignments rather than a component framework. There's no client-side router — everything is one page with native `<dialog>` elements for modals.

Key recurring patterns worth knowing before making changes:

- **Calendar cell coloring** (`renderMonthCalendar`) has a priority order per day: vacation → sick → day-off → Sunday-work → **explicit `session.color` override** → **exact start/end time match against a saved custom preset** (`matchCustomPresetIndex`) → generic "worked" fallback color. Because matching against a preset is by *exact* start/end equality, picking a preset then hand-editing the hours breaks the link to that preset (this was a real reported bug — see the "Edytuj dzień" / "Dodaj cały tydzień" UX below, which exists specifically to prevent it).
- **The legend under the calendar** (`renderCalendarLegend`) is generated dynamically from a `legendState` object built *during the same pass* as `renderMonthCalendar` (not recomputed separately), so it only lists categories actually present in the currently-displayed month. It's cached as `lastLegendState` so preset-list edits (which don't change which days exist) can re-render the legend without re-scanning the month. **Whenever `customPresetsCache` changes (add/edit/delete a preset), you must call `renderMonthCalendar(selectedMonthKey)`, not just re-render the legend** — the calendar grid doesn't repaint itself otherwise (cells keep stale color classes until the month changes or the page reloads).
- **"Twoje szablony" (custom presets)** are the only source of colored/quick-fill shift options — there used to be a separate hardcoded `SHIFT_PRESETS` array used only for calendar coloring, disconnected from the user's real presets; it has been removed. Don't reintroduce a parallel hardcoded preset list.
- **Three places let you pick hours** ("Dzisiejsza zmiana" on the main page, "Dodaj cały tydzień", "Edytuj dzień") and all three now follow the same UX: a primary `<select>` lists the user's presets (label + hours shown, e.g. "Nocka (21:45–08:30)") plus a trailing "Własne godziny" option; selecting a preset locks the hours/break/color to that preset's values (fields hidden, not just disabled); only "Własne godziny" reveals editable Od/Do/Przerwa fields plus a color-swatch picker. Keep new hour-entry UI consistent with this pattern rather than inventing a fourth variant.
- **Color palette** (`PRESET_COLORS` in script.js, mirrored as CSS custom properties `--preset-<key>-bg` in style.css for light/dark × explicit-light/explicit-dark theme blocks — four blocks total, keep them in sync). Status colors (vacation=green, sick=purple, Sunday-work=pink, day-off=indigo, weekend=slate) are separate from the preset palette and intentionally not reused by it, to avoid a color meaning two different things at once.
- **Toasts** (`showToast(message, "success"|"error")`) are the only feedback mechanism in the app — no more blocking `alert()` calls except behind native `confirm()` dialogs for destructive actions. The toast element uses the Popover API (`popover="manual"`) specifically so it renders above open `<dialog>`s, which are themselves in the browser's top layer and would otherwise occlude a plain positioned `<div>`.
- **Theming**: CSS custom properties defined in four places in style.css — base `:root` (light default), `@media (prefers-color-scheme: dark)` guarded `:root`, `:root[data-theme="dark"]`, `:root[data-theme="light"]` — a token added to one must be added to all four or it'll silently fall back/break in some theme combination.

## Versioning & shipping

There's no semver package version — "version" means the `vX.Y` string shown in the app footer/login screen (`index.html`, two places) and the Service Worker's `CACHE_NAME` in `sw.js` (bump it too, or clients won't pick up new files promptly). New work is usually appended as more `<li>` entries under the *existing* top `<h3>` version block in `#changelogDialog` in `index.html` rather than bumping the version for every small change — an actual version bump + new `<h3>` block is reserved for larger batches of changes. Match the existing changelog voice: short, Polish, one bullet per user-visible change, "Nowość:" / "Poprawka:" prefixes.

**Never `git push` to `origin` without the user explicitly asking for it in that moment**, even after committing locally. The working pattern is: implement → user tests locally (their own Live Server, or a throwaway `npx http-server`) → user explicitly says to push → only then push, including the changelog/version updates above. Commit messages here often start with "Dopisz do vX: " (Polish for "append to vX") when adding changelog bullets without bumping the version number.

## Testing against the live Supabase account

There's a shared test account (test@test.pl) used for manual/scripted verification (e.g. via Playwright) — it is disposable and it's fine to write/delete/reset data on it freely. It is *not* representative of a real user's data volume or history, so don't assume it reflects production-like state.
