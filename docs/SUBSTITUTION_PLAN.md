# Substitution System Plan

*Drafted 2026-07-20, after the extension surfaced weak swap suggestions
(mushroom → sprouts / lemongrass / mirin in a mazemen recipe).*

## The problem

Swap suggestions come from `suggestSubstitutes`: the flavor map decides who is
**allowed** (candidates must pair with the rest of the dish — inviolable), and
taste distance + texture/function overlap decide the **order**. Two gaps made
bad suggestions reach the UI:

1. **The ranker never says no.** It always fills its N slots, even when the
   admissible pool is thin — so "least-bad" fillers (lemongrass, mirin) showed
   up as swaps for mushroom.
2. **Pairing data answers the wrong question.** Pairings say what goes *with*
   an ingredient; substitution asks what fills its *role*. Deriving the second
   from the first plus similarity math has a ceiling — we hit it.

Guiding rule for everything below: **the bible proposes; the map disposes.**
Substitution knowledge generates and ranks candidates; the flavor-map pairing
check still admits every suggestion against the actual dish. Nothing in this
plan relaxes the pairing algorithm — guards only ever *narrow* the pool
(the same class of move as dish-frame slot constraints).

## Layer 0 — role + technique guards (SHIPPED with this doc)

Pool-narrowing guards in `suggestSubstitutes`, using data P4/P6 already
populated:

- **Role guard**: if the target has `functions`, a candidate must share at
  least one. Mushroom (`bulk`) no longer offers sprouts (`fresh-finish`),
  mirin (`sweetener`), or lemongrass (no structural role).
- **Technique guard**: if the target has `cookingMethods`, a candidate must
  share at least one. A seared ingredient can't be swapped for a raw-only
  garnish or a bottled condiment (`cookingMethods: []` = not applicable).
- **Same-family flag**: candidates in the target's own subcategory (e.g.
  mushroom → shiitake) are kept — they're often the best swap — but flagged
  `sameFamily` and chipped in the UI, so "a more specific version of you"
  reads differently from "a genuine replacement".

Cost accepted: guards are only as good as the tags. 201/638 profiles have
`functions: []`, and some of those are data gaps (carrot!) rather than
"legitimately no role". A good swap can disappear until its tags are fixed.
That's the correct failure direction — fix data, never loosen the check.

Possible follow-up if thin pools still show weak tails: a minimum-score floor
(show 2 good swaps instead of 5 fillers).

## Layer 0.5 — function-coverage audit (data fix, next)

Re-run the profile-audit pipeline (`tooling/profile-audit`, extract →
proposals → check → merge) scoped to the ~200 empty-`functions` profiles.
Empty is *correct* for pure aromatics (lemongrass, saffron); it is a *gap* for
structural ingredients (carrot is surely `bulk` and arguably `crunch-topper`
raw). This is the "make the tags/purposes more defined" pass: it directly
widens what the Layer 0 guards can see, and every fix improves swaps, dish
frames, and future substitution ranking at once.

Also worth auditing while in there: ingredients whose `functions` are present
but single-tagged where serving style changes the role (mushroom is `bulk`
but shiitake is `umami-bomb, bulk` — the generic node should likely match).

## Layer 1 — the substitution table (curated, pipeline-built)

A first-class data set: directed, contextual substitution edges.

```
{ from: "mushroom", to: "eggplant",
  preserves: ["bulk"],            // functions the swap keeps
  methods: ["sautéed","roasted"], // techniques where it holds
  contexts: ["noodles","stir-fry"], // dish contexts where it's proven (optional)
  twoWay: false,                  // eggplant→mushroom must be its own edge
  confidence: "strong" | "situational",
  sources: [...] }                // provenance, same discipline as pairingMeta
```

Sourcing: **not** by copying published lists (Joachim's *Food Substitutions
Bible*, Cook's Thesaurus, *The Flavor Bible* are copyrighted curations — use
them only to spot-check). Instead, reuse the proven audit-pipeline pattern:

1. **extract** — the ~100–150 hub ingredients that actually appear in recipes
   (rank by flavor-map degree + recipe-corpus frequency).
2. **proposals** — LLM pass proposes subs per ingredient *with conditions*
   (direction, preserved functions, valid methods, dish contexts).
3. **check** — mechanical validation: every proposed sub must hold flavor-map
   edges to the proposer's typical partners, share a function, share a method;
   flag anything that fails instead of silently keeping it.
4. **merge** — human-reviewable diff into `src/data/substitutions.ts`.

Consumption: substitution edges become a *bonus* in ranking (a bible-backed
swap outranks a similarity-only one, with a "classic swap" receipt chip) and a
*generator* (bible candidates get checked against the dish even when the
similarity path wouldn't have surfaced them). Admission never changes.

## Layer 2 — mined substitutions (recipe corpus)

Pairings are co-occurrence; substitutes are interchangeability — ingredients
that appear in the *same dish-context slot* but rarely *together*. The pairing
corpus already carries dish-context tags, so this is computable with receipts:
"seen replacing mushroom in 14 noodle-context recipes". Runs whenever the
corpus is next re-mined; output feeds Layer 1's table with `mined` provenance
rather than shipping as its own path. If the corpus ever includes recipe
reviews, "I used X instead of Y" phrases are the richest signal there is.

## Layer 3 (someday) — hierarchy

A slim parent/child table (mushroom ⊃ shiitake, cremini, oyster…) would let
generic→specific become its own suggestion type ("be more specific") and make
sibling swaps first-class. Subcategory + `sameFamily` covers ~80% of this
today; only build the table if the flag proves too coarse.

## Sequence

1. ✅ Layer 0 guards + `sameFamily` chip (this commit)
2. Layer 0.5 function audit (~200 profiles, profile-audit pipeline)
3. Layer 1 substitution table (new `tooling/substitution-audit`, seeded from
   hub ingredients)
4. Layer 2 rides the next corpus re-mine
