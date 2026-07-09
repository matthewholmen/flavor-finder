# Rollout Plan (July 2026)

Written 2026-07-08. Context: after ~20 months of feature phases (P1–P6), the priority
is now getting the app in front of real users. The app is already live on Vercel
at **https://flavor-finder-kappa.vercel.app/**. No analytics or user testing exists yet.
The pivot: **stop building features, start collecting evidence.** The recipe system
plan (`docs/RECIPE_SYSTEM_PLAN.md`) is paused until Phase 3 produces evidence.

Nothing in this plan touches the pairing algorithm (see CLAUDE.md core principle).

---

## Phase 1 — Clean house (execute first, one session)

Goal: a root folder where everything visible has a job. Matt approved these exact
lists on 2026-07-08. Everything "archived" is moved, not destroyed.

**1. Create the archive folder** (outside the repo):
`~/Claude Apps/_archive/flavor-finder/`

**2. Move to archive** (then `git rm -r` anything git-tracked; history keeps it anyway):
- `my-app/` — abandoned Next.js experiment, 381 MB, NOT git-tracked (plain `mv`)
- `FlavorFinder-iOS-2.9/` — abandoned iOS app, git-tracked (~103 files)
- `iOS_plan/` — iOS planning notes (check if tracked; `git rm -r` if so)

**3. Delete outright** (approved):
- `flavor-finder.js` (root) — leftover from V1
- `test_build.sh`, `test_compilation.sh`, `quick_test.sh`, `start_test.sh`
- `.DS_Store` files (already gitignored)

**4. Move root planning docs into `docs/`** (keep only CLAUDE.md + README.md at root):
- `DISH_DRINK_PAIRINGS_PLAN.md`
- `FlavorFinder_V2_Mobile_Layout_Implementation_Plan.md`
- `IDEAS_AND_BUGS.md`
- `LANDING_ENTRY_POINT.md`
- `RECIPE_SYSTEM_PLAN.md`
- `flavor-finder-data-architecture.md`
- `mobile-discover-layout-fix.md`
- `refactor_notes/` → `docs/refactor_notes/`

**5. Verify and ship:**
- `npm run build` passes
- Commit + push to main (straight to main is the norm for this repo)
- Confirm the Vercel deployment goes green and the live site still works

Notes: `node_modules/` (828 MB) and `tooling/pairing-pipeline/flavordb-data/` (73 MB)
are legitimate and stay. `tooling/` is the offline data pipeline — never archive it.

## Phase 2 — Rollout readiness (a few days)

1. Vercel URL recorded (https://flavor-finder-kappa.vercel.app/); confirm auto-deploy from GitHub main.
2. Add analytics — Vercel Analytics is the default choice (already on the host).
   Events to track: generate clicked, ingredient locked, combo saved, recipe search
   opened, mode used (Classic vs Taste Lab), landing tag picked.
3. Public-URL polish: page title, meta description, social preview (OG) card,
   favicon, quick mobile pass.
4. Add a feedback link in the app (mailto is fine to start).

## Phase 3 — User testing (the actual point)

1. **Five people, watched, ~20 min each.** Friends/family who cook. One task:
   "You've got chicken and a lemon and you're bored — use this to figure out dinner."
   Observe without helping. Record: first click, does Generate make sense, first
   confusion, first delight, would they open it again Thursday.
2. **Two weeks of analytics**, then answer: does anyone return? Classic or Taste
   Lab? Do combos get saved? Do recipe searches happen?
3. **Decide the product identity** — quick-hit kitchen tool vs. browsing
   destination — from that evidence, before any new feature work resumes.

## Phase 4 — Later (after testing; important, not urgent)

- Migrate the build tooling from Create React App (discontinued) to Vite.
- Split `src/FlavorFinderV2.tsx` (~2,000 lines) into smaller pieces.
- Add real test coverage around the pairing engine and generation solver.

---

## Status log

- 2026-07-08 — Plan written and approved. Phase 1 ready to execute.
- 2026-07-08 — Vercel URL recorded: https://flavor-finder-kappa.vercel.app/
- 2026-07-08 — Phase 1 executed: archived my-app/, FlavorFinder-iOS-2.9/, iOS_plan/;
  deleted flavor-finder.js + 4 stray test scripts; moved 7 planning docs +
  refactor_notes/ into docs/. Build passes, pushed to main.
