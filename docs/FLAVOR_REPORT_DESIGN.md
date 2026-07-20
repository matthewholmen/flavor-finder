# The Flavor Report — recipe-scale analysis design

**Status: DESIGN EXPLORATION (drafted 2026-07-20, after Matt's X2 feedback) — decide, then build**

Matt's read on the shipped paste flow: parsing is accurate, the chip layout is
sensible, **but the 5-ingredient combo cap is a massive limiter** — real recipes
run 10–25 ingredients — and recipe analysis wants a denser, smaller-type,
more versatile UI than the hero-text pairing surface. This doc explores how to
lift the limit *for recipes* without breaking what the combo system is, and how
the answer becomes the extension's UI for free.

---

## 1. The diagnosis: two different objects, one UI

The friction isn't the modal — it's that we funneled a **recipe** into a
**combo**, and those are different things:

| | Combo (today's core) | Recipe |
|---|---|---|
| Size | 1–5 | 8–25+ |
| Verb | *build* — generate, lock, swap slots | *analyze* — inspect, swap, riff |
| Display | Hero text, one dish-sized idea | Dense, scannable, sectioned |
| Algorithm | Backtracking generation over slots | Read-only report over a fixed set |
| Cap | MAX_SLOTS = 5, **load-bearing** | None — the engine already has no cap |

`MAX_SLOTS` is not an arbitrary number: hero typography, slot roles, the
generation algorithm, locks, steering — all are built around a hand-sized
combo. Lifting it to infinity would wreck the core product to serve a
different job.

**The move: don't lift the combo cap — give recipes their own first-class
surface.** `analyzeRecipe` already handles any N (20 ingredients = 190 pairs,
trivial). Only the *handoff* and the *modal layout* are capped. The combo
stays the sketch pad; the recipe gets a report.

## 2. The Flavor Report (new surface)

A full-screen overlay route in the app — same pattern as the Atlas and Graph
Explorer (`?atlas=` / `?graph=`), which already prove the "dense reference
page over the same data" genre works here. Small type, sections, scannable.

**Flow:** paste modal keeps its capture-and-confirm job (textarea → chips →
resolve unknowns) but its primary CTA becomes **"See the flavor report"** —
the analysis moves out of the modal and into the report. The modal shrinks
back to being a doorway.

### Sections (top to bottom)

1. **Header** — recipe title (first non-ingredient line, editable), N
   ingredients: X core · Y supporting · Z staples. Core/supporting chips
   stay tappable here (promote/demote), small size.

2. **The weave** (replaces "X of Y pairings" at recipe scale) — per-ingredient
   connection rows, sorted most- to least-woven:

   ```
   garlic       ████████████░░  pairs with 12 of 14
   cilantro     ███████████░░░  pairs with 11 of 14
   …
   cardamom     ████░░░░░░░░░░  pairs with 4 of 14
   ```

   The insight at recipe scale isn't the full pair matrix — it's **structure**:
   which ingredients are the connective tissue, and which are the loose
   threads. The bottom row is the interesting one: either the bold move or
   the odd one out. Tapping a row expands its unconfirmed partners
   ("unexplored with: cardamom, lime") — the full matrix is still there, one
   level down, never a wall of 190 chips.

   **Framing rule carries over:** a coverage *percentage* headline reads like
   a grade and gets less meaningful as N grows (no 20-ingredient recipe is a
   clique, nor should it be). Keep counts and per-ingredient bars;
   unexplored ≠ wrong, ever.

3. **View as map** — one tap opens the Graph Explorer seeded with the whole
   recipe. **This already works uncapped**: graph picks are unlimited today
   (only its "Use this combo" handoff enforces MAX_SLOTS,
   `GraphExplorer.tsx:50`). The force graph *is* the recipe-structure
   visualization — clusters, bridges, loners — and we get it for free.

4. **Taste balance** — the 7 bars, computed over core. Descriptive only, no
   "needs more acid" prescriptions (that's judgment; the map doesn't know).

5. **Swaps** — per core ingredient, expandable, with the shared
   texture/function receipts from `suggestSubstitutes`. See §3 for the
   context change this needs at scale.

6. **Actions**
   - **Riff on this** → pick up to 5 (preselect the 5 most-woven core) →
     opens as a normal combo. The cap lives here now, where it belongs, and
     it's framed as focus ("riff on part of this"), not a wall.
   - **Drink pairing** → existing panel; it takes an arbitrary ingredient
     list already.
   - **Share** → `?recipe=` link (§4).

### Layout constraint that pays for itself

Design the report **narrow-first (~380px)**: single column, sections stack.
On desktop it centers as a comfortable column (like the Atlas). That exact
narrow layout is what the extension side panel needs — the report becomes
the extension's main UI with no redesign (§5).

## 3. Substitution at recipe scale — the intersection collapse

Today `suggestSubstitutes(target, context)` admits only candidates that pair
with **every** context ingredient. At 4-ingredient context that's the point;
at 20 the intersection tends toward empty — measured example (15-ingredient
curry, target cilantro): all-context returns 4 candidates only because a
curry is a dense clique; eclectic recipes will hit zero.

**Change the context definition, not the admission rule:** in report mode,
context = **the target's confirmed partners within the recipe core** — the
connections the recipe actually exercises. A valid swap preserves every
edge the original ingredient really has; edges the original never had can't
be broken by the swap. Measured on the same curry: 11-ingredient confirmed
context, returns 5 candidates including options the blanket intersection
missed.

This is an **input change, not a relaxation** (the inviolable rule is
untouched): every suggested substitute still holds a flavor-map edge to
every ingredient it's checked against — we only stopped demanding edges the
*original ingredient doesn't have either*. It's arguably the more correct
definition at any scale; the combo-mode swap (structural ⇄) keeps its
stricter all-context form since 5-ingredient combos are built as cliques.

Implementation: a small wrapper in `recipeAnalysis.ts`
(`substitutesInRecipe(target, core, graph)`) that computes the confirmed
subset and calls `suggestSubstitutes` unchanged.

## 4. Routing and sharing: `?recipe=`

Copy the proven `?lab=` pattern (`urlEncoding.js`): base64url JSON carrying
`{ title, ingredients: [canonical…], supporting: […] }`. Gives us:

- **Shareable reports** — paste a recipe, send the report link.
- **The extension deep link** — `?ing=` caps at 5 slots by design; the
  extension hands a whole recipe to the web app via `?recipe=` instead.
- Report state survives refresh/back like the Atlas and Graph overlays do.

Raw pasted text stays local (it can be long and is someone's copyrighted
prose) — the link carries only canonical names + title.

## 5. How this wraps into the extension (X3)

The extension's side panel flow becomes exactly:

1. Content script extracts `{ title, ingredientLines[] }` from the page
   (JSON-LD → microdata → CSS heuristics — unchanged from EXTENSION_PLAN).
2. Panel runs the same matcher → same confirm chips.
3. Panel renders **the same Flavor Report components**, which are already
   narrow-first by design.
4. "Open in Flavor Finder" → `?recipe=` deep link (full cast, no cap);
   per-ingredient links → `?atlas=` / `?graph=`.

To make step 3 real, report components live in
`src/components/v2/report/` as **pure-props components** (no app context,
no modal assumptions, Tailwind classes only) so the WXT build imports them
the same way it imports the engine. The report we build for the web app
*is* the extension UI — building X2.5 first makes X3 mostly plumbing.

## 6. What explicitly does not change

- `MAX_SLOTS = 5`, hero display, generation, locks, steering — the combo
  system is untouched.
- The pairing algorithm and admission rule — untouched (§3 changes an
  input, never the check).
- The paste modal's capture/confirm UX — kept, analysis moves out.
- Coverage framing — unexplored is never rendered as wrong.

## 7. Suggested phasing

- **X2.5a — Report surface**: `components/v2/report/` (weave, taste,
  swaps-with-confirmed-context, actions), full-screen overlay + `?recipe=`
  route, paste modal CTA swap, "Riff on this" picker. Uncapped analysis
  ships here.
- **X2.5b — Map seed**: "View as map" seeding GraphExplorer with the full
  recipe (verify pick rendering comfort at 15–25 nodes; may want the
  viewport-scaled budget to account for pick count).
- **X3 — Extension** (unchanged scope, thinner now): WXT scaffold +
  extractor + panel that reuses matcher, chips, and report components.

## 8. Open questions for Matt

1. **Report name/frame** — "Flavor report"? "Flavor check"? The tab/section
   header sets the product's voice for the extension too.
2. **Weave detail default** — rows collapsed (bars only) or first 2–3
   expanded to teach the interaction?
3. **Riff preselection** — auto-pick the 5 most-woven, or start empty and
   let the user choose? (Recommend auto-pick; one tap to clear.)
