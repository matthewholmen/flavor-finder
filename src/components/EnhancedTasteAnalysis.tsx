import React from 'react';
import { Scale, TrendingUp, Tags } from 'lucide-react';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors.ts';
import { analyzeTasteBalance } from '../utils/tasteAnalysis.ts';

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

const EnhancedTasteAnalysis: React.FC<EnhancedTasteAnalysisProps> = ({
  averageScores,
  ingredientProfiles,
  selectedIngredients,
  flavorMap,
  handleIngredientSelect
}) => {
  if (!selectedIngredients || !ingredientProfiles || !flavorMap) {
    return null;
  }

  // Get the profiles of currently selected ingredients with proper type safety
  const selectedProfiles = selectedIngredients
    .map(name => ingredientProfiles.find(p => p.name.toLowerCase() === name.toLowerCase()))
    .filter((profile): profile is IngredientProfile => profile !== undefined);

  // Get enhanced analysis using the original logic
  const analysis = analyzeTasteBalance(selectedProfiles, ingredientProfiles, flavorMap);

  if (!analysis || !analysis.suggestions) {
    return null;
  }

  return (
    <div className="space-y-6">
      {analysis.suggestions.map((suggestion, index) => {
        if (suggestion.type === 'category') {
          // Render category-based suggestion
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2">
                <Tags size={16} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  {suggestion.reason}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {suggestion.ingredientSuggestions.map((ingredientName, idx) => {
                  const ingredient = ingredientProfiles.find(p => p.name === ingredientName);
                  if (!ingredient) return null;

                  return (
                    <button
                      key={idx}
                      onClick={() => handleIngredientSelect(ingredientName)}
                      disabled={selectedIngredients.length >= 5}
                      className={`
                        text-left p-4 rounded-lg border border-gray-200 
                        transition-all duration-200 
                        ${selectedIngredients.length >= 5 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:border-gray-300 hover:shadow-sm'
                        }
                      `}
                    >
                      <div className="font-medium">{ingredientName}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {ingredient.category} › {ingredient.subcategory}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        } else {
          // Render taste-based suggestion
          const icon = suggestion.type === 'balance' 
            ? <Scale size={16} className="text-gray-400" />
            : <TrendingUp size={16} className="text-gray-400" />;

          // Handle taste properties safely
          const primaryTaste = 'primaryTaste' in suggestion ? suggestion.primaryTaste : '';
          const suggestedTaste = 'suggestedTaste' in suggestion ? suggestion.suggestedTaste : '';
          const dominantTaste = suggestion.type === 'balance' ? primaryTaste : suggestedTaste;

          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm text-gray-600">
                  {suggestion.reason}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {suggestion.ingredientSuggestions.map((ingredientName, idx) => {
                  const ingredient = ingredientProfiles.find(p => p.name === ingredientName);
                  if (!ingredient || !dominantTaste) return null;

                  const tasteValue = ingredient.flavorProfile[dominantTaste as keyof TasteProfile] || 0;
                  const tasteColor = TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS];

                  return (
                    <button
                      key={idx}
                      onClick={() => handleIngredientSelect(ingredientName)}
                      disabled={selectedIngredients.length >= 5}
                      className={`
                        text-left p-4 rounded-lg border border-gray-200 
                        transition-all duration-200 
                        ${selectedIngredients.length >= 5 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:border-gray-300 hover:shadow-sm'
                        }
                      `}
                    >
                      <div className="font-medium">{ingredientName}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {ingredient.category} › {ingredient.subcategory}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tasteColor }}
                        />
                        <span className="text-xs text-gray-600">
                          {tasteValue.toFixed(1)} {dominantTaste}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default EnhancedTasteAnalysis;