# UX Audit & Fix Plan (July 2026)

A deeply critical pass over the live app — desktop and mobile, every major surface —
looking for inconsistencies, trust-breakers, and UX gaps. Done as part of rollout
readiness, before the 5-person user test ([ROLLOUT_PLAN.md](ROLLOUT_PLAN.md)).

**How this was produced:** drove the running app in a browser (landing, tour, generate,
locks, roles, swap, drawer, Build a Dish, flavor map, Atlas, save/share/recipes, mobile
375px pass, light + dark), then verified suspicious behavior in the source. Items
already tracked in [IDEAS_AND_BUGS.md](IDEAS_AND_BUGS.md) are referenced, not repeated.

**What's genuinely good** (so we protect it while fixing the rest): the map ("build a
dish") is excellent; the tour's interactive demos are best-in-class; swap receipts,
steering receipts, and the drawer's compatible-pool model are coherent; the visual
identity is strong. Most findings below are about *the seams between surfaces*, not
the surfaces themselves.

---

## Severity key

- **P0 — fix before the user test.** Trust-breakers or dead ends a tester will hit in
  their first 10 minutes.
- **P1 — fix soon after.** Discoverability and consistency debt that muddies the
  product story.
- **P2 — structural / longer arc.** Bigger rationalizations; schedule deliberately.

Sizes: S = under an hour, M = a session, L = multi-session.

---

## P0 — Trust-breakers and dead ends

> **Status (2026-07-19): P0 wave shipped.** Items 1–7 implemented and
> browser-verified; item 8's resize bug did not reproduce (desktop→mobile with a
> 5-slot combo renders correctly) and the steering-chip deactivation was traced
> to the steer not being part of the encoded URL state — fixed by encoding it
> (`st` in `?lab=`), so refresh/share now keep the pinned tag. Bonus fixes
> landed in passing: category labels unified in the drawer info panel and mobile
> expanded info (item 13, those two surfaces), and the landing no longer keeps
> the hidden drawer in the tab order (part of item 18).

### 1. "Compatibility: Random" openly contradicts the app's one inviolable rule — remove it
**Where:** Sidebar → Generation Options; `FlavorFinderV2.tsx` (~line 410:
`'random' — no pairing requirement`), `Sidebar.tsx` (`COMPATIBILITY_MODES`).
**What:** The entire product promise — and CLAUDE.md's core principle — is that every
combination is mutually compatible. Yet a 2-click user setting produces combos with
*no pairing requirement at all*. A tester who flips it (testers flip everything) gets
nonsense combos with zero warning, and the app's credibility dies with the first
"blueberries & fish sauce" it prints. `seedFreshCombo` even hard-codes
`mode: 'perfect'` because a showcase seed "should demonstrate the app's whole point" —
the code itself knows Random is off-brand.
**Fix:** Remove Random from the UI entirely. Either keep Mixed with an honest,
prominent explanation ("looser: each pick pairs with at least one other, not all") or
cut both and let Perfect be the only mode. If Random has any debugging value, gate it
behind a dev flag, not a settings panel. **Size: S.**

### 2. Landing dish tags ("salads") don't produce dishes — route them to dish frames
**Where:** `LandingSurface.tsx` tag grid → steering; `flavorPresets.ts` frames.
**What:** Clicking **salads** on the landing generated *oregano, capers, artichoke &
basil* — four seasonings, no greens, nothing salad-shaped. That's because landing tags
apply corpus *steering*, while the actual **Salad frame** (base greens / crunch /
sweet / fat / acid) lives in a different feature (Build a Dish). Two features answer
"salad" and the front door picks the weaker one. This is the trust equivalent of the
known "seen in" mismatch: the user asked for a salad and the app visibly didn't listen.
**Fix:** When a landing dish tag has a matching frame (salads, pasta, pizza, tacos,
soups, stir-fries, curries…), apply the frame (and optionally the steer on top).
Tags with no frame keep steering but the combo header should say what happened:
"steering toward salads", not silence. **Size: M.** Related backlog: "pasta the
ingredient vs pasta the dish type".

