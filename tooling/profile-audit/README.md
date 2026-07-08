# Profile audit pipeline (P4 → P6)

## P6 full-profile audit (July 2026)

Second pass over all 638 profiles (P4 batches archived in `proposals/p4-archive/`).
Each P6 proposal entry carries:

- **`intensity`** (required, 1–10) — how loudly the ingredient announces itself at
  typical quantity (habanero 10, jalapeño 6, chicken breast 2). Data-only for now.
- **`cookingMethods`** (required) — from the `COOKING_METHODS` vocab; methods the
  ingredient genuinely suits. Empty = audited, not applicable (vinegars, extracts).
- **`description`** (optional) — full rewrite; merge.mjs replaces the line in place.
  Only present when the rewrite is a genuine improvement. Max 260 chars, no `"`.
- **`textures` / `functions`** (optional) — omitted entries carry the current P4
  values forward unchanged; include only to correct a P4 tag.
- **`tasteFlags`** (optional, sparse) — same contract as P4; applied only via
  `apply-flags.mjs` after review.



Offline, ad-hoc tooling in the `pairing-pipeline` style: generate proposals → review →
merge. Nothing here runs in the app.

Two jobs in one pass over all 638 ingredient profiles:

1. **Texture + function tagging** — populates `textures:` / `functions:` on every profile
   in `src/data/ingredientProfiles.ts` from the controlled vocabularies in `vocab.mjs`
   (mirrored as `TEXTURES` / `INGREDIENT_FUNCTIONS` in `src/types.ts`; `check.mjs` enforces
   sync). Tags describe the **typical served state** (acorn squash = creamy, not hard);
   texture-neutral ingredients (ground spices, extracts) get empty arrays, meaning
   "audited, no texture role" — not "missing".
2. **Taste-profile audit** — the original 638 taste profiles were early-Sonnet output.
   The same pass flags outlier values with a suggested correction and reason. Flags are
   **never auto-applied**: `merge.mjs` writes them to `output/taste-audit.md` for hand
   review, because taste values feed filters and slot roles (behavior changes).

## Workflow

```bash
node extract.mjs   # ingredientProfiles.ts → work/profiles.json + compact work/profiles.txt
# … batch pass fills proposals/batch-*.json (LLM-assisted; reviewed like any diff) …
node check.mjs     # coverage, vocab compliance, flag sanity → output/check-report.md
node merge.mjs     # in-place insert into ingredientProfiles.ts + output/taste-audit.md
```

`merge.mjs` is idempotent — it strips previously generated `textures:`/`functions:` lines
before re-inserting, so re-running with edited proposals is safe.

## Proposal format (`proposals/batch-*.json`)

```json
[
  {
    "name": "acorn squash",
    "textures": ["creamy", "tender", "starchy"],
    "functions": ["bulk"],
    "tasteFlags": [
      { "dim": "sweet", "current": 6, "suggested": 5, "reason": "…" }
    ]
  }
]
```

`tasteFlags` is optional and sparse — flag genuine errors, not ±1 quibbles.

## First consumer

`src/utils/suggestSubstitutes.ts` — candidates come from the flavor-map neighborhoods of
the context ingredients (the engine as judge, per the inviolable-pairing rule); texture and
function overlap only **rank** candidates, never admit them.
