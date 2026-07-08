// utils/dishProfile.ts
//
// The contrast-math substrate for menu-level pairing (dish → drink now, dish →
// dish later). Aggregates a combo's ingredient profiles + P4 texture/function
// tags into a 0–10 DishProfile — how the dish EATS, not what's in it.
//
// Ingredients alone underdetermine a dish (the same five ingredients make a
// pizza or a caprese), so the frame carries the missing context: a FrameContext
// sets the structural weight baseline, whether the dish is cooked (cooked
// aromatics read less spicy — ginger in a stir-fry vs a slaw), and how fat
// functions (dressing vs structural richness).
//
// Known limit, by design: ingredient lists carry no quantities, so attributes
// are estimates with diminishing returns, not sums. When slot assignments are
// known (Taste Lab / frames), per-slot weighting is the planned refinement.
//
// This module never touches flavor-map compatibility — it only DESCRIBES combos
// the engine already produced.

import { getProfile } from './atlas.ts';

export interface DishProfile {
  /** Fat/cream heft — the thing acid, tannin, and bubbles cut. */
  richness: number;
  /** Brightness already on the plate. */
  acidity: number;
  sweetness: number;
  /** Capsaicin-style heat as SERVED (cooked frames mellow non-chili heat). */
  heat: number;
  salt: number;
  umami: number;
  /** Light ↔ hearty: structural heft from grains, proteins, starch. */
  weight: number;
}

export interface FrameContext {
  /** Structural weight baseline the ingredients build on (salad 2, pizza 7). */
  weightBase: number;
  /** Cooked dishes mellow non-chili heat and marry fats. */
  cooked: boolean;
  /** How fat reads: dressing (<1) vs structural/melted (>1). */
  fatMult: number;
  /** Raw/fresh frames push brightness forward. */
  acidMult: number;
}

// Keyed by dish-frame preset id (flavorPresets tier: 'frame').
export const FRAME_CONTEXTS: Record<string, FrameContext> = {
  'frame-salad':      { weightBase: 2.0, cooked: false, fatMult: 0.7, acidMult: 1.15 },
  'frame-grain-bowl': { weightBase: 5.0, cooked: true,  fatMult: 0.9, acidMult: 1.0 },
  'frame-pasta':      { weightBase: 6.0, cooked: true,  fatMult: 1.1, acidMult: 0.95 },
  'frame-stir-fry':   { weightBase: 4.5, cooked: true,  fatMult: 1.0, acidMult: 1.0 },
  'frame-soup':       { weightBase: 4.0, cooked: true,  fatMult: 0.9, acidMult: 1.0 },
};

export const DEFAULT_FRAME_CONTEXT: FrameContext = {
  weightBase: 4.0, cooked: false, fatMult: 1.0, acidMult: 1.0,
};

const clamp10 = (n: number) => Math.max(0, Math.min(10, n));

// Quantity is unknown, so one loud ingredient must not peg an attribute:
// diminishing weights over the top three contributions instead of max/top-2.
const diminishing = (values: number[]): number => {
  const top = [...values].sort((a, b) => b - a).slice(0, 3);
  const weights = [0.6, 0.25, 0.15];
  return top.reduce((sum, v, i) => sum + v * weights[i], 0);
};

// Condiments/seasonings flavor a dish but don't set its levels the way body
// ingredients do (soy sauce ≠ salt-9 dish). Their contributions are damped.
const CONDIMENT_SUBCATEGORIES = new Set([
  'Sauces & Condiments', 'Vinegars', 'Salts', 'Spices', 'Spice Blends',
]);
const CONDIMENT_DAMP = 0.6;

export const computeDishProfile = (
  ingredients: string[],
  frameId?: string,
): DishProfile => {
  const frame = (frameId && FRAME_CONTEXTS[frameId]) || DEFAULT_FRAME_CONTEXT;

  const fats: number[] = [];
  const sours: number[] = [];
  const sweets: number[] = [];
  const salts: number[] = [];
  const umamis: number[] = [];
  const heats: number[] = [];
  let weightPts = 0;

  for (const name of ingredients) {
    const p = getProfile(name);
    if (!p) continue;
    const fp = p.flavorProfile;
    const functions = p.functions ?? [];
    const textures = p.textures ?? [];
    const damp = CONDIMENT_SUBCATEGORIES.has(p.subcategory) ? CONDIMENT_DAMP : 1;

    let fat = fp.fat + (functions.includes('fat') ? 1 : 0);
    if (textures.includes('creamy')) fat += 0.5;
    fats.push(clamp10(fat) * damp);

    sours.push(clamp10(fp.sour + (functions.includes('acid') ? 1.5 : 0)) * damp);
    sweets.push(fp.sweet * damp);
    salts.push(fp.salty * damp);
    umamis.push(clamp10(fp.umami + (functions.includes('umami-bomb') ? 1.5 : 0)) * damp);

    // Chilis stay hot through cooking; other aromatics (ginger, raw alliums) mellow.
    const survivesCooking = p.subcategory === 'Chilis';
    heats.push(frame.cooked && !survivesCooking ? fp.spicy * 0.55 : fp.spicy);

    if (p.category === 'Grains') weightPts += 2;
    if (p.category === 'Proteins') weightPts += 1.5;
    if (textures.includes('starchy')) weightPts += 1;
    if (functions.includes('bulk')) weightPts += 0.7;
  }

  return {
    richness: clamp10(diminishing(fats) * frame.fatMult),
    acidity: clamp10(diminishing(sours) * frame.acidMult),
    sweetness: clamp10(diminishing(sweets)),
    heat: clamp10(Math.max(0, ...heats)),
    salt: clamp10(diminishing(salts)),
    umami: clamp10(diminishing(umamis)),
    weight: clamp10(frame.weightBase + weightPts * 0.6),
  };
};

/** Display-ready chips ("rich", "bright", "hearty") for dish cards. */
export const dishDescriptors = (profile: DishProfile): string[] => {
  const chips: string[] = [];
  if (profile.richness >= 6.5) chips.push('rich');
  if (profile.acidity >= 6) chips.push('bright');
  if (profile.heat >= 5) chips.push('spicy');
  if (profile.umami >= 6.5) chips.push('savory');
  if (profile.sweetness >= 6) chips.push('sweet');
  if (profile.weight >= 7) chips.push('hearty');
  else if (profile.weight <= 3) chips.push('light');
  return chips;
};
