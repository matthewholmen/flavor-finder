# Flavor Finder Browser Extension — "The Flavor Checker"

**Status: PLANNED (research complete, ready for implementation) — drafted 2026-07-19**

A Chrome extension that sits beside any recipe page and answers: *does this recipe
hang together, flavor-wise?* It extracts the ingredient list, runs it through our
own flavor map (bundled locally — no server), and shows the pairing web, the
gaps, and smart substitutes. Not a fact-checker; a **flavor checker** — a lens
that makes the invisible structure of a recipe visible.

The same work unlocks the #1 requested capability in the web app: **paste a
recipe and analyze it** — starting from a real recipe and working outward,
instead of starting from scratch ingredients. One shared engine powers both.

---

## Why this is the right next thing

- **The market gap is real.** Research found plenty of recipe *clippers*
  (Just the Recipe, Recipe Filter, Paprika, Samsung Food) and a few standalone
  flavor-pairing *sites* (Foodpairing, Flavorfox) — but **no extension that
  analyzes flavor compatibility on the recipe page itself**. The positioning
  writes itself: *"Just the Recipe tells you what's in it; Flavor Finder tells
  you why it works — and what to swap."*
- **Our engine is already portable.** The flavor map, all 638 ingredient
  profiles, the substitution engine, and the graph math are pure TypeScript
  with zero React/DOM dependencies — ~1.24 MB of data (~300 KB gzipped),
  trivial for an extension bundle. No backend needed, ever, for the core.
- **The extension dissolves the CORS blocker.** RECIPE_SYSTEM_PLAN.md R3 had to
  defer "paste a URL" because a web page can't fetch other sites. An extension
  reads the recipe page it's already on — the whole R4 fetch-proxy backend
  becomes unnecessary for this use case.
- **Deep-linking already works in production.** The live app restores a combo
  from `?ing=onion-garlic-tomato` today. The extension can hand any analyzed
  recipe to the full app with zero app changes.

### Relationship to the rollout plan

ROLLOUT_PLAN.md pauses new features until the 5-person user test. Matt has
directed this work as the new priority (2026-07-19). Reconciliation: the paste
flow and extension **start from a real recipe**, which is exactly the "actually
actionable" entry point the audit said scratch-ingredient generation lacks —
so this work can *feed* the user test rather than dodge it. Phase X2
(paste-recipe in the web app) ships first and can be included in the test
protocol.

---

## ⚠️ Core principle carries over

The pairing algorithm is never relaxed — in the extension it is never even
*approximated*. The analysis is **read-only over the same flavor map**:

