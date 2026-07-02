# Pairing expansion pipeline

Offline, ad-hoc tooling to modernize the flavor-pairing graph from real data sources.
Nothing here runs in the app — you run it locally, review the output, then merge.

See `vocab-audit.md` for the ingredient/synonym audit and `../../src/data/pairingMeta.ts`
for the provenance schema this feeds.

## Files

- `vocab.json` — synonym map (alias → canonical). Canonical vocabulary is read at runtime
  from `src/data/ingredientProfiles.ts`.
- `lib.mjs` — shared plumbing: CSV streaming, the phrase→canonical matcher, edge-set loader.
- `mine.mjs` — recipe-mining pass: normalize ingredients → PMI co-occurrence → propose
  `recipenlg` edges with 0–10 strength.
- `context.mjs` — dish-context pass: for edges already in the graph, mine dish-type /
  method / cuisine tags + top recipe titles ("seen in: …"). Never adds or scores edges.
- `context-vocab.json` — keyword vocabulary for the context pass (tag names ship to the UI).
- `merge-context.mjs` — applies display thresholds and writes `src/data/pairingContext.ts`.
- `sample/sample.csv` — tiny fixture for smoke-testing the miners.
- `output/` — generated `proposed-pairings.json`, `edge-context.json` + reports (gitignored-worthy).

## Status

- ✅ Phase 1: provenance schema (`pairingMeta.ts`, `buildFlavorMap`, sidebar source toggle).
- ✅ Phase 3: 46 modern/global ingredient profiles added (metadata only, no edges).
- ✅ Phase 4: mined RecipeNLG (2.2M recipes) → 7,084 `recipenlg` edges merged.
- ✅ Analog inheritance: `analog.json` siblings → 181 `analog` edges for ingredients
  RecipeNLG can't cover (chili crisp, ssamjang, …). Run via `merge.mjs`.
- ✅ Dish context: `context.mjs` + `merge-context.mjs` → `src/data/pairingContext.ts`
  (dish/method/cuisine tags + "seen in" titles per edge, from the same RecipeNLG corpus).
- ⬜ Phase 5: FlavorDB (molecular `flavordb` edges — single whole-foods only).

## Data hygiene (`normalize.mjs`)

`node normalize.mjs [--dry-run]` removes duplicate profiles and merges variant spellings
(map in the file's `VARIANT` const) across `ingredientProfiles.ts` + `flavorPairings.ts`,
preserving surrounding code. Re-mine + re-merge afterward so `pairingMeta` stays consistent.

## Analog inheritance

`analog.json` maps a too-new ingredient to close culinary sibling(s). `merge.mjs` borrows
each sibling's top neighbors as `analog`-tagged edges (separate, toggleable source). Edit
`analog.json` and re-run `node merge.mjs --min-strength 2` to regenerate.

## Running the miner

1. **Get a dataset.** RecipeNLG works out of the box:
   https://recipenlg.cs.put.poznan.pl/ → download `full_dataset.csv` (~2.3 GB, ~2.2M
   recipes; its `NER` column is a JSON array of cleaned ingredient names). The Food.com
   Kaggle set also works via `--col ingredients`.

2. **Smoke test** (verifies the pipeline without the big file):
   ```bash
   node mine.mjs --input sample/sample.csv --min-count 1
   ```

3. **Real run:**
   ```bash
   node mine.mjs --input /path/to/full_dataset.csv --min-count 20 --min-pmi 0
   ```
   Tune `--min-count` (raise to cut noise on a big corpus) and `--min-pmi` (raise to keep
   only distinctive pairings). Use `--limit 50000` for a fast first look.

4. **Review** `output/report.md` — especially the per-ingredient coverage for the new and
   starved ingredients.

## Running the context miner

Same dataset as the pairing miner (needs `title`, `directions`, `NER` columns). Two
streaming passes: global title counts, then per-edge tag/title accumulation.

```bash
node context.mjs --input /path/to/full_dataset.csv --min-count 5   # → output/edge-context.json
node merge-context.mjs                                             # → src/data/pairingContext.ts
```

Review `output/context-report.md` before merging. Display policy (tag share/count floors,
title requirements, bundle-size levers) lives in `merge-context.mjs` flags.

Title quality: joke/diet-mill names are dropped by `TITLE_STOPLIST` in `context.mjs`;
titles from `CURATED_DOMAINS` (Epicurious, NYT Cooking, Serious Eats, …) outrank
recipe-mill receipts; merge scoring favors short prototypical dish names over long
blog flourishes.

## Merging into the app (next step to build)

After review, a `merge.mjs` step will fold `proposed-pairings.json` into
`src/data/pairingMeta.ts` (tagging edges `recipenlg` + strength) and add the new edges to
`src/data/flavorPairings.ts`. Until then the app is unchanged; the `?sources=` toggle lets
you A/B compare once edges land.
