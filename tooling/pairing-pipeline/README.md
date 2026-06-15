# Pairing expansion pipeline

Offline, ad-hoc tooling to modernize the flavor-pairing graph from real data sources.
Nothing here runs in the app — you run it locally, review the output, then merge.

See `vocab-audit.md` for the ingredient/synonym audit and `../../src/data/pairingMeta.ts`
for the provenance schema this feeds.

## Files

- `vocab.json` — synonym map (alias → canonical). Canonical vocabulary is read at runtime
  from `src/data/ingredientProfiles.ts`.
- `mine.mjs` — recipe-mining pass: normalize ingredients → PMI co-occurrence → propose
  `recipenlg` edges with 0–10 strength.
- `sample/sample.csv` — tiny fixture for smoke-testing the miner.
- `output/` — generated `proposed-pairings.json` + `report.md` (gitignored-worthy).

## Status

- ✅ Phase 1: provenance schema (`pairingMeta.ts`, `buildFlavorMap`, sidebar source toggle).
- ✅ Phase 3: 46 modern/global ingredient profiles added (metadata only, no edges).
- ✅ Phase 4: mined RecipeNLG (2.2M recipes) → 7,084 `recipenlg` edges merged.
- ✅ Analog inheritance: `analog.json` siblings → 181 `analog` edges for ingredients
  RecipeNLG can't cover (chili crisp, ssamjang, …). Run via `merge.mjs`.
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

## Merging into the app (next step to build)

After review, a `merge.mjs` step will fold `proposed-pairings.json` into
`src/data/pairingMeta.ts` (tagging edges `recipenlg` + strength) and add the new edges to
`src/data/flavorPairings.ts`. Until then the app is unchanged; the `?sources=` toggle lets
you A/B compare once edges land.
