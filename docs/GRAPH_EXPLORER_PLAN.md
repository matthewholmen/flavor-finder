# Graph Explorer Plan ("Atlas view")

**Status: planned, not started** (drafted 2026-07-09). Queued behind the rollout plan —
no build work until the 5-person user test has evidence (see `ROLLOUT_PLAN.md`). Sits
alongside `RECIPE_SYSTEM_PLAN.md` in the post-test feature queue; which goes first is
Matt's call at that point.

A working mockup was validated in-chat on 2026-07-09: a force-directed ego network of
acorn squash (22 partners, 113 partner-to-partner edges, real data from
`flavorPairings.ts`, real `CATEGORY_COLORS`). Matt's verdict: keep it essentially as
shown; it answers the app's "so what?" question by making the flavor map itself visible.

## Vision

The database *is* a graph — 638 ingredients (nodes), ~14,800 pairings (edges) — but the
app only ever shows the output of graph traversal (a generated combo), never the graph.
The Graph Explorer is a **secondary mode** (alternate interface, not a replacement for
Classic/Taste Lab) where the user sees and works the map directly:

1. **Explore** — an ego network centered on one ingredient: its partners around it,
   plus the edges *among* those partners, which is what reveals clusters (acorn squash
   splits visibly into a "fall baking" cluster and a "savory roast" cluster). Click any
   node to re-center on it — hop the whole database like following Wikipedia links.
2. **Build by pruning** — the headline feature. Select an ingredient, then a second:
   the graph prunes to only ingredients compatible with *both*. Each pick shrinks the
   candidate pool further, up to 5 ingredients. The user watches the mutual-compatibility
   algorithm run — this is the pairing check made visible, not a new pairing mechanism.
3. **See the ingredient** — a persistent info panel (desktop sidebar / mobile bottom
   sheet) showing the focused ingredient's profile: description, category, taste bars,
   textures, functions, intensity, cooking methods. P6 audit data finally gets a consumer.
4. **Lenses** — recolor/regroup the same graph by category (default), by dominant
   taste, and eventually by aroma (data gap — see below).
5. **Substitution lens** — with a combo in progress, focus one ingredient and see its
   `suggestSubstitutes` candidates as a highlighted ring (maple syrup ↔ brown sugar),
   with the rest of the graph dimmed. An intuitive, visual version of structural swap.

**Inviolable:** the graph *reads* the flavor map; it never relaxes it. Pruning is set
intersection over `flavorMap` neighborhoods — the exact same admission rule as
`fitsPlaced` in `computeTasteLabCombo`. Every edge drawn is a real pairing; every
node that survives a prune is mutually compatible with all selections. No "nearby but
not compatible" nodes, ever.

## Why this earns its place

- Answers "so what?" — new users see *what the app knows* in one glance, instead of
  taking a generated combo on faith.
- Zero risk to the algorithm — it's a read-only visualization of data that already
  exists; the compatibility check is the star, not an obstacle.
- Build-by-pruning is a genuinely different way to compose a combo: constraint-first
  instead of generate-and-lock. It ends in the same app state (1–5 selected
  ingredients), so Save/Share/Generate/Recipes all work unchanged.

## What already exists (reuse, don't rebuild)

| Asset | Where | Reuse |
|---|---|---|
| Bidirectional flavor map | `src/utils/flavorMap.ts` (ALL_SOURCES) | The entire graph: nodes = keys, edges = Set entries. Ego network = one lookup; pruning = Set intersection. No new data structure needed |
| Ingredient profiles | `src/data/ingredientProfiles.ts` | Info panel content; taste lens coloring; intensity → node size or weight |
| Category/taste colors | `CATEGORY_COLORS`, `TASTE_COLORS` in `src/utils/colors.ts` | Node coloring for both lenses — no new palette |
| Selection state | `src/hooks/useIngredientSelection.ts` | Build-mode picks write to the same selection the rest of the app reads |
| Substitution engine | `src/utils/suggestSubstitutes.ts` | Substitution lens: candidates + ranking receipts, unchanged |
| Dietary/pool filters | `src/hooks/useFilters.ts`, `dietaryRestrictions.ts` | Filtered ingredients are removed from the visible graph (a pool input change, same as everywhere else) |
| Mode toggle | `src/components/v2/Sidebar.tsx` | Entry point: third mode alongside Classic / Taste Lab (or an "Atlas" entry — naming open) |
| Bottom-sheet / drawer patterns | `IngredientDrawer.tsx`, `SlotRolePopover.tsx` | Mobile info panel and popover conventions |
| Pairing provenance | `src/data/pairingMeta.ts` | Optional edge detail: tap an edge → sources / "seen in" receipts |

## Interaction design

### Explore mode (default)
- Ego network: center ingredient + all partners + partner-to-partner edges.
- Hover (desktop) / tap (mobile) a node: highlight its edges within the view, dim the
  rest; info panel updates.
- Click / second tap: re-center the graph on that node (animated transition; keep the
  previous center visible for orientation, with a breadcrumb trail of recent hops).
