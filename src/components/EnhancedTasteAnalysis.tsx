import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors.ts';
import { getCompatibilityScore } from '../utils/compatibility.ts';

const TASTE_RELATIONSHIPS = {
  balancing: {
    sweet: ['bitter', 'sour'],
    salty: [],
    sour: ['sweet', 'fat'],
    bitter: ['umami', 'sweet'],
    umami: ['bitter'],
    fat: ['sour', 'spicy'],
    spicy: ['sweet', 'fat']
  },
  complementary: {
    sweet: ['fat', 'spicy', 'salty'],
    salty: ['sweet', 'umami', 'fat'],
    sour: ['spicy'],
    bitter: [],
    umami: ['fat', 'salty'],
    fat: ['umami', 'sweet', 'salty'],
    spicy: ['sour', 'sweet']
  }
};

const TASTE_THRESHOLDS = {
  high: 6,
  medium: 4,
  low: 2,
  veryLow: 1
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

// Modified findSuggestedIngredients with progressive threshold reduction
const findSuggestedIngredients = (
    taste: string,
    profiles: IngredientProfile[],
    selectedIngredients: string[],
    flavorMap: Map<string, Set<string>>,
    initialThreshold = 3  // Lowered from 5
  ): string[] => {
    if (!flavorMap) return [];
  
    // First try to find compatible ingredients that meet the taste threshold
    const perfectMatches = profiles
      .filter(profile => {
        const hasTaste = profile.flavorProfile[taste as keyof TasteProfile] >= initialThreshold;
        
        const compatibility = getCompatibilityScore(
          profile.name,
          selectedIngredients,
          flavorMap,
          true
        );
        
        // Lowered from 100 to 75 for more permissive matching
        const isCompatible = compatibility.score >= 75;
        const notSelected = !selectedIngredients.includes(profile.name);
        
        return hasTaste && isCompatible && notSelected;
      })
      .sort((a, b) => 
        b.flavorProfile[taste as keyof TasteProfile] -
        a.flavorProfile[taste as keyof TasteProfile]
      )
      .slice(0, 2)
      .map(profile => profile.name);
  
    if (perfectMatches.length > 0) {
      return perfectMatches;
    }
  
    // If no initial matches, look for partial matches with even lower requirements
    return profiles
      .filter(profile => {
        const hasTaste = profile.flavorProfile[taste as keyof TasteProfile] >= 2; // Lowered threshold
        
        const compatibility = getCompatibilityScore(
          profile.name,
          selectedIngredients,
          flavorMap,
          true
        );
        
        // Lowered from 50 to 30 for more permissive partial matching
        const isPartiallyCompatible = compatibility.score >= 30;
        const notSelected = !selectedIngredients.includes(profile.name);
        
        return hasTaste && isPartiallyCompatible && notSelected;
      })
      .sort((a, b) => {
        // Sort by compatibility score first
        const aScore = getCompatibilityScore(a.name, selectedIngredients, flavorMap, true).score;
        const bScore = getCompatibilityScore(b.name, selectedIngredients, flavorMap, true).score;
        
        if (bScore !== aScore) {
          return bScore - aScore;
        }
        
        // If compatibility is equal, sort by taste value
        return b.flavorProfile[taste as keyof TasteProfile] -
               a.flavorProfile[taste as keyof TasteProfile];
      })
      .slice(0, 2)
      .map(profile => profile.name);
  };

  

const EnhancedTasteAnalysis: React.FC<EnhancedTasteAnalysisProps> = ({
  averageScores,
  ingredientProfiles,
  selectedIngredients,
  flavorMap,
  handleIngredientSelect
}) => {
  const getDominantTastes = (profile: TasteProfile): string[] => {
    return Object.entries(profile)
      .filter(([_, value]) => value >= TASTE_THRESHOLDS.medium)
      .sort(([, a], [, b]) => b - a)
      .map(([taste]) => taste);
  };

  const analyzeTasteBalance = () => {
    if (!flavorMap) return [];

    const dominantTastes = getDominantTastes(averageScores);
    const suggestions: Array<{
      type: string;
      suggestion: string;
      ingredientSuggestions: string[];
    }> = [];

    dominantTastes.forEach(taste => {
      // Check if we need balancing tastes
      if (averageScores[taste as keyof TasteProfile] >= TASTE_THRESHOLDS.high) {
        const balancingTastes = TASTE_RELATIONSHIPS.balancing[taste as keyof typeof TASTE_RELATIONSHIPS.balancing] || [];
        
        balancingTastes.forEach(balancingTaste => {
          if (averageScores[balancingTaste as keyof TasteProfile] < TASTE_THRESHOLDS.medium) {
            const suggestedIngredients = findSuggestedIngredients(
              balancingTaste,
              ingredientProfiles,
              selectedIngredients,
              flavorMap
            );
            
            suggestions.push({
              type: 'balance',
              suggestion: `Balance ${taste} with ${balancingTaste}`,
              ingredientSuggestions: suggestedIngredients
            });
          }
        });
      }

      // Check for complementary enhancement opportunities
      const complementaryTastes = TASTE_RELATIONSHIPS.complementary[taste as keyof typeof TASTE_RELATIONSHIPS.complementary] || [];
      
      complementaryTastes.forEach(complementaryTaste => {
        if (averageScores[complementaryTaste as keyof TasteProfile] < TASTE_THRESHOLDS.low) {
          const suggestedIngredients = findSuggestedIngredients(
            complementaryTaste,
            ingredientProfiles,
            selectedIngredients,
            flavorMap
          );
          
          suggestions.push({
            type: 'enhance',
            suggestion: `Enhance ${taste} with ${complementaryTaste}`,
            ingredientSuggestions: suggestedIngredients
          });
        }
      });
    });

    return suggestions;
  };

  const suggestions = analyzeTasteBalance();

  return (
    <div className="mt-6 space-y-4">
      {suggestions.map((suggestion, index) => (
        <div 
          key={index}
          className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-2">
            {suggestion.type === 'balance' ? (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            ) : (
              <ArrowRight className="h-5 w-5 text-blue-500" />
            )}
            <span className="text-sm">{suggestion.suggestion}</span>
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
                
                const isPartialMatch = getCompatibilityScore(
                  ingredient, 
                  selectedIngredients, 
                  flavorMap, 
                  true
                ).score < 100;
                
                return (
                  <div
                    key={ingredient}
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
                      cursor-pointer hover:opacity-90 transition-opacity
                      ${isPartialMatch ? 'border-2 border-dashed' : ''}
                    `}
                    style={{
                      backgroundColor: isPartialMatch ? 'white' : backgroundColor,
                      borderColor: backgroundColor,
                      color: isPartialMatch ? 'black' : 'white'
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