### 3. Refresh throws away the user's combo — sync state to the URL
**Where:** `FlavorFinderV2.tsx` share handler (~line 851) already encodes full state
(`?ing=` / `?lab=`); nothing updates the URL during a session.
**What:** Build a 5-slot dish with roles and locks, accidentally refresh (or rotate a
phone, or background the tab long enough) — everything is gone, back to the landing.
The encoders and the decode-on-mount path already exist and work; the app just never
writes the URL outside of Share.
**Fix:** `history.replaceState` with the same encoded state after each combo change.
Refresh restores; back button still leaves the app; share links unchanged. **Size: S–M**
(reuse the exact code Share uses).

### 4. Role badges eat the separators and read as typos
**Where:** `IngredientDisplay.tsx` hero row — category-role slots render a ~20px inline
icon button, taste-role slots a 0.2em colored dot, and badged slots drop their comma:
"chicory⌁ watercress, apple· olive oil, & mustard".
**What:** At display-type sizes these look like stray punctuation or rendering bugs,
not controls. They're also sub-44px touch targets doing real work (opening the role
editor), which violates the project's own IconButton rule. And the missing commas make
the app's centerpiece — the typographic combo — look broken whenever frames/roles are
in play, which after P0-2 will be *most of the time*.
**Fix:** Keep commas unconditionally. Move the role indicator out of the text flow —
e.g., a small underline tick or a chip in the hover cluster / below the word — with a
44px target and a label ("role: leafy greens"). **Size: M.**

### 5. Mobile can't remove or deliberately lock an ingredient
**Where:** `IngredientDisplay.tsx` mobile rows + `MobileBottomBar.tsx`.
**What:** The expanded row offers Role / Swap / About — no Remove. The only removal is
"Fewer", which silently deletes the *last* slot, not the one you're looking at. And a
bare tap on the word instantly locks it (pink highlight) with no hint, no undo toast,
no long-press distinction — testers will lock things by accident while scrolling and
then wonder why Generate stops changing them. (CLAUDE.md still describes floating
remove/lock buttons that no longer exist — the docs drifted, see P2-16.)
**Fix:** Add Remove (and an explicit Lock toggle) to the expanded row's action set;
consider a first-time "tap = lock" coach mark or moving lock into the row actions.
**Size: M.**

### 6. Empty-state controls pretend the combo exists
**Where:** `MinimalHeader.tsx`, bottom bar, landing.
**What:** On the landing (no combo): Share, Save, Find recipes, ± and the map button
are all rendered; some look active (Share), some dimmed (Generate), with no rule.
Desktop shows **two search bars at once** — the landing's big one (ingredients +
cuisines + dishes) and the bottom bar's ("Search ingredients…", different scope) —
plus "See this combo on the flavor map" when there is no combo. First-screen ambiguity
is the most expensive kind.
**Fix:** On the landing, hide the bottom bar and the combo-only header actions
entirely (Generate can stay as the one dimmed affordance, or go — "Surprise me" owns
that job). One screen, one search box. **Size: S–M.**

### 7. Unlabeled icon buttons in the drawer info panel
**Where:** `IngredientDrawer.tsx:1138–1167` — the ‹ › paginators are raw `<button>`s,
no aria-label, hand-rolled 32px circles.
**What:** Violates the project's own rule ("IconButton … required aria-label") right
next to code that follows it. Screen readers announce "button, button".
**Fix:** Replace with `ui/IconButton`. While in there, sweep for other bare icon
buttons (map legend chips, role badges). **Size: S.**

### 8. Verify two observed-once state bugs
Flagging for repro rather than asserting:
- **Steering chip silently deactivated** after an ⓘ → map → "Use this dish" → Atlas
  round-trip ("salads ×" became inactive with no user action). If real, constraints
  are being dropped on the floor during map handoff.