- Search box to jump to any ingredient (reuse `searchUtils` matching).
- Degree cap: hubs like garlic pair with hundreds of ingredients. Above ~40 partners,
  show the strongest slice (prefer partners that also connect to each other — maximizes
  visible cluster structure) with a "+N more" affordance that opens the full list as a
  panel, not more nodes. A readable graph beats a complete one.

### Build mode (progressive pruning)
- Start from any focused ingredient: "Start a combo here."
- Pick #1: graph shows its full neighborhood (candidates).
- Pick #2..#5: candidates = intersection of all picks' neighborhoods. Pruned nodes
  animate out (shrink/fade) — the shrinking pool is the point; show the count
  ("212 → 38 compatible").
- Picked ingredients form a distinct anchor row/ring; each is removable (re-expands
  the pool by recomputing the intersection).
- Dead ends are honest: if the intersection hits zero-ish, say so — never pad with
  incompatible nodes. Suggest removing the most-constraining pick (smallest
  neighborhood) instead.
- "Use this combo" hands the picks to the main app selection → hero display, Save,
  Share, Generate-to-fill-remaining-slots all behave as if picked in Classic mode.

### Info panel
- Desktop: right sidebar, persistent while exploring. Mobile: collapsed bottom sheet,
  expands on tap.
- Content: name, category/subcategory, description, taste profile bars, texture +
  function chips, intensity, cooking methods, pairing count. Buttons: "Center graph
  here", "Add to combo" (build mode), "Substitutes" (opens the lens).

### Lenses (view options, one toggle group)
- **Category** (default): node color = `CATEGORY_COLORS` — the validated mockup.
- **Taste**: node color = dominant taste dimension via `TASTE_COLORS` (ties broken by
  second-highest; neutral gray below a threshold). Same graph, different question:
  "where does sweetness live in this neighborhood?"
- **Aroma** (future, blocked on data): see below.
- Optional weight lens once useful: node size by `intensity` (P6 data, display-only —
  explicitly *not* a pairing filter, per its charter).

### Substitution lens
- Available when focused on an ingredient that's part of the current combo (or any
  ingredient, using its ego network as context).
- `suggestSubstitutes` candidates render as a highlighted arc around the focused node;
  everything else dims. Shared texture/function chips shown as ranking receipts in the
  info panel — same receipts as structural swap.
- Selecting a candidate swaps it into the combo (same behavior as the ⇄ control).

## Aroma view — honest data gap

Matt's instinct: seeing *aroma bonds* (why ingredients pair, not just that they do)
could be the most interesting lens. Today the data can't support it — profiles carry a
single `aromatic` 0–10 scalar, not aroma compounds. A real aroma lens needs a new data
layer: shared volatile compounds per ingredient pair (the FlavorDB approach — and a
"FlavorDB lens" is already P3 in the Atlas roadmap; this is the same work item).
Treat as a research spike: source the data first (FlavorDB or similar), evaluate
coverage against our 638 ingredients, then decide. Display-only when it lands —
aroma data annotates edges ("shared compounds: …"), it never becomes an alternate
admission rule.

## Technical approach

- **Layout**: `d3-force` (the standard force simulation, ~15KB) driving a custom
  **canvas** renderer — not SVG/DOM nodes (janky past ~50 nodes) and not
  `react-force-graph` (pulls in more than we need; CRA-friendliness uncertain). The
  in-chat mockup already proved the render loop (hover/drag/highlight on canvas) —
  port that shape, swap hand-rolled physics for `d3.forceSimulation`.
- **Data**: no new data. Ego network and intersections are Set operations over the
  existing `flavorMap` — microseconds at this scale. Compute the visible subgraph in a
  pure util (`src/utils/graphExplorer.ts`) so it's unit-testable offline, mirroring the
  solver-validation test pattern from dish/drink pairings.
- **State**: graph mode is a view over existing state — selection, filters, dietary all
  come from current hooks. New state is only: center node, hop history, lens choice.
- **Perf envelope**: ego networks are ≤ ~40 nodes / a few hundred edges after the
  degree cap — trivial for canvas at 60fps, fine on mobile.
- **Accessibility**: canvas is invisible to screen readers — mirror the visible graph
  as a text list (focused ingredient + partner list) in an offscreen live region; the
  info panel is regular DOM and carries most of the content anyway.
- **Mobile**: touch drag/tap already proven in the mockup. Small screens get the same
  canvas full-width with the bottom-sheet info panel; if it's too cramped in practice,
  the fallback is graph-on-top / list-below rather than shrinking the graph.

## Phases

- **G1 — Explore mode**: mode entry, ego network with category lens, hover/tap
  highlight, re-center on click, search-to-jump, degree cap, info panel. Read-only.
  *This alone is shippable and demo-able.*
- **G2 — Build by pruning**: pick anchors, animated intersection pruning, live count,
  dead-end handling, hand-off to main selection. The "so what?" payoff.
