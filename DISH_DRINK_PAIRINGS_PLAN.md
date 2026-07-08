# Dish & Drink Pairings — Plan

*Sketched 2026-07-07. The "menu level": metaphorical zoom-out from ingredient → dish → menu.
No literal semantic-zoom UI — discrete surfaces connected by a save/name gesture.*

## Governing ideas

1. **Menu-level pairing is contrast math, not affinity math.** Aggregating ingredient
   affinity across dishes ranks pizza + garlic bread over pizza + salad. Dish↔dish and
   dish↔drink need their own small rule system (richness, acid, weight, heat, texture
   balance) layered *over* the existing engine. The flavor map is never touched: any
   generated ingredients still obey `flavorMap` internally; drink pairing is a separate
   edge type with its own data.
2. **Receipts-first, same as steering.** Every drink suggestion shows *why*: which
   ingredients it's documented against (book evidence) and which balance rule it
   satisfies ("cuts the richness", "cools the heat").

## What we already have (found in `Flavor Backup/FlavorFinder-iOS-3.1`)

- **`FlavorFinder/Resources/Data/drinkPairings.json`** — v2.1, 2026-01-18. 266 food keys →
  `{wines, beers, spirits, nonAlcoholic}`, each drink `{name, style}`. 1,485 pairings,
  108 distinct drinks, ~38 style tags (12 wine: "bold red", "crisp white", "sparkling"…;
  10 beer; 11 spirits; 5 NA). Extracted from Dornenburg & Page,
  *What to Drink with What You Eat*.
- **The full book text** (`392944594-Andrew-Dornenburg-WhatToDrinkwitht-What-You-Eat.txt`,
  505KB, ~942 entries) + extraction scripts (`docs/extract_drink_pairings_v2.2.py`) —
  re-minable.
- **`DrinkPairingService.swift`** — the old iOS scorer. Pure affinity aggregation
  (count ingredients a drink co-occurs with, threshold at 80%). No contrast logic.
  Useful as a reference for the *evidence* half only.
- Key alignment: **263/266 keys exactly match web `ingredientProfiles` names**
  (misses: `chili`, `chèvre`, `pea` — trivial mapping fixes).

### Known data caveats

- Some keys are drinks-as-food (`pinot noir`, `champagne`, `tea`) — the book's
  drink-chapter entries. Exclude from the food→drink table (or keep as a fun
  "what goes with a bottle of X" reverse lookup later).
- Some keys are dishes (`bbq`, `ribs`, `brisket`) — these foreshadow the dish table;
  split them out.
- The v2 extractor capped at top-8 per category and **dropped the book's emphasis
  typography** (ALL-CAPS = strong recommendation) and "esp." qualifiers. A re-mine
  recovers weights + receipt text. It also skipped dish entries (PIZZA, SALADS, …).

## Architecture

### 1. Dish entity (the zoom-out gesture)

A **Dish** is a named, saved combo — extend `SavedCombination`
(`useSavedCombinations.ts`) rather than invent a parallel store:

```ts
interface SavedCombination {
  // existing: id, name, ingredients, tags, notes, dates
  frameId?: string;   // optional link to a 'frame' preset (Salad, Soup…)
}
```

The existing **Save** action *is* the metaphorical zoom-out: name the combo → it becomes
a dish → dish-level surfaces (drinks, later sides) unlock. Sidebar "Saved combos"
becomes "Dishes". No new lingo needed — save = make dish.

### 2. Dish profile (computed, never stored)

`utils/dishProfile.ts` — aggregate ingredient profiles + P4 tags + frame metadata into
0–10 dish attributes:

| Attribute | Derivation |
|---|---|
| richness | mean of top-2 `fat` scores; boost for `fat` function / `creamy` texture |
| acidity | max `sour`; boost for `acid` function |
| sweetness | weighted mean `sweet` |
| heat | max `spicy` |
| salt | max `salty` |
| umami | mean `umami`; boost for `umami-bomb` |
| weight | `starchy`/`bulk`/`chewy` + protein/grain share (light ↔ hearty) |

Frames contribute authored context (Soup → liquid, Salad → light/fresh). This layer is
shared by drink pairing *and* future dish-to-dish balance — it's the contrast-math
substrate.

### 3. Drink engine (`utils/drinkPairing.ts`)

Two signals, blended:

- **Evidence (per-ingredient affinity):** for each candidate drink, which dish
  ingredients does the book document it against? Weight by ingredient prominence
  (locked/featured > others) and, post-re-mine, by book emphasis. Produces receipt
  chips: *"Chianti — tomato, mozzarella, basil"*.