- **Desktop→mobile resize with a 5-slot combo** rendered only "chicory," plus a
  floating "&", and the header Save button drew once as an empty white pill.
  Likely resize-only artifacts, but the known "blank second slot" mobile bug is
  adjacent — worth 15 minutes on a real phone. **Size: S to verify.**

---

## P1 — Discoverability and consistency debt

### 9. The flavor map — the app's crown jewel — is nearly invisible
**Where:** entries are: per-ingredient ⓘ, an unlabeled glyph at the bottom-right, a
drawer link. Not in the sidebar menu. Not in the tour (`OnboardingWizard.tsx:19`
explicitly skips it).
**What:** The single most differentiating surface in the product is behind an
unlabeled icon. A tester can plausibly finish a session never knowing it exists.
**Fix:** Add "Flavor Map" to the sidebar BUILD section; add a 15-second tour step
(the tour's demo pattern would show it beautifully); give the bottom-bar glyph a
visible label on desktop ("Map"). **Size: M.**

### 10. Drink pairings are buried behind a 5-second toast
**Where:** entries are: the "What to drink with this?" chip on the save toast
(5s, `FlavorFinderV2.tsx:1531`) and a small icon on saved rows inside the sidebar.
**What:** A shipped headline feature (23 dishes, dedicated panel) that most users will
never see. I missed the toast on my first try and then couldn't find drinks anywhere
obvious.
**Fix:** Put a persistent "What to drink?" affordance on the combo surface itself
(e.g., in the context strip next to steering tags, or the hover/expanded actions),
keep the toast as a bonus. **Size: S–M.**

### 11. One concept, three names: "Partial"
Desktop drawer toggle says **"Partial"** (with a lightning bolt); mobile says
**"Show Partial Matches"**; the results themselves render dashed-outline chips that
are never explained anywhere — and dashed chips appear in search results even when
the toggle is *off*. Adopt the mobile label everywhere, and give dashed results a
one-line caption the first time they appear ("outlined = doesn't pair with everything
yet"). **Size: S.**

### 12. "Dish" now means three different things
- a **dish frame** (Build a Dish → Salad),
- the **map build** ("build a dish", "Use this dish", "YOUR DISH · 4"),
- a **dish-type steering tag** (salads, dips, pot pies).
P0-2 collapses the worst of it (tags → frames), but pick one term for the map build
("your combo"?) or one for steering ("themes"?) so the word "dish" always points at a
structure. Also: "Sweet & Salty" (Classic Contrasts) and "Savory Sweet" (structures)
are near-duplicates in the same gallery — merge or differentiate. **Size: S copy
pass, M to really unify.**

### 13. Category names appear in three formats
Same ingredient: map/Atlas say **"Herbs & Spices · Herbs"** (via `categoryLabel`),
the drawer info panel prints raw lowercase keys — **"seasonings — herbs"**
(`IngredientDrawer.tsx:1184`), mobile expanded info prints the raw key uppercased —
**"FRUITS — BERRIES"** (`IngredientDisplay.tsx:670`). Route every category print
through `categoryLabel` (and add a `subcategoryLabel` if needed). **Size: S.**

### 14. The map legend looks like a key but acts like a filter — and shifts contents
`GraphExplorer.tsx:826` computes the legend from the current pool, so "spicy" was
missing on desktop but present on mobile, and Alcohol never appeared at all; chips are
also tap-to-filter, which nothing signals. Either label the row ("in this pool — tap
to filter") or split legend and filters. Also: the floating search bar overlaps node
labels at the bottom of the canvas ("feta" was half-hidden); reserve a gutter.
**Size: S–M.**

### 15. "Surprise me" doesn't play the odds
First impressions from the landing's flagship button: *blackberry & gin*, then *veal
tenderloin & ham*. The graph already has an Everyday/Adventurous rank-penalty; the
seed generator uses none of it, so the front door regularly leads with cocktails and
specialty cuts for an audience of home cooks. Bias the seed (and arguably plain
Generate) toward everyday staples; keep Adventurous as the graph's dial. **Size: M,
touches only pool weighting — never the compatibility check.**

---

## P2 — Structural rationalizations

### 16. Two color languages share the same hues
Taste colors (salty **blue**, sweet **pink**, fat **yellow**, spicy **red**) and
category colors (Alcohol **blue**, Fruits **pink**, Dairy **yellow**, Proteins
**red-salmon**) collide — sometimes inside a single modal (Build a Dish: structure
rows use category-ish colors, Classic Contrasts rows use taste colors). A user cannot
form one stable mapping of hue → meaning. Options: desaturate/outline one system,
add per-system chip shapes, or (the backlog's open question) pick a primary axis and
demote the other visually. **Size: L, design-led.**

### 17. Atlas ↔ map circular navigation
From the map, "Full details" opens the Atlas; the Atlas footer then offers "Explore
the map" and "Start a pairing with X" — both of which re-enter the map, potentially
abandoning the 4-ingredient build you came from. Make the Atlas footer context-aware:
when opened *from* the map, the actions should be "back to your dish" (and "add X to
your dish"), not a fresh start. **Size: M.**

### 18. Accessibility sweep
- Hidden-but-focusable content: the closed drawer's ingredient buttons and *two* sort
  button groups stay in the accessibility tree on the landing (tab into an invisible
  drawer).
- The "whoa pal — five ingredients max." hint is permanently mounted at `opacity: 0`
  — always announced, never visible; and when it *is* the answer (+ at max slots)
  the + button itself explains nothing (no tooltip/disabled reason).
- Steering suggestion chips ("Italian · pasta") are very low contrast on the dark
  ground — deliberate de-emphasis, but likely below WCAG AA.
- Logo-as-menu (see 19) has aria-label "Open menu" but no visual affordance at all.
**Size: M for the sweep; individual fixes are S.**

### 19. The logo is a secret menu button, and there's no way home
The only way to open the sidebar is clicking the logo (convention says logo = home);
there is no hamburger, and — worse — once a combo exists there is **no path back to
the landing surface** at all except refreshing (which, per P0-3, currently also eats
your combo). Add a real menu button, and let the logo (or a menu item) return to the
landing. **Size: S–M.**

### 20. Docs drifted from the app (repo-cleanup ticket)
CLAUDE.md still documents `TasteLabSplit.tsx`, `useTasteLab.ts`, a "Sidebar mode
toggle (Classic + Taste Lab)" and mobile "floating action buttons … for remove/lock" —
none of which exist anymore (`?lab=` survives only as deep-link back-compat,
`FlavorFinderV2.tsx:917`). Fold into the rollout plan's repo-cleanup phase so the next
audit doesn't chase ghosts. **Size: S.**

### 21. Data nits observed along the way
- Searching **"salt"** — the most likely first search in America — returns only
  celery salt / maldon salt / smoked salt / salt cod. There is no plain salt (kosher,
  sea, table). If that's a deliberate "salt is ambient" stance, the search should say
  so; silence looks like a hole. (Backlog cousin: remove skyr.)
- Atlas metadata line "intensity 6/10 · raw" (oregano) reads as nonsense to a
  layperson — "raw" is a cooking-method tag with no framing. Phrase it ("typically
  used: raw/dried") or drop it until intensity has a real consumer.
**Size: S each.**

---

## Suggested sequencing

| Wave | Items | Rationale |
|------|-------|-----------|
| Before user test | 1, 2, 3, 4, 5, 6, 7, 8 | Everything a tester hits in the first session; all are trust or dead-end class |
| Right after | 9, 10, 11, 13, 15 | Make the differentiators findable before wider sharing |
| Deliberate projects | 12, 14, 16, 17, 18, 19 | Design-led; batch with the "taste vs category" decision in the backlog |
| Housekeeping | 20, 21 | Fold into rollout repo cleanup |

Nothing in this plan touches the pairing algorithm. Item 1 *removes* a bypass of it;
items 2 and 15 change pool inputs only.
