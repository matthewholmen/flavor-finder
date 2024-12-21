import React from 'react';
import { AlertCircle, TrendingDown, TrendingUp, Tags, Scale, Plus } from 'lucide-react';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors.ts';
import { getCompatibilityScore } from '../utils/compatibility.ts';
import { analyzeTasteBalance, calculateEnhancedTasteScores } from '../utils/tasteAnalysis.ts';

interface EnhancedTasteAnalysisProps {
  averageScores: TasteProfile;
  ingredientProfiles: IngredientProfile[];
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
  handleIngredientSelect: (ingredient: string) => void;
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

// Modified to use new threshold system and enhanced taste analysis
const findSuggestedIngredients = (
  taste: string,
  targetScore: number,
  profiles: IngredientProfile[],
  selectedIngredients: string[],
  flavorMap: Map<string, Set<string>>,
): string[] => {
  if (!flavorMap) return [];

  // Calculate how much of the taste we need
  const desiredIntensity = Math.max(targetScore / 2, 3); // At least 3 to make an impact
  
  return profiles
    .filter(profile => {
      const hasTaste = profile.flavorProfile[taste as keyof TasteProfile] >= desiredIntensity;
      const compatibility = getCompatibilityScore(
        profile.name,
        selectedIngredients,
        flavorMap,
        true
      );
      const notSelected = !selectedIngredients.includes(profile.name);
      
      return hasTaste && compatibility.score >= 50 && notSelected;
    })
    .sort((a, b) => {
      // Sort by a combination of taste intensity and compatibility
      const aComp = getCompatibilityScore(a.name, selectedIngredients, flavorMap, true).score;
      const bComp = getCompatibilityScore(b.name, selectedIngredients, flavorMap, true).score;
      const aTaste = a.flavorProfile[taste as keyof TasteProfile];
      const bTaste = b.flavorProfile[taste as keyof TasteProfile];
      
      // Weighted scoring: 60% compatibility, 40% taste intensity
      return (bComp * 0.6 + bTaste * 0.4) - (aComp * 0.6 + aTaste * 0.4);
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
  // Get the profiles of currently selected ingredients
  const selectedProfiles = selectedIngredients
    .map(name => ingredientProfiles.find(p => p.name.toLowerCase() === name.toLowerCase()))
    .filter((p): p is IngredientProfile => p !== undefined);

  // Get enhanced analysis
  const analysis = analyzeTasteBalance(selectedProfiles, ingredientProfiles, flavorMap);
  const enhancedScores = analysis.averageScores;  // Get scores from analysis result


  // Convert suggestions to UI format
  const suggestions = analysis.suggestions.map(suggestion => {
    if (suggestion.type === 'category') {
      // Handle category suggestion
      return {
        type: suggestion.type,
        suggestion: `Try adding: ${suggestion.category}`,
        ingredientSuggestions: suggestion.ingredientSuggestions,
        reason: suggestion.reason,
        score: null  // or undefined if you prefer
      };
    } else {
      // Handle taste-based suggestions
      return {
        type: suggestion.type,
        suggestion: suggestion.type === 'balance'
          ? `Balance ${suggestion.primaryTaste} with ${suggestion.suggestedTaste}`
          : `Complement ${suggestion.primaryTaste} with ${suggestion.suggestedTaste}`,
        ingredientSuggestions: findSuggestedIngredients(
          suggestion.suggestedTaste,
          suggestion.targetScore,
          ingredientProfiles,
          selectedIngredients,
          flavorMap
        ),
        reason: suggestion.reason,
        score: suggestion.currentScore
      };
    }
  });

  return (
    <div className="mt-6 space-y-4">
  {/* Suggestions */}
      {suggestions.map((suggestion, index) => (
        <div 
          key={index}
          className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-2">
            {suggestion.type === 'balance' ? (
              <Scale className="h-5 w-5 text-gray-500" />
            ) : suggestion.type === 'category' ? (
              <Plus className="h-5 w-5 text-gray-500" /> // New icon for category
            ) : (
              <TrendingUp className="h-5 w-5 text-gray-500" />
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