- A pair either has a map edge or it doesn't. Missing edges render as
  **"unexplored"** — honestly neutral — never as "bad" and never silently
  passed. (The flavor map records confirmed affinities; absence of an edge is
  absence of evidence, and a 638-ingredient map will always have honest gaps.
  Framing this as *coverage* is both truthful and kinder than fake red X's.)
- Substitutes come from `suggestSubstitutes` unchanged: candidates must pair
  with **every** other core ingredient (`intersectNeighborhoods`); texture/
  function/taste only rank, never admit.
- The whole-recipe view is a **coverage report** (which pairs are confirmed,
  which are unexplored), not a numeric grade. There is deliberately no
  "this recipe scores 73" — that would require inventing a metric the map
  doesn't support.

---

## Architecture decisions (from research, 2026-07-19)

| Decision | Choice | Why |
|---|---|---|
| Extension framework | **WXT** (wxt.dev) | 2025/26 consensus default: Vite-based, React+TS out of the box, auto-manifest, HMR, cross-browser later for free. CRXJS has a shaky maintenance history; Plasmo is fading. |
| UI surface | **Side Panel** (`chrome.sidePanel`) + tiny content-script extractor + toolbar badge | Full React page with our own styling, no host-page CSS wars, room for a real analysis view. Content script only *reads* the page and messages JSON over. No injected page UI. |
| Recipe extraction | **Own thin extractor** (~150 lines): JSON-LD (incl. `@graph`) → microdata → recipe-plugin CSS classes (`.wprm-recipe-ingredient` etc.) → select/paste fallback | JSON-LD Recipe markup covers ~90%+ of real recipe sites (SEO forces it). Existing npm scrapers are Node-oriented/stale; the DOM is free in a content script. |
| Ingredient line parser | **`parse-ingredient`** (npm, TS-native, v2.2.0 Apr 2026, actively maintained) | Handles unicode fractions, ranges ("2–3 cloves"), group headers ("For the sauce:"). recipe-ingredient-parser-v3 is abandoned. |
| Free-text → canonical matching | Port `tooling/pairing-pipeline/lib.mjs buildMatcher()` + `vocab.json` (153 aliases) to `src/utils/recipeIngredientMatcher.ts`; add quantity/unit/prep-word stripping + plural stemming; **Fuse.js** fuzzy fallback (threshold ~0.3, `ignoreLocation: true`, per-token) | Exactly what R3 in RECIPE_SYSTEM_PLAN.md already spec'd. The pipeline matcher (longest-term-wins, word-boundary) exists and works; it just lives offline today. |
| Confidence UX | **Confirmable chips**; unmatched lines flagged, never silently dropped | Trust + a feedback channel that grows `vocab.json`. |
| Data bundling | Ship the full engine data (~1.24 MB) **in the side panel bundle**, not the content script | CWS limit is 2 GB; content script stays a featherweight extractor so every page load stays cheap. Skip `pairingContext.ts` receipts (1.65 MB, lazy-only) in v1. |
| Repo layout | `extension/` folder in this repo, importing shared code | One repo, one source of truth for data. See "Shared engine" below. |
| Distribution | $5 CWS dev account now; publish **unlisted** (link-only install) for testing | Real install UX + auto-updates for testers; builds account trust before public launch. Review: 1–3 days typical, longer for first `<all_urls>` submission — budget for it. |
| Permissions | Start with `activeTab` + click-to-analyze; add `<all_urls>` auto-detection badge as a fast-follow | Smoother first CWS review; the badge is delight, not core. |

### Shared engine — the one mechanical hurdle

All target modules (`types.ts`, the 5 data files, `flavorMap` / `atlas` /
`graphExplorer` / `suggestSubstitutes` / `searchUtils` / `categorySearch`) are
pure and React-free, **but** the codebase imports with explicit `.ts`
extensions (a CRA quirk). WXT/Vite handles this with
`allowImportingTsExtensions`-style resolution, so the extension can import
`../src/data/*.ts` directly — no code moves, no monorepo surgery, no CRA
changes. If that ever gets brittle, the fallback is a small codemod stripping
extensions (also a prerequisite for the eventual CRA→Vite migration in
ROLLOUT_PLAN Phase 4, so it's never wasted work).

Key APIs the extension consumes as-is:

- `getAtlasGraph()` (`src/utils/atlas.ts`) — the canonical all-sources map.
- `graph.get(a)?.has(b)` — pairwise check; `getPairingStrength`, `isChefCanon`,
  `getPairingSources` for receipts.
- `intersectNeighborhoods(graph, picks)` (`src/utils/graphExplorer.ts`) — the
  exported, pure twin of `fitsPlaced`.
- `suggestSubstitutes(target, context, map)` (`src/utils/suggestSubstitutes.ts`).
- `encodeIngredientsToUrl()` (`src/utils/urlEncoding.js`) → `?ing=` deep link.

---

## Phases

### Phase X1 — Ingredient matcher + analysis core (shared, no UI)

The engine both features stand on. All pure functions, all offline-testable.

1. **`src/utils/recipeIngredientMatcher.ts`** — browser-safe port of the
   pipeline matcher:
   - Canonical vocabulary from `ingredientProfiles.ts` (imported, not
     regex-scraped) + alias table migrated from
     `tooling/pairing-pipeline/vocab.json` into a checked-in
     `src/data/ingredientAliases.ts`.
   - Line pipeline: `parse-ingredient` → normalize (lowercase, strip
     parentheticals/punctuation) → strip prep stop-words (diced, chopped,
     fresh, large, "to taste"…) → singularize → longest-term-wins match →
     Fuse.js fuzzy fallback (tight threshold) → `{ line, match, confidence,
     unmatched? }`.
   - The pipeline matcher was tuned for recall; paste needs **precision** —
     confidence tiers drive the confirm-chips UI.
2. **`src/utils/recipeAnalysis.ts`** — pure analysis over matched ingredients:
   - **Core-vs-supporting split** (per RECIPE_SYSTEM_PLAN R3): salt, water,
     neutral oils, flour etc. classified as supporting via a pantry list +
     the `intensity` field (finally, intensity's first consumer). Analysis
     runs on the 3–6 core ingredients; user can promote/demote.
   - **Pairing coverage matrix**: for each core pair — confirmed (with
     strength/sources) or unexplored.
   - **Aggregate taste profile** (7 dims) of the core set.
   - **Per-ingredient substitutes** in recipe context via `suggestSubstitutes`.
3. **Offline test harness** (`tooling/recipe-match-test/`, plain node like the
   other tooling): a corpus of ~50 real ingredient lines from major sites +
   expected canonical matches; measure precision/recall before any UI exists.
   This is where the matcher gets good.

**Exit criteria:** ≥90% of corpus lines resolve correctly or flag honestly as
unmatched; zero false-confident matches on the corpus.

### Phase X2 — Paste-a-recipe in the web app (ships first)

Highest-priority user-facing piece; pure frontend, deployable to Vercel
immediately, usable in the 5-person test.

1. Entry point: "Paste a recipe" on the landing surface + drawer (a natural
   sibling of the existing search-first entry).
2. Textarea → matcher → **confirm chips** (matched, with per-chip fix-up
   picker; unmatched lines listed, pick-or-skip). Group headers respected.
3. On confirm → the analysis panel: coverage matrix, taste profile,
   substitutes, and **"Open as combo"** which loads the core set into the
   normal app flow (locks, regenerate-around, drink pairing via existing
   dish inference).
4. Unmatched-line picks append to a local suggestions log we can fold back
   into the alias table (the vocab feedback loop).

**Exit criteria:** paste any of 10 real recipes from major sites end-to-end
with ≤1 manual fix-up each.

> **Amendment (2026-07-20):** X2 shipped and user feedback surfaced the real
> constraint — recipes are 10–25 ingredients and must not be squeezed through
> the 5-slot combo. The answer is a dedicated, uncapped **Flavor Report**
> surface (built narrow-first so it doubles as the extension panel UI) — see
> [FLAVOR_REPORT_DESIGN.md](FLAVOR_REPORT_DESIGN.md). It slots in as **X2.5**
> below; X3 then reuses its components and gets thinner.

### Phase X3 — Extension MVP

1. **Scaffold** `extension/` with WXT (React + TS + Tailwind, matching the
   Fraunces/Inter design language).
2. **Content script**: the thin extractor (JSON-LD → microdata → CSS-class
   heuristics), fires on toolbar click (activeTab), messages
   `{ title, ingredientLines[] }` to the panel.
3. **Side panel**: lines → same matcher → same confirm chips → same analysis
   panel (X1/X2 components reused where practical; the panel is its own small
   React app, so shared *logic* matters more than shared markup).
4. **Handoff**: "Open in Flavor Finder" → `https://flavor-finder-kappa.vercel.app/?ing=…`;
   per-ingredient links via `?atlas=` / `?graph=`.
5. Tab-switch re-analysis (`chrome.tabs.onActivated`/`onUpdated`) and a
   paste-fallback inside the panel for pages with no structured data.

**Exit criteria:** extract-and-analyze works on AllRecipes, Serious Eats, NYT
Cooking, BBC Good Food, and two WordPress food blogs; graceful paste fallback
elsewhere.

### Phase X4 — Detection polish + distribution

1. Auto-detection badge (`<all_urls>` content script, `chrome.action.setBadgeText`
   when a recipe is present) — the "it just noticed" delight moment.
2. Icons, store listing, screenshots; register the $5 CWS account.
3. Publish **unlisted**; recruit the extension into the user-test protocol.
4. Later candidates: Firefox/Safari via WXT, receipts ("seen in") via lazy
   context load, saving analyses to the recipe box (converges with
   RECIPE_SYSTEM_PLAN R2).

---

## What we're explicitly not doing (v1)

- No numeric recipe "score" — coverage framing only (core principle).
- No server/backend — the engine ships in the bundle; CSE search and the
  Supabase corpus (R4/R5) stay paused per the rollout plan.
- No injected UI on host pages (badge only) — no CSS wars with food blogs.
- No scraping instructions/images — ingredient lines + title only; nothing is
  stored or republished (same posture as R4's "extracted facts only" rule).
- No `pairingContext.ts` receipts in the extension bundle (v1) — 1.65 MB for a
  nice-to-have; revisit in X4.

## Open items (recommendations made; flag if you disagree, Matt)

1. **Order**: X1 → X2 (web paste, ships to Vercel) → X3 (extension) → X4.
   Paste-recipe reaches users fastest and de-risks the matcher before the
   extension wraps it.
2. **User test**: fold X2 paste into the 5-person test protocol as a task
   ("here's a recipe you like — paste it in"), which reconciles this work with
   the rollout plan instead of competing with it.
3. **Name**: side panel presents as "Flavor Finder" (one brand), with the
   checker framing in the tagline, not the name.