- **Style contrast (dish profile → drink style):** authored attribute table for the
  ~38 styles (body, acidity, tannin, sweetness, carbonation, alcohol) + classic
  sommelier rules:
  - rich dish → high acid / tannin / carbonation (**cut**)
  - spicy dish → off-dry, aromatic, low-alcohol, low-tannin (**soothe**; penalize tannic reds)
  - salty → acid / sparkling
  - high umami → fruity, low-tannin
  - sweet dish → drink at least as sweet
  - match body to dish weight (weight matches, flavors contrast)

Ranking = style-fit × (1 + evidence coverage). Grouped output: Wines / Beers / Spirits /
Non-alcoholic. `alcohol-free` dietary filter → NA only (plus rule receipts still shown).

### 4. Dish-to-dish (sides) — phase after drinks

Same dish-profile substrate, complement rules (heavy+bready → light+acidic side).
Suggested side = a steered generation through the **existing** generator (frame +
taste/texture steering as pool inputs), so the flavor map holds. Drinks ship first
because the heuristics are already codified.

## UI sketch

- **Dish card (sidebar / saved list):** computed profile chips (rich, bright, hearty)
  + a "What to drink" affordance.
- **Dish detail / drink panel:** desktop side panel, mobile bottom sheet (same portal
  contract as `SlotRolePopover`). Drink rows: name, style pill, receipt chips
  (ingredient matches), rule chip ("cuts the richness"). Category tabs or grouped list.
- **Menu surface (v2):** pick 2+ dishes → shared drink (drinks scoring well across all)
  + balance readout; later, side suggestions.
- Entry points at both levels (a dish is useful without ever visiting menu; menu
  reachable from any dish) — the zoom is navigation metaphor, not gating.

## Data sourcing (gaps we can't fill from files)

1. **Drink style attribute table** (~38 rows × 6 attrs) — authored by hand from standard
   references (Wine Folly-style body/acid/tannin charts; BJCP beer style guide). Small,
   one-time, high leverage.
2. **Re-mine the book** (`tooling/drink-mine/`, offline like profile-audit): keep
   emphasis weights, "esp." qualifiers, dish-level entries (PIZZA, BARBECUE, SALADS…),
   and AVOID lists if present. Dish entries seed frame-level pairing priors.
3. **Coverage** is 46% of ingredients — fine: dish scoring only needs *some* covered
   ingredients; receipts render for those. Expansion later via additional references
   (e.g., *The Flavor Bible*'s drink mentions) if coverage bites.

## Build order

1. ~~**Port data**: `src/data/drinkPairings.ts`~~ — DONE 2026-07-07. 247 ingredient
   keys; aliases fixed (chili→chili pepper, chèvre→goat cheese, pea→peas);
   Alcohol-category keys (book drink chapters) and generic "Beer"/"Wine" style
   'various' entries dropped at generation.
2. ~~**`utils/dishProfile.ts` + `utils/drinkPairing.ts`**~~ — DONE, 14 unit tests.
   Edge cases handled: diminishing-returns aggregation (no single-butter richness
   pegging), condiment damping (soy sauce ≠ salt-9 dish), cooked-frame heat
   attenuation (chilis exempt), protein-weighted evidence.
3. ~~**Drink style table**~~ — DONE: authored `src/data/drinkStyles.ts` (37 styles ×
   6 attrs). Draft numbers — tune against golden dishes.
4. **UI**: Save→Dish naming pass, dish cards with profile chips, drink panel.
5. **Re-mine tooling** for weights + dish entries (improves receipts, doesn't block 4).
6. **Dish-to-dish balance** — separate follow-on.

### Edge-case ledger (high-variance watch list)

- **No quantities**: attributes are diminishing-returns estimates; per-slot
  weighting (frame slot roles) is the planned refinement once UI knows slots.
- **Test dishes must be flavor-map valid** — classic dishes aren't automatically
  legal combos (carbonara fails: no bacon–parmesan or parmesan–black peppercorn
  edge; that's a pairing-data gap to mine, never a check to relax).
- **Frames underdetermine cooking method** ("no frame" defaults to raw/neutral);
  typed dish input or more frames (pizza, roast, curry…) would sharpen it.
- **Style granularity**: "medium red" flattens Chianti vs Zinfandel; per-drink
  attribute overrides possible later without touching the engine.
