// Controlled vocabularies for the P4 texture/function data layer.
// Mirrors TEXTURES / INGREDIENT_FUNCTIONS in src/types.ts — check.mjs verifies
// the two stay in sync, so edit both together.

export const TEXTURES = [
  'crunchy',
  'crisp',
  'creamy',
  'tender',
  'chewy',
  'juicy',
  'flaky',
  'starchy',
  'liquid',
  'airy',
];

export const FUNCTIONS = [
  'acid',
  'fat',
  'binder',
  'bulk',
  'fresh-finish',
  'crunch-topper',
  'sweetener',
  'umami-bomb',
];

export const TASTE_DIMS = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];

export const MAX_TEXTURES = 4;
export const MAX_FUNCTIONS = 3;
