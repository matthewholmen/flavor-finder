# Recipe System Plan

**Status: planned, not started** (drafted 2026-07-08). The next major feature after the
P6 profile audit: recipes become first-class objects in the app — searchable in-app,
attachable to saved combinations, importable by paste/URL, and analyzable against the
flavor map.

## Vision

Today the app generates combinations and then *hands the user off* to Google
(`RecipeFinderModal` builds a query and opens an external tab). The recipe system closes
that loop:

1. **Search recipes in-app** — results render inside the app, filterable by curated
   site and by recipe writer/chef.
2. **Recipe box** — save recipes and attach them to saved combinations, so a combo
   accumulates the recipes that express it.
3. **Paste a recipe** — bring an outside recipe in (URL or pasted text), map its
   ingredients to our canonical vocabulary, then analyze it: flavor-map compatibility,
   taste profile, substitutions, drink pairings.
4. **Scale path** — BYO Google key for testing now; a thin backend (Supabase) later for
   key custody, URL fetching, and cross-device sync (web ↔ future iOS/Android port).

**Inviolable:** recipe analysis *reads* the flavor map; it never relaxes it. A pasted
recipe with weak internal compatibility gets an honest report — we never fudge the check
to make imports look good.

## What already exists (reuse, don't rebuild)

| Asset | Where | Reuse |
|---|---|---|
| External search modal | `src/components/v2/RecipeFinderModal.tsx` | Becomes the shell for in-app results; external search stays as the no-key fallback |
| Curated sites list | `RECIPE_SITES` in the modal (10 sites; iOS has 17) | Site filter chips for CSE `siteSearch` |
| Saved combos | `src/hooks/useSavedCombinations.ts` (localStorage) | Gains `recipeIds`; same persistence pattern for the recipe box |
| Phrase→canonical ingredient matcher | `tooling/pairing-pipeline/lib.mjs` + `vocab.json` | Port to `src/utils/recipeIngredientMatcher.ts` (browser-safe) for paste-analysis |
| Dish-type + drink pairing engine | `data/dishTypes.ts`, drink panel | Drink pairings for imported recipes via inferred dish type |
| Substitution engine | `src/utils/suggestSubstitutes.ts` | "Swap it" on imported-recipe ingredients |
| iOS learnings | Google CSE client, LRU recipe cache (1000 items / 7-day TTL), user-initiated-only search | Port the same shape to the web app |

## Phases

### R1 — Recipe model + in-app search (Google CSE, BYO key)

The foundation. User-initiated only (proven right on iOS — no auto-fetch on generation).

- **`Recipe` type** (`src/types.ts`): `id`, `title`, `url`, `sourceDomain`, `author?`,
  `imageUrl?`, `snippet?`, `rawIngredients?: string[]`, `canonicalIngredients?: string[]`,
  `dishTypeId?`, `origin: 'search' | 'paste'`, `addedAt`.
- **`googleSearchClient.ts`** (`src/utils/`): Google Custom Search JSON API. Key + CX
  stored in localStorage for the test phase, entered in a small Settings section
  (mirror iOS "Google Search API" setup screen). CSE returns title/link/snippet plus
  `pagemap` thumbnails — enough for real result cards without scraping.
