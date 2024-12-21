import { IngredientProfile, IngredientSubcategory } from '../types.ts';
import { getCompatibilityScore } from './compatibility.ts';

interface TasteEnhancement {
  primary: string;
  complementary: string;
  enhancementFactor: number;
}

interface ThresholdLevels {
  dominant: number;
  high: number;
  medium: number;
  low: number;
}

interface TasteProfile {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  fat: number;
  spicy: number;
}

type SuggestionType = 'enhance' | 'balance' | 'category';

interface BaseSuggestion {
  type: SuggestionType;
  reason: string;
  ingredientSuggestions: string[];
}

interface TasteSuggestion extends BaseSuggestion {
  type: 'enhance' | 'balance';
  primaryTaste: string;
  suggestedTaste: string;
  currentScore: number;
  targetScore: number;
}

interface CategorySuggestion extends BaseSuggestion {
  type: 'category';
  category: keyof IngredientSubcategory;
}

type BalanceSuggestion = TasteSuggestion | CategorySuggestion;

interface BalanceAnalysis {
  averageScores: TasteProfile;
  dominantTastes: string[];
  balanceScore: number;
  suggestions: BalanceSuggestion[];
}

const TASTE_ENHANCEMENTS: TasteEnhancement[] = [
  { primary: 'sweet', complementary: 'salty', enhancementFactor: 1.5 },
  { primary: 'sour', complementary: 'sweet', enhancementFactor: 1.3 },
  { primary: 'bitter', complementary: 'sweet', enhancementFactor: 1.4 },
  { primary: 'umami', complementary: 'salty', enhancementFactor: 1.4 },
  { primary: 'spicy', complementary: 'sweet', enhancementFactor: 1.3 },
  { primary: 'fat', complementary: 'salt', enhancementFactor: 1.4 },
  { primary: 'salty', complementary: 'sour', enhancementFactor: 1.3 }
];

export const calculateThresholds = (numIngredients: number): ThresholdLevels => {
  return {
    dominant: Math.max(5 - (numIngredients * 0.4), 3),
    high: Math.max(3 - (numIngredients * 0.2), 2),
    medium: 2,
    low: 1
  };
};

export const calculateEnhancedTasteScores = (ingredients: IngredientProfile[]): TasteProfile => {
  if (ingredients.length === 0) {
    return {
      sweet: 0, salty: 0, sour: 0, bitter: 0, umami: 0, fat: 0, spicy: 0
    };
  }

  // Start with base average scores
  const baseScores = ingredients.reduce((acc, ingredient) => {
    Object.entries(ingredient.flavorProfile).forEach(([taste, value]) => {
      acc[taste as keyof TasteProfile] = (acc[taste as keyof TasteProfile] || 0) + value;
    });
    return acc;
  }, {} as TasteProfile);

  // Normalize base scores
  Object.keys(baseScores).forEach(taste => {
    baseScores[taste as keyof TasteProfile] /= ingredients.length;
  });

  // Apply taste enhancements
  const enhancedScores = { ...baseScores };
  TASTE_ENHANCEMENTS.forEach(({ primary, complementary, enhancementFactor }) => {
    if (baseScores[primary as keyof TasteProfile] > 0 && 
        baseScores[complementary as keyof TasteProfile] > 0) {
      const enhancementValue = Math.min(
        baseScores[primary as keyof TasteProfile] * 
        (baseScores[complementary as keyof TasteProfile] / 10) * 
        enhancementFactor,
        2
      );
      enhancedScores[primary as keyof TasteProfile] += enhancementValue;
      enhancedScores[complementary as keyof TasteProfile] += enhancementValue;
    }
  });

  // Cap all scores at 10
  Object.keys(enhancedScores).forEach(taste => {
    enhancedScores[taste as keyof TasteProfile] = Math.min(enhancedScores[taste as keyof TasteProfile], 10);
  });

  return enhancedScores;
};

const calculateBalanceScore = (tasteProfile: TasteProfile): number => {
  const scores = Object.values(tasteProfile).filter(score => score > 0);
  if (scores.length === 0) return 0;

  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  const rangePenalty = (max - min) / 10;
  const strongTastes = scores.filter(score => score > 4).length;
  const tastePenalty = Math.abs(strongTastes - 3) * 0.1;

  return Math.max(1 - (rangePenalty + tastePenalty), 0) * 100;
};

