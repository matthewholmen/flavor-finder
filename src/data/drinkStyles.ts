// data/drinkStyles.ts
//
// Authored attribute table for the drink styles used by INGREDIENT_DRINK_PAIRINGS.
// Values are 0–10 editorial judgments per STYLE (not per bottle), sourced from
// standard sommelier/beer references (body-acid-tannin style charts, BJCP style
// guide). "tannin" doubles as hop/roast bitterness for beer and barrel grip for
// spirits — the axis that clashes with capsaicin heat and heavy umami.
//
// This table exists so the drink engine can do CONTRAST math (cut richness, soothe
// heat, match body) instead of scaling ingredient affinity up — menu-level pairing
// rewards balance, not similarity.

export const DRINK_STYLE_NAMES = [
  // wine
  'bold red', 'medium red', 'light red', 'rosé', 'crisp white', 'aromatic white',
  'rich white', 'sweet white', 'sparkling', 'sweet sparkling', 'fortified',
  'fortified sweet',
  // beer
  'light lager', 'pale ale', 'ipa', 'wheat', 'belgian', 'brown', 'dark', 'sour',
  'specialty',
  // spirits & fortified
  'whiskey', 'gin', 'vodka', 'rum', 'brandy', 'sake', 'liqueur', 'bitter liqueur',
  'bitters', 'mixed', 'fortified wine',
  // non-alcoholic
  'tea', 'coffee', 'citrus juice', 'citrus drink', 'fruit juice',
] as const;
export type DrinkStyle = (typeof DRINK_STYLE_NAMES)[number];

export interface DrinkStyleAttrs {
  /** Weight/fullness on the palate: light lager 2 → whiskey 8. */
  body: number;
  /** Perceived acidity/brightness. */
  acid: number;
  /** Tannin, hop bitterness, or roast grip — the heat-and-umami clasher. */
  tannin: number;
  /** Residual sweetness. */
  sweet: number;
  /** Carbonation — a richness cutter in its own right. */
  carbonation: number;
  /** Alcohol heat — amplifies capsaicin. */
  alcohol: number;
}

const attrs = (
  body: number, acid: number, tannin: number, sweet: number,
  carbonation: number, alcohol: number,
): DrinkStyleAttrs => ({ body, acid, tannin, sweet, carbonation, alcohol });

export const DRINK_STYLE_ATTRS: Record<DrinkStyle, DrinkStyleAttrs> = {
  'bold red':        attrs(8, 4, 8, 1, 0, 8),
  'medium red':      attrs(6, 5, 5, 2, 0, 7),
  'light red':       attrs(4, 6, 3, 2, 0, 6),
  'rosé':            attrs(3, 7, 1, 3, 0, 6),
  'crisp white':     attrs(3, 8, 0, 1, 0, 6),
  'aromatic white':  attrs(4, 7, 0, 4, 0, 5),
  'rich white':      attrs(6, 5, 1, 2, 0, 7),
  'sweet white':     attrs(4, 6, 0, 8, 0, 5),
  'sparkling':       attrs(3, 8, 0, 2, 9, 6),
  'sweet sparkling': attrs(3, 6, 0, 7, 9, 5),
  'fortified':       attrs(7, 4, 3, 5, 0, 9),
  'fortified sweet': attrs(7, 4, 2, 9, 0, 9),

  'light lager':     attrs(2, 4, 0, 2, 8, 3),
  'pale ale':        attrs(4, 4, 2, 3, 7, 4),
  'ipa':             attrs(5, 4, 4, 3, 7, 5),
  'wheat':           attrs(3, 5, 0, 4, 8, 3),
  'belgian':         attrs(5, 4, 1, 5, 8, 6),
  'brown':           attrs(5, 3, 2, 5, 6, 4),
  'dark':            attrs(7, 3, 3, 5, 5, 5),
  'sour':            attrs(3, 9, 0, 3, 7, 3),
  'specialty':       attrs(5, 4, 2, 4, 6, 4),

  'whiskey':         attrs(8, 2, 4, 3, 0, 10),
  'gin':             attrs(5, 5, 1, 1, 0, 10),
  'vodka':           attrs(4, 3, 0, 1, 0, 10),
  'rum':             attrs(6, 2, 1, 6, 0, 10),
  'brandy':          attrs(7, 3, 3, 5, 0, 10),
  'sake':            attrs(4, 4, 0, 4, 0, 6),
  'liqueur':         attrs(6, 2, 0, 8, 0, 8),
  'bitter liqueur':  attrs(6, 4, 6, 4, 0, 8),
  'bitters':         attrs(5, 5, 7, 2, 3, 6),
  'mixed':           attrs(4, 5, 1, 5, 4, 6),
  'fortified wine':  attrs(7, 4, 3, 5, 0, 9),

  'tea':             attrs(2, 4, 5, 1, 0, 0),
  'coffee':          attrs(5, 4, 6, 1, 0, 0),
  'citrus juice':    attrs(2, 8, 0, 5, 0, 0),
  'citrus drink':    attrs(2, 7, 0, 6, 4, 0),
  'fruit juice':     attrs(3, 5, 0, 7, 0, 0),
};
