# Landing / Entry Point — Feature Brief

*Planned 2026-07-02. Next major feature after tag-click steering.*

## Status — v1 shipped 2026-07-02

`LandingSurface.tsx` is live: search with rotating live-data suggestions plus
browsable cuisine/dish tag lists (richest subgraph first), shown on every fresh
open in place of the auto-seeded combo. Decisions taken:

- **Shows every open**, replacing the auto-combo; retired for the session once
  anything fills the combo (landing pick, Generate, drawer select). Deep links
  (`?lab=`/`?ing=`) bypass it. "Surprise me" reruns the old first-open seed.
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
