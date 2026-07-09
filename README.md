# Flavor Finder

A web app for discovering compatible flavor pairings. Pick ingredients, generate
combinations that are guaranteed mutually compatible per a curated flavor map of
638 audited ingredient profiles, steer by cuisine or dish, and find recipes.

Live at **https://flavor-finder-kappa.vercel.app/**. Built by Matt Holmen with
Claude Code, November 2024 → present.

## Current status (July 2026)

Feature phases P1–P6 are complete. The current focus is rollout: cleanup,
analytics, and first real user testing. See [docs/ROLLOUT_PLAN.md](docs/ROLLOUT_PLAN.md)
for the active plan. New feature work (including the recipe system) is paused
until user-testing evidence is in.

## Commands

```bash
npm start          # Development server at http://localhost:3000
npm run build      # Production build
npm test           # Run tests
```

## Where things live

- `src/` — the React app. Architecture and conventions are documented in [CLAUDE.md](CLAUDE.md).
- `src/data/` — the flavor map: pairings, ingredient profiles, provenance, presets.
- `tooling/` — offline data pipelines (pairing mining, profile audits). Not part of the app build.
- `docs/` — plans and working notes.

## The one rule

The pairing/compatibility algorithm is the point of the app and is never relaxed
or bypassed to make a feature work. Details in [CLAUDE.md](CLAUDE.md).
