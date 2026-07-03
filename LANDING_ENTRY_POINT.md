# Landing / Entry Point — Feature Brief

*Planned 2026-07-02. Next major feature after tag-click steering.*

## Status — v1 shipped 2026-07-02

`LandingSurface.tsx` is live: a pinned "What do you want to cook?" heading +
search (rotating live-data suggestions), with a small curated set of the
densest cuisine/dish example chips below and a "Browse all" chevron to reveal
the full lists. Decisions taken:

- **The landing IS the empty state.** It shows whenever the combo is empty —
  on a fresh open, and again whenever the user deletes every ingredient (the
  way "back to the front door"). Filling the combo hides it. Deep links
  (`?lab=`/`?ing=`) bypass it with no flash. Returning to it clears any active
  steer, so the next entry is a clean slate.
- **Everything defaults to Classic.** `useTasteLab` now starts `false`; all four
  entry paths (tag tap, ingredient pick, search, Surprise me, Generate) resolve
  into Classic so they land in the same place. Taste Lab is opt-in from the
  sidebar — our testing surface.
- **Calm by default, full list on demand.** Only ~6 example chips per group show
  at rest (top of the richest-subgraph ordering); "Browse all" expands to
  everything. The search covers the whole vocabulary regardless.
- **Pinned search.** The heading + search sit in a `shrink-0` block; only the
  tag area scrolls (fixed by capping the mobile app shell to `#root` — see
  `index.css`), so the search never scrolls out of view.
- **V1 scope: tags + ingredients only.** Search handles cuisines, dish types,
  and ingredients. Dish-name reverse lookup and taste-word routing are still
  open (below).
- **Sparse tags: shown, auto-capped.** A tag tap switches to Classic, steers,
  and generates at the largest size the steered subgraph supports (4 → 3 → 2),
  so Korean/marinades land a smaller combo instead of a no-match toast.

Still open for v2: dish-name reverse lookup via `CONTEXT_TITLES` (the
"bouillabaisse" row below), taste-word → Taste Lab routing.

## Problem

The app has no obvious front door — it drops you into the middle of a flavor
pairing and says "here you go." The onboarding wizard explains the features,
but there's no **intent** entry. If this were a travel site, it would prompt
you with a search and show you the kinds of things you could search for. Goal:
users know what to do immediately and get a good experience the first time,
every time.

## Vision

An intro surface shown on landing (complementary to the wizard, not replacing
it) with two ways in:

1. **Search bar with rotating suggested searches** cycling through the entry
   types as placeholder/prompt:

   > Try *"French cuisine"* · *"salads"* · *"epazote"* · *"bouillabaisse"*

2. **Browsable tag lists** — vertically scrollable cuisine tags and dish-type
   tags to pick from directly ("I want to make a salad", "sheet-pan meal").

## Entry types → what each should do

| You search/tap…            | The app does…                                                        |
|----------------------------|----------------------------------------------------------------------|
| a cuisine ("French")       | activates tag steering (`contextSteer`, cuisine group) + generates   |
| a dish type ("salads")     | same, dish group                                                     |
| an ingredient ("epazote")  | seeds a combo from it (existing search-select flow)                  |
| a taste ("salty")          | possibly routes to Taste Lab slot constraints                        |
| a dish name ("bouillabaisse") | **NEW: reverse lookup** — receipt titles already live in `CONTEXT_TITLES` (`src/data/pairingContext.ts`); find the edges citing that title and propose the combination of its ingredients. Makes dish names first-class searchable. Possibly the most magical piece, and queryable from data we already ship. |

## Existing infrastructure to reuse

- **Tag steering** — `contextSteer` state in `FlavorFinderV2.tsx`,
  `filterFlavorMapByTag` in `src/utils/pairingContext.ts` (two-tier
  membership: display tier + loose steer tier).
- **Context data** — tags + titles in the lazy chunk; always load via
  `src/utils/contextLoader.ts` (never statically import `pairingContext`
  into the main bundle — it's ~330 KB gzipped).
- **PresetGallery** — pool-based presets; the tag lists are its sibling
  surface.
- **Search drawer** — existing ingredient search/select flow.
- **OnboardingWizard** — unchanged, complementary.

## Open design questions

- When does the landing show? Every open? Only when the combo is empty?
  Dismissible with a "don't show again"?
- What happens to the current auto-generated first combo?
- Mobile vs desktop layouts for the tag browse lists.
- Sparse tags (Korean, Hawaiian, marinades, rubs — see feasibility numbers
  in the pairing-expansion notes: they support only 2–4 ingredient cliques):
  hide them, badge them, or cap combo size when steering into them?
- Rotation mechanics for the suggested searches (pull from live tag/title
  data so suggestions are always fulfillable).

## Feasibility notes (measured 2026-07-02)

Steerable subgraphs after two-tier membership: Mexican 1,457 edges, Thai
1,330, salads 7,063, desserts 3,608 — all support full 5-ingredient
generation. Sparse: Korean 268, marinades 320 (fine at 2–3 ingredients).
Median dish-tag fit on kept combos ~80%.