- **RecipeFinderModal v2**: keep the ingredient chips / require-all / dish-context query
  builder (it's good); when a key is configured, "Search" renders result cards in-app
  (image, title, source, snippet) with actions: *Open* (external), *Save to recipe box*,
  *Attach to this combo*. No key → current external-search behavior, unchanged.
- **Site + writer filters**:
  - Site chips from `RECIPE_SITES` → CSE `siteSearch` param (adopt iOS's 17-site list).
  - Writer/chef search: a curated list of recipe writers (Kenji López-Alt, Melissa Clark,
    Yotam Ottolenghi, Maangchi, …) as chips that append a quoted author term; plus a
    free-text "by author" field. CSE has no structured author facet — quoted-name terms
    are the honest mechanism, and they work well on recipe sites that byline everything.
- **Cache**: localStorage LRU keyed by normalized query, same 1000-item / 7-day TTL
  policy as iOS `RecipeCacheService`. Keeps the free CSE tier (100 queries/day) livable.

### R2 — Recipe box + attach to combinations

Small, mostly-local phase; can land with R1.

- **`useRecipeBox` hook**: localStorage collection of `Recipe`s, same load-guard pattern
  as `useSavedCombinations` (don't persist before initial load).
- **`SavedCombination.recipeIds?: string[]`** — attach/detach from search results, from
  the recipe box, and from the saved-combos panel. A recipe can attach to multiple combos.
- **UI**: "Recipe box" section in the Sidebar (near saved combos); saved-combo cards show
  attached-recipe count and expand to a recipe list. Insights later ("your saves skew
  umami-heavy") once there's data worth summarizing.

### R3 — Paste a recipe: import + analysis

The differentiator. Two entry modes, shipped in this order:

1. **Paste text** (no backend needed — ship first): paste the ingredient list (or whole
   recipe); we parse line-by-line.
2. **Paste URL**: fetch the page, extract schema.org/Recipe JSON-LD (nearly universal on
   the curated sites), fall back to microdata, fall back to showing the user the
   paste-text box. **Web blocker: CORS** — browser fetch of other sites is blocked, so
   URL import on web waits for the R4 fetch proxy. A native iOS/Android port has no CORS,
   so URL import works there from day one — worth remembering when sequencing the port.

- **Ingredient mapping** (`src/utils/recipeIngredientMatcher.ts`): port the pipeline's
  phrase→canonical matcher + `vocab.json` synonyms; strip quantities/units/prep words
  ("2 tbsp finely chopped fresh cilantro" → `cilantro`). Show mapped ingredients as
  confirm-able chips; unmatched lines get manual pick-or-skip. Manual mappings feed back
  into `vocab.json` over time.
- **Core vs. supporting split**: recipes have 8–15 ingredients; the flavor identity is
  3–6 of them. Classify salt/oil/water/flour-type staples as *supporting* (a small
  pantry-staple list + low `intensity` as a signal — a real consumer for the P6 field);
  analysis and combo-matching run on the *core* set. User can promote/demote chips.
- **Analysis panel** (all read-only lenses over existing engines):
  - **Compatibility report**: pairwise flavor-map check over core ingredients — which
    pairs are map-confirmed edges (with "seen in" receipts), which are unknowns. Framed
    as "how much of this recipe our map covers," never pass/fail.
  - **Taste profile**: aggregate the 7 taste dimensions across mapped ingredients.
  - **Substitutions**: `suggestSubstitutes` per core ingredient, in recipe context.
  - **Drink pairing**: infer `dishTypeId` from title/dish keywords (reuse
    `CONTEXT_TAG_KEYWORDS` vocabulary), run the existing drink engine.
  - **Save**: imported recipe → recipe box; its core set is offered as a new saved
    combination (trimmed to ≤5, lockable/editable before saving).

### R4 — Backend (Supabase) — the scale gate

Trigger: sharing beyond personal testing (BYO key is fine until then). Supabase is the
right shape — one project gives:

- **Edge Function `search-recipes`**: proxies CSE with the key server-side; per-user
  quota; server-side query cache (cuts CSE spend across users).
- **Edge Function `fetch-recipe`**: fetches a URL server-side, extracts + sanitizes the
  JSON-LD Recipe, returns structured data → unblocks web URL-paste. Store only extracted
  structured data + source URL (facts + attribution), not full page content.
- **Auth + Postgres**: `recipes`, `saved_combinations`, `combination_recipes` tables —
  cross-device sync, and the bridge to the iOS/Android port.
- **Local-first**: localStorage stays the source of truth offline; sync is additive.
  Don't block any R1–R3 UX on the backend existing.

### R5 — Curated corpus ("is 10k recipes insane?")

Not insane, but **hand-curating 10k full recipes is the wrong unit of work**, and the
scraping experiments already showed exact per-combo recipe generation fails past 3
ingredients. Reframe both halves:

- **The marriage of the two ideas is subset matching, not exact matching.** Never look
  for a recipe with *exactly* the combo's 4 ingredients; look for recipes whose
  ingredient list *contains* the combo's core set, ranked by how central those
  ingredients are (title mentions, core-vs-pantry ratio). Quoted-term CSE search (R1)
  already does this implicitly — which is why live search is the right v1 and the corpus
  is an optimization, not a prerequisite.
- **If/when built, curate an *index*, not recipes**: per entry just title, URL, source,
  author, canonical core-ingredient set, dish type — a few hundred bytes. 2–5k entries
  from the curated sites beats 10k noisy ones. Build it with pipeline-style offline
  tooling (sitemap/JSON-LD extraction → canonical mapping → review → merge), same
  extract→check→merge pattern as `tooling/profile-audit`. **Constraint: respect
  robots.txt/ToS — store facts + links (title, URL, ingredient index), never republish
  recipe text or images.** RecipeNLG (already mined for edges) is unusable here — no
  live URLs/images to display.
- **Payoff**: instant offline "recipes for this combo" suggestions (subset match against
  the index) before any network search; also a quality floor under live search results.

## Sequencing & recommendation

**R1 + R2 first** (one arc: in-app search with BYO key + recipe box/attach — no backend,
all localStorage). **R3 text-paste next** (the analyzer is the moat; the ingredient
matcher port is the main work). **R4 when sharing** (unblocks R3 URL-paste on web).
**R5 deferred** until live search quality or CSE cost demands it.

## Risks / open questions

- **CSE free tier is 100 queries/day** — fine for testing with caching; the R4 proxy +
  shared cache is the real answer at scale ($5/1000 queries beyond free).
- **Ingredient matching precision** — the pipeline matcher was tuned for corpus mining
  (recall-friendly); paste-analysis needs precision. The confirm-chips UI is the safety
  net; expect `vocab.json` growth.
- **JSON-LD variance** — most majors emit clean Recipe schema, but `recipeIngredient`
  formatting varies wildly; the parser needs a tolerant unit/quantity stripper.
- **Author search is heuristic** — quoted-name terms, not a real facet. Set expectations
  in the UI ("recipes mentioning…").
- **iOS parity** — iOS already has CSE search + SwiftData cache but no recipe box/attach
  or paste-analysis; when the port happens, R2/R3 specs here are the shared blueprint,
  and the Supabase schema (R4) is the sync bridge.