const findBalancingTaste = (taste: string, scores: TasteProfile): string => {
  const balancingPairs: Record<string, string[]> = {
    sweet: ['sour', 'bitter'],
    salty: ['sweet', 'sour'],
    sour: ['sweet', 'fat'],
    bitter: ['sweet', 'umami'],
    umami: ['sour', 'bitter'],
    fat: ['sour', 'spicy'],
    spicy: ['sweet', 'fat']
  };

  return balancingPairs[taste]
    .sort((a, b) => (scores[a as keyof TasteProfile] || 0) - (scores[b as keyof TasteProfile] || 0))[0];
};

const getFallbackSuggestions = (
  selectedIngredients: IngredientProfile[],
  allProfiles: IngredientProfile[],
  flavorMap: Map<string, Set<string>>
): CategorySuggestion[] => {
  if (!selectedIngredients?.length || !allProfiles?.length || !flavorMap) {
    return [];
  }

  const currentCategories = new Set(selectedIngredients.map(i => i.category));
  
  const primaryCategories: (keyof IngredientSubcategory)[] = [
    'Vegetables', 'Proteins', 'Seasonings', 'Fruits'
  ];

  const missingCategories = primaryCategories.filter(category => !currentCategories.has(category));

  return missingCategories.map(category => {
    const suggestions = allProfiles
      .filter(profile => 
        profile.category === category &&
        !selectedIngredients.map(i => i.name).includes(profile.name) &&
        getCompatibilityScore(
          profile.name,
          selectedIngredients.map(i => i.name),
          flavorMap,
          true
        ).score >= 50
      )
      .slice(0, 2)
      .map(p => p.name);

    return {
      type: 'category' as const,
      category,
      reason: `Try adding ${category.toLowerCase()} for more complexity`,
      ingredientSuggestions: suggestions
    };
  }).filter(suggestion => suggestion.ingredientSuggestions.length > 0);
};

export const analyzeTasteBalance = (
  ingredients: IngredientProfile[],
  allProfiles: IngredientProfile[],
  flavorMap: Map<string, Set<string>>
): BalanceAnalysis => {
  const thresholds = calculateThresholds(ingredients.length);
  const enhancedScores = calculateEnhancedTasteScores(ingredients);
  const balanceScore = calculateBalanceScore(enhancedScores);

  const dominantTastes = Object.entries(enhancedScores)
    .filter(([_, value]) => value >= thresholds.dominant)
    .map(([taste]) => taste);

  const suggestions: BalanceSuggestion[] = [];

  // Generate taste-based suggestions
  Object.entries(enhancedScores).forEach(([taste, score]) => {
    const typedTaste = taste as keyof TasteProfile;
    
    if (score >= thresholds.high) {
      TASTE_ENHANCEMENTS
        .filter(enhancement => enhancement.primary === taste)
        .forEach(({ complementary }) => {
          if (enhancedScores[complementary as keyof TasteProfile] <= thresholds.low) {
            suggestions.push({
                type: 'enhance',
                primaryTaste: taste,
                suggestedTaste: complementary,
                reason: `Enhance ${taste} with complementary ${complementary}`,
                currentScore: enhancedScores[complementary as keyof TasteProfile],
                targetScore: thresholds.medium
              } as TasteSuggestion);  
          }
        });
    }

    if (score >= thresholds.dominant) {
      const targetScore = score * 0.7;
      suggestions.push({
        type: 'balance',
        primaryTaste: taste,
        suggestedTaste: findBalancingTaste(taste, enhancedScores),
        reason: `Balance strong ${taste} taste`,
        currentScore: score,
        targetScore
      } as TasteSuggestion);  
    }
  });

  // If no taste-based suggestions, add category-based suggestions
  if (suggestions.length === 0) {
    suggestions.push(...getFallbackSuggestions(ingredients, allProfiles, flavorMap));
  }

  return {
    averageScores: enhancedScores,
    dominantTastes,
    balanceScore,
    suggestions: suggestions.sort((a, b) => {
      if ('currentScore' in a && 'currentScore' in b) {
        if (a.currentScore > 8 && b.currentScore <= 8) return -1;
        if (b.currentScore > 8 && a.currentScore <= 8) return 1;
        return b.currentScore - a.currentScore;
      }
      return 0;
    })
  };
};