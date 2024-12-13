import { IngredientProfile } from '../types';

export interface TasteSuggestion {
  type: 'balance' | 'enhance';
  primaryTaste: keyof TasteProfile;
  complementaryTaste: keyof TasteProfile;
  suggestions: IngredientProfile[];
}

type TasteProfile = {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  fat: number;
  spicy: number;
};

export function generateTasteSuggestions(
  selectedProfiles: (IngredientProfile | undefined)[],
  allProfiles: IngredientProfile[],
  flavorPairings: Record<string, string[]>
): TasteSuggestion[] {
  // Filter out undefined profiles
  const profiles = selectedProfiles.filter((p): p is IngredientProfile => p !== undefined);
  
  // Calculate aggregate taste profile
  const aggregateTastes = calculateAggregateTastes(profiles);
  
  // Sort tastes by dominance (percentage of total)
  const sortedTastes = Object.entries(aggregateTastes)
    .sort(([, a], [, b]) => b - a);
  
  // Get dominant taste (highest percentage)
  const [dominantTaste, dominantScore] = sortedTastes[0];
  
  // Find complementary tastes based on flavor principles
  const complementaryTastes: Record<keyof TasteProfile, Array<keyof TasteProfile>> = {
    sour: ['sweet', 'fat'],
    sweet: ['sour', 'bitter'],
    bitter: ['sweet', 'fat'],
    salty: ['fat', 'umami'],
    umami: ['salty', 'sour'],
    fat: ['salty', 'sour'],
    spicy: ['fat', 'sweet']
  };
  
  // Generate suggestions for balancing dominant taste
  const suggestions: TasteSuggestion[] = [];
  
  if (dominantScore > 0.3) { // Only suggest balance if taste is significantly dominant
    for (const complementaryTaste of complementaryTastes[dominantTaste as keyof TasteProfile]) {
      const compatibleIngredients = findCompatibleIngredients(
        profiles,
        allProfiles,
        flavorPairings,
        complementaryTaste
      );
      
      if (compatibleIngredients.length > 0) {
        suggestions.push({
          type: 'balance',
          primaryTaste: dominantTaste as keyof TasteProfile,
          complementaryTaste,
          suggestions: compatibleIngredients.slice(0, 2)
        });
      }
    }
  }
  
  return suggestions;
}

function findCompatibleIngredients(
  selectedProfiles: IngredientProfile[],
  allProfiles: IngredientProfile[],
  flavorPairings: Record<string, string[]>,
  targetTaste: keyof TasteProfile
): IngredientProfile[] {
  // Filter ingredients that pair well with ALL selected ingredients
  const compatibleIngredients = allProfiles.filter(profile => {
    const pairsWellWithAll = selectedProfiles.every(selected =>
      flavorPairings[selected.name]?.includes(profile.name)
    );
    
    // Check if this ingredient has the target taste as its primary taste
    const isPrimaryTaste = getPrimaryTaste(profile.flavorProfile) === targetTaste;
    
    return pairsWellWithAll && isPrimaryTaste;
  });
  
  // Sort by compatibility score (how many existing ingredients it pairs with)
  return compatibleIngredients.sort((a, b) => {
    const scoreA = calculateCompatibilityScore(a, selectedProfiles, flavorPairings);
    const scoreB = calculateCompatibilityScore(b, selectedProfiles, flavorPairings);
    return scoreB - scoreA;
  });
}

function getPrimaryTaste(tastes: TasteProfile): keyof TasteProfile {
  return Object.entries(tastes)
    .sort(([, a], [, b]) => b - a)[0][0] as keyof TasteProfile;
}

function calculateCompatibilityScore(
  profile: IngredientProfile,
  selectedProfiles: IngredientProfile[],
  flavorPairings: Record<string, string[]>
): number {
  return selectedProfiles.reduce((score, selected) => {
    if (flavorPairings[selected.name]?.includes(profile.name)) {
      score += 1;
    }
    return score;
  }, 0);
}

function calculateAggregateTastes(profiles: IngredientProfile[]): TasteProfile {
  const aggregate: TasteProfile = {
    sweet: 0, sour: 0, salty: 0, bitter: 0, umami: 0, fat: 0, spicy: 0
  };
  
  profiles.forEach(profile => {
    Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
      aggregate[taste as keyof TasteProfile] += value;
    });
  });
  
  // Normalize to percentages
  const total = Object.values(aggregate).reduce((sum, val) => sum + val, 0);
  Object.keys(aggregate).forEach(taste => {
    aggregate[taste as keyof TasteProfile] = total ? aggregate[taste as keyof TasteProfile] / total : 0;
  });
  
  return aggregate;
}

// Helper functions as private exports for testing
export const _internal = {
  findCompatibleIngredients,
  getPrimaryTaste,
  calculateCompatibilityScore,
  calculateAggregateTastes
};