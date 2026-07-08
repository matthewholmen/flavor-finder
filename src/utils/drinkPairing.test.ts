import { computeDishProfile, dishDescriptors, FRAME_CONTEXTS } from './dishProfile';
import { suggestDrinks } from './drinkPairing';
import { INGREDIENT_DRINK_PAIRINGS } from '../data/drinkPairings';
import { DRINK_STYLE_ATTRS } from '../data/drinkStyles';
import { getProfile } from './atlas';

// Every test dish is mutually compatible per the flavor map (verified against
// flavorPairings) — dish-level surfaces only ever see engine-valid combos, so
// the tests must too. Don't add a dish here without checking its edges.
const MARGHERITA = ['tomato', 'mozzarella', 'basil', 'olive oil', 'garlic'];
const PASTA_NIGHT = ['pasta', 'tomato', 'basil', 'parmesan', 'olive oil'];
const STIR_FRY = ['chicken', 'ginger', 'garlic', 'broccoli', 'soy sauce'];
const GINGER_SLAW = ['ginger', 'lime', 'cilantro', 'peanut'];
const SALMON_BUTTER = ['salmon', 'butter', 'lemon', 'asparagus'];

describe('computeDishProfile', () => {
  it('disambiguates the same ingredients through the frame', () => {
    const asPasta = computeDishProfile(MARGHERITA, 'frame-pasta');
    const asSalad = computeDishProfile(MARGHERITA, 'frame-salad');
    expect(asSalad.weight).toBeLessThan(asPasta.weight);
    expect(asSalad.richness).toBeLessThan(asPasta.richness); // fat as dressing, not melted
    expect(asSalad.acidity).toBeGreaterThan(asPasta.acidity); // raw reads brighter
  });

  it('mellows non-chili heat in cooked frames (ginger) but not in raw ones', () => {
    const cooked = computeDishProfile(STIR_FRY, 'frame-stir-fry');
    const raw = computeDishProfile(GINGER_SLAW, 'frame-salad');
    const gingerSpice = getProfile('ginger')!.flavorProfile.spicy;
    expect(raw.heat).toBe(gingerSpice); // raw ginger keeps its full bite
    expect(cooked.heat).toBeLessThan(gingerSpice);
  });

  it('damps condiment contributions so soy sauce does not set the salt level', () => {
    const dish = computeDishProfile(STIR_FRY, 'frame-stir-fry');
    const soySalt = getProfile('soy sauce')!.flavorProfile.salty;
    expect(dish.salt).toBeLessThan(soySalt);
  });

  it('resists single-ingredient saturation (butter alone is not a rich dish)', () => {
    const dish = computeDishProfile(SALMON_BUTTER);
    expect(dish.richness).toBeLessThan(10);
    expect(dish.richness).toBeGreaterThan(5); // still reads rich — salmon + butter
  });

  it('produces display descriptors', () => {
    const salad = computeDishProfile(MARGHERITA, 'frame-salad');
    expect(dishDescriptors(salad)).toContain('light');
  });
});

describe('suggestDrinks', () => {
  it('backs suggestions with book evidence receipts', () => {
    const chianti = suggestDrinks(MARGHERITA).find(s => s.drink.name === 'Chianti');
    expect(chianti).toBeDefined();
    expect(chianti!.evidence).toEqual(expect.arrayContaining(['tomato', 'mozzarella', 'basil']));
  });

  it('reaches for aromatic whites on raw heat, with the rule as receipt', () => {
    const top = suggestDrinks(GINGER_SLAW, { frameId: 'frame-salad', limit: 5 });
    const aromatic = top.filter(s => s.drink.style === 'aromatic white');
    expect(aromatic.length).toBeGreaterThan(0);
    expect(aromatic[0].rules).toContain('cools the heat');
  });

  it('warns when tannin or alcohol would amplify heat', () => {
    const all = suggestDrinks(GINGER_SLAW, { frameId: 'frame-salad', limit: 100 });
    const boldRed = all.find(s => s.drink.style === 'bold red');
    const whiskey = all.find(s => s.drink.style === 'whiskey');
    expect(boldRed!.warnings).toContain('tannin amplifies the heat');
    expect(whiskey!.warnings).toContain('alcohol amplifies the heat');
  });

  it('cuts richness with acid or bubbles on fat-heavy dishes', () => {
    const top = suggestDrinks(SALMON_BUTTER, { limit: 5 });
    expect(top.some(s => s.rules.includes('cuts the richness'))).toBe(true);
  });

  it('honors the alcohol-free filter', () => {
    const top = suggestDrinks(PASTA_NIGHT, { nonAlcoholicOnly: true, limit: 10 });
    expect(top.length).toBeGreaterThan(0);
    expect(top.every(s => s.drink.category === 'nonAlcoholic')).toBe(true);
  });

  it('is deterministic', () => {
    const a = suggestDrinks(STIR_FRY, { frameId: 'frame-stir-fry' }).map(s => s.drink.name);
    const b = suggestDrinks(STIR_FRY, { frameId: 'frame-stir-fry' }).map(s => s.drink.name);
    expect(a).toEqual(b);
  });
});

describe('drink pairing data invariants', () => {
  it('keys every pairing to a real, non-Alcohol app ingredient', () => {
    for (const key of Object.keys(INGREDIENT_DRINK_PAIRINGS)) {
      const p = getProfile(key);
      expect(p).not.toBeNull();
      expect(p!.category).not.toBe('Alcohol');
    }
  });

  it('gives every drink a style the attribute table covers', () => {
    for (const drinks of Object.values(INGREDIENT_DRINK_PAIRINGS)) {
      for (const d of drinks) {
        expect(DRINK_STYLE_ATTRS[d.style]).toBeDefined();
      }
    }
  });

  it('covers every frame preset with a frame context', () => {
    for (const id of ['frame-salad', 'frame-grain-bowl', 'frame-pasta', 'frame-stir-fry', 'frame-soup']) {
      expect(FRAME_CONTEXTS[id]).toBeDefined();
    }
  });
});
