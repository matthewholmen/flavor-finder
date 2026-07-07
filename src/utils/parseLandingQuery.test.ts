import { parseLandingQuery, parsedEntityCount, LandingLexicon } from './parseLandingQuery';

// A small realistic lexicon: multi-word ingredients, a plural dish tag, a
// cuisine, and single-word ingredients that are substrings of others.
const lex: LandingLexicon = {
  ingredients: [
    'spinach', 'apple', 'beet', 'sour cream', 'lemon', 'cream',
    'chicken', 'tomato', 'blueberry', 'olive oil', 'grass jelly',
  ],
  dishTags: ['salads', 'stir-fries', 'soups', 'pasta', 'sandwiches & burgers', 'tacos & burritos', 'grilling & bbq'],
  cuisineTags: ['French', 'Central European', 'Cajun & Creole'],
};

describe('parseLandingQuery', () => {
  it('splits an ingredients-and-dish query into all its entities', () => {
    const p = parseLandingQuery('spinach and apple salad', lex);
    expect(p.ingredients).toEqual(['spinach', 'apple']);
    expect(p.dishTag).toBe('salads'); // "salad" stems onto the "salads" tag
    expect(p.cuisineTag).toBeNull();
    expect(p.unmatched).toEqual([]);
    expect(parsedEntityCount(p)).toBe(3);
  });

  it('binds multi-word ingredients before their single-word substrings', () => {
    const p = parseLandingQuery('sour cream and lemon', lex);
    expect(p.ingredients).toEqual(['sour cream', 'lemon']); // not "cream"
  });

  it('folds plurals onto canonical singulars', () => {
    const p = parseLandingQuery('apples tomatoes blueberries', lex);
    expect(p.ingredients).toEqual(['apple', 'tomato', 'blueberry']);
  });

  it('matches a cuisine plus an ingredient', () => {
    const p = parseLandingQuery('french chicken', lex);
    expect(p.cuisineTag).toBe('French');
    expect(p.ingredients).toEqual(['chicken']);
  });

  it('matches one side of a compound tag, singular or plural', () => {
    // "sandwich" / "sandwiches" both reach the canonical "sandwiches & burgers".
    expect(parseLandingQuery('chicken sandwich', lex).dishTag).toBe('sandwiches & burgers');
    expect(parseLandingQuery('chicken sandwiches', lex).dishTag).toBe('sandwiches & burgers');
    expect(parseLandingQuery('chicken burger', lex).dishTag).toBe('sandwiches & burgers');
    expect(parseLandingQuery('beef tacos', lex).dishTag).toBe('tacos & burritos');
    expect(parseLandingQuery('bbq chicken', lex).dishTag).toBe('grilling & bbq');
  });

  it('matches one side of a compound cuisine tag', () => {
    expect(parseLandingQuery('creole chicken', lex).cuisineTag).toBe('Cajun & Creole');
  });

  it('still matches the full compound tag phrase', () => {
    const p = parseLandingQuery('chicken sandwiches and burgers', lex);
    expect(p.dishTag).toBe('sandwiches & burgers');
    expect(p.ingredients).toEqual(['chicken']);
  });

  it('resolves hyphen/spacing aliases to the canonical tag', () => {
    const p = parseLandingQuery('chicken stir fry', lex);
    expect(p.dishTag).toBe('stir-fries');
    expect(p.ingredients).toEqual(['chicken']);
  });

  it('type-ahead completes a partial trailing word', () => {
    // "desser" is not a full word, but it prefixes the "desserts" dish tag.
    const withDesserts: LandingLexicon = {
      ...lex,
      ingredients: [...lex.ingredients, 'raspberry'],
      dishTags: [...lex.dishTags, 'desserts'],
    };
    const p = parseLandingQuery('raspberry desser', withDesserts);
    expect(p.ingredients).toEqual(['raspberry']);
    expect(p.dishTag).toBe('desserts');
  });

  it('type-ahead completes a partial ingredient', () => {
    const p = parseLandingQuery('spinach appl', lex);
    expect(p.ingredients).toEqual(['spinach', 'apple']);
  });

  it('type-ahead completes a partial side of a compound tag', () => {
    const p = parseLandingQuery('chicken sandwic', lex);
    expect(p.dishTag).toBe('sandwiches & burgers');
    expect(p.ingredients).toEqual(['chicken']);
  });

  it('does not type-ahead on too-short a fragment', () => {
    const p = parseLandingQuery('spinach ap', lex); // "ap" below the prefix floor
    expect(p.ingredients).toEqual(['spinach']);
    expect(p.unmatched).toEqual(['ap']);
  });

  it('picks the shortest completion for an ambiguous prefix', () => {
    const amb: LandingLexicon = { ...lex, ingredients: [...lex.ingredients, 'apple', 'apple brandy'] };
    const p = parseLandingQuery('appl', amb); // completes to "apple", not "apple brandy"
    expect(p.ingredients).toEqual(['apple']);
  });

  it('reports meaningful leftovers as unmatched, dropping stopwords', () => {
    const p = parseLandingQuery('spinach with sardines', lex);
    expect(p.ingredients).toEqual(['spinach']);
    expect(p.unmatched).toEqual(['sardines']); // not in the lexicon
  });

  it('de-duplicates repeated ingredients and keeps the first tag only', () => {
    const p = parseLandingQuery('apple apple salad soup', lex);
    expect(p.ingredients).toEqual(['apple']);
    expect(p.dishTag).toBe('salads'); // "soup" ignored, first dish wins
  });

  it('leaves -ss words alone (does not over-stem)', () => {
    const p = parseLandingQuery('grass jelly', lex);
    expect(p.ingredients).toEqual(['grass jelly']);
  });

  it('returns an empty parse for a blank query', () => {
    const p = parseLandingQuery('   ', lex);
    expect(parsedEntityCount(p)).toBe(0);
    expect(p.unmatched).toEqual([]);
  });

  it('handles a single ingredient (composite path will decline this)', () => {
    const p = parseLandingQuery('spinach', lex);
    expect(parsedEntityCount(p)).toBe(1);
  });
});