- **G3 — Lenses**: taste lens, substitution lens, optional intensity sizing, optional
  edge provenance on tap.
- **G4 — Aroma spike** (blocked on data): source/evaluate compound data (= Atlas
  roadmap P3 FlavorDB lens), then design the aroma edge annotations.

Styling/hierarchy cleanup is expected *during* G1–G3 — the mockup's layout is the
starting point, not a spec. Known rough edges: label collisions on dense neighborhoods,
edge clutter above ~30 nodes, legend/lens-toggle placement.

## Open questions

1. Naming/entry: third mode toggle ("Atlas"? "Map"?) vs. an "explore the map" link on
   ingredient hover/info surfaces vs. both.
2. Does Explore mode replace or complement the planned list-style Ingredient Atlas
   (roadmap P2)? Likely complement: list = lookup, graph = discovery — but decide
   before building the list version.
3. Degree-cap slice for hubs: strongest-cluster heuristic vs. simple alphabetical/random
   sample — needs a play test with garlic/onion/olive oil.
4. Should build-mode pruning respect the current mode's constraints (Taste Lab slot
   roles) or always be free-form? (Lean: free-form in v1; roles are Taste Lab's job.)

## Status log

- **2026-07-09** — Plan drafted from in-chat mockup session (acorn squash ego network,
  real data, real palette). Matt approved the direction: keep mockup look as baseline,
  secondary mode, build-by-pruning + info panel + taste/aroma lenses are the wishlist.
  Execution deferred until after the rollout-plan user test; likely handed to another
  agent with this doc as the brief.
- **2026-07-09** — **G1 + G2 + taste lens built** (not yet committed). Pieces:
  - `src/utils/graphExplorer.ts` — pure, unit-tested (`.test.ts`, 11 cases): ego network
    with the strongest-cluster degree cap, `intersectNeighborhoods` (build-mode pruning),
    `mostConstrainingPick` (dead-end guidance). Reads the canonical `getAtlasGraph()` — all
    sources, generator quality gates — so it's identical for everyone. Only ever reads the
    map; every edge is a real pairing.
  - `src/components/v2/GraphExplorer.tsx` — full-screen overlay, `d3-force` (newly added
    dep) + custom canvas renderer. Explore mode (ego network, hover/drag/tap, click-to-hop,
    search-to-jump, "+N more" hub list, category **and** taste lenses, info panel with
    profile/taste-bars/textures/functions/intensity/methods) and build mode (tap anchors,
    live intersection prune with count, anchor chips, honest dead-end message, "Use this
    combo" → main selection). Offscreen live-region mirror for a11y.
  - `src/hooks/useGraphRoute.ts` — `?graph=<name>` routing, mirrors `useAtlasRoute`.
  - Wired into `FlavorFinderV2`: `useComboFromGraph` handoff (resets roles/pool/steer like
    loading a saved combo), Escape handling, and cross-links — Atlas "Explore the map" →
    graph, graph "Full details" → Atlas stacked on top as a drill-down (graph rendered
    before Atlas so the Atlas wins z-order; closing Atlas drops back to the graph).
  - Verified in-browser: acorn squash ego network, garlic hub (301→40 + "+261 more"),
    sage prune 26→15 (all survivors pair with both), taste-lens recolor, combo handoff
    lands "acorn squash & sage" in the main app, Atlas↔graph round-trip clean, no console
    errors. Deferred: G3 substitution/intensity lenses, G4 aroma spike, dietary/pool node
    filtering, prune fade-out animation, dedicated top-level entry (open question #1 — only
    entry today is the Atlas "Explore the map" button).
- **2026-07-09 (round 2, after Matt's first hands-on)** — two fixes:
  - **"Explore the map" bounced to the home page.** Root cause: the Atlas→graph handoff
    was `closeAtlas()` then `openGraph()`. When the Atlas was opened *in-app*, its close
    runs an asynchronous `history.go(-n)` that races the graph's `pushState` and unwinds
    it. (The original verification cold-opened `?atlas=` links, whose close path is a
    synchronous `replaceState` — so the race never showed.) Fix:
    `hooks/overlayRouteSync.ts` — `swapOverlayParam()` does the whole handoff as ONE
    synchronous `replaceState` (drop `atlas`, set `graph`) plus a custom event both route
    hooks listen to (replaceState fires no popstate). Rule of thumb recorded: never
    sequence an overlay close() with another overlay's open().
  - **Density didn't match the approved mockup.** Partner labels only drew at ≤26 nodes —
    acorn squash's network is 27, so every label vanished; and the layout was too tight.
    Now: labels always on (theme-aware ink + background halo), `DEFAULT_DEGREE_CAP`
    40 → 24 (mockup showed ~22 — Matt's preferred density), degree-scaled node radii,
    stronger repulsion + longer links + label-aware collide, positions clamped to the
    canvas (mobile), lens legend top-left, mockup-style footer ("24 of 301 partners
    shown · 623 ingredients · 19,557 pairings in the map"), lens toggle now on mobile too.
