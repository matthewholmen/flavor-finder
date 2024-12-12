import React from 'react';
import { AlertCircle, ArrowRight, Scale } from 'lucide-react';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors.ts';
import { getCompatibilityScore } from '../utils/compatibility.ts';

// Updated taste relationships with broader matches
const TASTE_RELATIONSHIPS = {
  // Tastes that counteract/balance each other
  balancing: {
    sweet: ['sour', 'bitter', 'spicy', 'salty'],
    salty: ['sour', 'bitter', 'sweet'],
    sour: ['sweet', 'fat', 'salty'],
    bitter: ['sweet', 'fat', 'salty'],
    umami: ['sour', 'bitter', 'sweet'],
    fat: ['sour', 'spicy', 'salty'],
    spicy: ['sweet', 'fat', 'sour']
  },
  // Tastes that enhance/amplify each other
  enhancing: {
    sweet: ['salty', 'fat', 'umami'],
    salty: ['umami', 'fat', 'sour'],
    sour: ['salty', 'spicy', 'umami'],
    bitter: ['salty', 'umami', 'spicy'],
    umami: ['salty', 'fat', 'spicy'],
    fat: ['salt', 'sweet', 'umami'],
    spicy: ['sour', 'umami', 'salty']
  }
};

// Significantly lowered thresholds to be more permissive
const TASTE_THRESHOLDS = {
  dominant: 4.5, // Lowered from 7
  high: 4,      // Lowered from 5.5
  medium: 2.5,  // Lowered from 4
  low: 1.5      // Lowered from 2.5
};

interface TasteProfile {
  sweet: number;
  salty: number;
  sour: number;
  bitter: number;
  umami: number;
  fat: number;
  spicy: number;
}

interface EnhancedTasteAnalysisProps {
  averageScores: TasteProfile;
  ingredientProfiles: IngredientProfile[];
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  handleIngredientSelect: (ingredient: string) => void;
}

const findSuggestedIngredients = (
  taste: string,
  minStrength: number,
  profiles: IngredientProfile[],
  selectedIngredients: string[],
  flavorMap: Map<string, Set<string>>,
  existingScores: TasteProfile
): string[] => {
  if (!flavorMap) return [];

  // More permissive filtering
  const candidates = profiles
    .filter(profile => {
      const tasteValue = profile.flavorProfile[taste as keyof TasteProfile];
      const hasSomeTaste = tasteValue >= minStrength * 0.7; // 30% more permissive

      // Lowered compatibility threshold
      const compatibility = getCompatibilityScore(
        profile.name,
        selectedIngredients,
        flavorMap,
        true
      );

      const notSelected = !selectedIngredients.includes(profile.name);

      return hasSomeTaste && compatibility.score >= 50 && notSelected; // Lowered from 75
    })
    .sort((a, b) => {
      const aValue = a.flavorProfile[taste as keyof TasteProfile];
      const bValue = b.flavorProfile[taste as keyof TasteProfile];
      return bValue - aValue;
    });

  // Always try to return at least one suggestion
  return candidates.slice(0, 2).map(profile => profile.name);
};

const analyzeTasteProfile = (
  averageScores: TasteProfile,
  ingredientProfiles: IngredientProfile[],
  selectedIngredients: string[],
  flavorMap: Map<string, Set<string>>
) => {
  if (!flavorMap) return [];

  const suggestions: Array<{
    type: 'balance' | 'enhance';
    taste: string;
    suggestionTaste: string;
    reason: string;
    ingredientSuggestions: string[];
  }> = [];

  // Look at all tastes that have any presence
  Object.entries(averageScores)
    .filter(([_, value]) => value > TASTE_THRESHOLDS.low) // More permissive filtering
    .forEach(([taste, value]) => {
      // Always try both balancing and enhancing options
      const balancingTastes = TASTE_RELATIONSHIPS.balancing[taste as keyof typeof TASTE_RELATIONSHIPS.balancing] || [];
      balancingTastes.forEach(balancingTaste => {
        const suggestedIngredients = findSuggestedIngredients(
          balancingTaste,
          TASTE_THRESHOLDS.low, // Lowered threshold
          ingredientProfiles,
          selectedIngredients,
          flavorMap,
          averageScores
        );
        
        if (suggestedIngredients.length > 0) {
          suggestions.push({
            type: 'balance',
            taste,
            suggestionTaste: balancingTaste,
            reason: `Balance ${taste} with ${balancingTaste}`,
            ingredientSuggestions: suggestedIngredients
          });
        }
      });

      const enhancingTastes = TASTE_RELATIONSHIPS.enhancing[taste as keyof typeof TASTE_RELATIONSHIPS.enhancing] || [];
      enhancingTastes.forEach(enhancingTaste => {
        const suggestedIngredients = findSuggestedIngredients(
          enhancingTaste,
          TASTE_THRESHOLDS.low, // Lowered threshold
          ingredientProfiles,
          selectedIngredients,
          flavorMap,
          averageScores
        );
        
        if (suggestedIngredients.length > 0) {
          suggestions.push({
            type: 'enhance',
            taste,
            suggestionTaste: enhancingTaste,
            reason: `Enhance ${taste} with ${enhancingTaste}`,
            ingredientSuggestions: suggestedIngredients
          });
        }
      });
    });

  // Ensure we always return some suggestions if available
  const balancingSuggestions = suggestions.filter(s => s.type === 'balance');
  const enhancingSuggestions = suggestions.filter(s => s.type === 'enhance');
  
  // Get at least one of each type if available
  return [
    ...balancingSuggestions.slice(0, 2),
    ...enhancingSuggestions.slice(0, 2)
  ];
};

// Rest of the component remains the same
const EnhancedTasteAnalysis: React.FC<EnhancedTasteAnalysisProps> = ({
  averageScores,
  ingredientProfiles,
  selectedIngredients,
  flavorMap,
  handleIngredientSelect
}) => {
  const suggestions = analyzeTasteProfile(
    averageScores,
    ingredientProfiles,
    selectedIngredients,
    flavorMap
  );

  return (
    <div className="mt-6 space-y-4">
      {suggestions.map((suggestion, index) => (
        <div 
          key={index}
          className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-2">
            {suggestion.type === 'balance' ? (
              <Scale className="h-5 w-5 text-yellow-500" />
            ) : (
              <ArrowRight className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm font-medium">{suggestion.reason}</span>
          </div>
          {suggestion.ingredientSuggestions.length > 0 && (
            <div className="ml-7 mt-2 flex flex-wrap gap-2">
              {suggestion.ingredientSuggestions.map((ingredient) => {
                const profile = ingredientProfiles.find(p => 
                  p.name.toLowerCase() === ingredient.toLowerCase()
                );
                const dominantTaste = Object.entries(profile?.flavorProfile || {})
                  .reduce((a, b) => a[1] > b[1] ? a : b)[0];
                const backgroundColor = TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS];
                
                const compatibility = getCompatibilityScore(
                  ingredient, 
                  selectedIngredients, 
                  flavorMap, 
                  true
                );
                
                return (
                  <div
                    key={ingredient}
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
                      cursor-pointer hover:opacity-90 transition-opacity
                      ${compatibility.score < 100 ? 'border-2 border-dashed' : ''}
                    `}
                    style={{
                      backgroundColor: compatibility.score < 100 ? 'white' : backgroundColor,
                      borderColor: backgroundColor,
                      color: compatibility.score < 100 ? 'black' : 'white'
                    }}
                    onClick={() => handleIngredientSelect(ingredient)}
                  >
                    {ingredient}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EnhancedTasteAnalysis;