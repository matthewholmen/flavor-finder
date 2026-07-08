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

// Controlled cooking-method vocabulary (P6 audit pass). Methods the ingredient
// genuinely suits — not every method it survives. Empty array = audited, not
// applicable (vinegars, extracts, most liquids).
export const COOKING_METHODS = [
  'raw',
  'roasted',
  'grilled',
  'seared',
  'sautéed',
  'stir-fried',
  'fried',
  'baked',
  'braised',
  'simmered',
  'steamed',
  'poached',
  'blanched',
  'cured',
  'pickled',
  'fermented',
  'smoked',
  'toasted',
];

export const TASTE_DIMS = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'];

export const MAX_TEXTURES = 4;
export const MAX_FUNCTIONS = 3;
export const MAX_METHODS = 6;

// intensity: 1–10 integer, required on every P6 proposal. How loudly the
// ingredient announces itself at typical quantity — habanero 10, jalapeño 6,
// chicken breast 2. Data-only for now (no pairing/UI consumer yet).
export const INTENSITY_MIN = 1;
export const INTENSITY_MAX = 10;
