import React, { useEffect } from 'react';
import { X, TriangleAlert } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell,
} from 'recharts';
import { TASTE_COLORS } from '../utils/colors.ts';
import { IngredientProfile } from '../types';
import { getCompatibilityScore } from '../utils/compatibility.ts';
import { generateTasteSuggestions } from '../utils/tasteSuggestions.ts';

interface TasteAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIngredients: string[];
  ingredientProfiles: IngredientProfile[];
  onIngredientsChange: (ingredients: string[]) => void;
  flavorMap: Map<string, Set<string>>;
}

const TasteAnalysisModal: React.FC<TasteAnalysisModalProps> = ({
  isOpen,
  onClose,
  selectedIngredients,
  ingredientProfiles,
  onIngredientsChange,
  flavorMap
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const profiles = selectedIngredients
    .map(ingredient => 
      ingredientProfiles.find(p => 
        p.name.toLowerCase() === ingredient.toLowerCase()
      )
    )
    .filter(Boolean);

  const emptyScores = {
    sweet: 0,
    salty: 0,
    sour: 0,
    bitter: 0,
    umami: 0,
    fat: 0,
    spicy: 0
  };

  const averageScores = profiles.length > 0 
    ? Object.keys(emptyScores).reduce((acc, taste) => {
        acc[taste] = profiles.reduce((sum, profile) => 
          sum + (profile?.flavorProfile?.[taste] || 0), 
          0
        ) / profiles.length;
        return acc;
      }, {...emptyScores})
    : emptyScores;

  const pieData = Object.entries(averageScores)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: TASTE_COLORS[name as keyof typeof TASTE_COLORS]
    }))
    .sort((a, b) => b.value - a.value);

  const renderTasteLegend = () => {
    const sortedTastes = Object.entries(averageScores)
      .filter(([_, value]) => value > 0)
      .sort(([_t1, a], [_t2, b]) => b - a)
      .map(([taste, value]) => ({
        name: taste,
        value: value,
        color: TASTE_COLORS[taste as keyof typeof TASTE_COLORS]
      }));
  
    return (
      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        {sortedTastes.map((entry, index) => (
          <div key={index} className="flex items-center gap-3 px-2 w-full">
            <span className="text-sm text-gray-400 w-4 shrink-0">
              {index + 1}.
            </span>
            <div 
              className="w-3 h-3 rounded-full shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium capitalize shrink-0">
              {entry.name}
            </span>
            <div className="flex-grow mx-2 border-b border-dotted border-gray-300" />
            <span className="text-sm text-gray-500 shrink-0">
              {entry.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // Convert flavorMap to Record format for taste suggestions
  const flavorPairingsRecord: Record<string, string[]> = {};
  flavorMap.forEach((value, key) => {
    flavorPairingsRecord[key] = Array.from(value);
  });

  // Get advanced taste suggestions
  const tasteSuggestions = generateTasteSuggestions(
    profiles,
    ingredientProfiles,
    flavorPairingsRecord
  );

  const getBalanceMessage = () => {
    if (selectedIngredients.length === 0) {
      return "Select ingredients to see their combined taste profile";
    }

    const highestTaste = Object.entries(averageScores)
      .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const lowestTaste = Object.entries(averageScores)
      .filter(([taste]) => ['sweet', 'salty', 'sour', 'umami'].includes(taste))
      .reduce((a, b) => a[1] < b[1] ? a : b)[0];

    

    const maxValue = Math.max(...Object.values(averageScores));
    const minValue = Math.min(...Object.values(averageScores));
    const isBalanced = maxValue - minValue < 2;

    return isBalanced 
      ? "This combination has well-balanced flavors!"
      : `Consider adding ${lowestTaste} flavors to balance the strong ${highestTaste} profile.`;
  };

  return (
    <div 
      className="fixed inset-y-0 right-0 bg-black bg-opacity-0 flex items-stretch z-50 w-full md:w-1/2"
      onClick={onClose}
    >
      <div 
        className="bg-white border-l border-gray-200 w-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-12">
          {/* Header */}
          <div className="flex justify-between items-start">
            <button 
              onClick={onClose}
              className="p-3 -ml-2 transition-colors rounded-full border-2 text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600"
            >
              <X size={20} />
            </button>
          </div>

          {/* Title */}
          <div className="mt-8">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Taste Analysis
            </h2>
            <div className="text-xs tracking-[0.3em] text-gray-500 uppercase">
              {selectedIngredients.length} Ingredients Selected
            </div>
          </div>

          {/* Selected Ingredients */}
          <div className="mt-8">
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ingredient) => {
                const profile = ingredientProfiles.find(p => 
                  p.name.toLowerCase() === ingredient.toLowerCase()
                );
                const dominantTaste = Object.entries(profile?.flavorProfile ?? {})
                  .reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0];
                const color = TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS];
                
                const compatibilityScore = getCompatibilityScore(
                  ingredient,
                  selectedIngredients.filter(i => i !== ingredient),
                  flavorMap,
                  true
                );
                const isPartialMatch = compatibilityScore.score < 100;

                return (
                  <div
                    key={ingredient}
                    className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border-2"
                    style={{ 
                      borderColor: color,
                      borderStyle: isPartialMatch ? 'dashed' : 'solid'
                    }}
                  >
                    {ingredient}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onIngredientsChange(selectedIngredients.filter(i => i !== ingredient));
                      }}
                      className="ml-2 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Taste Profile Section */}
          <div className="mt-12">
            <h4 className="text-lg font-medium mb-8">Combined Taste Profile</h4>
            <div className="flex items-start justify-between gap-12">
              <div className="w-[240px] h-[240px] shrink-0">
                <PieChart width={200} height={200}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </div>
              <div className="flex-1 min-w-0">
                {renderTasteLegend()}
              </div>
            </div>
          </div>

          {/* Advanced Taste Suggestions */}
          {tasteSuggestions.length > 0 && (
            <div className="mt-12">
              <h4 className="text-lg font-medium mb-4">Suggested Additions</h4>
              <div className="space-y-6">
                {tasteSuggestions.map((suggestion, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: TASTE_COLORS[suggestion.primaryTaste] }}
                      />
                      <span className="text-sm text-gray-600">
                        {suggestion.type === 'balance' 
                          ? `Balance ${suggestion.primaryTaste} with ${suggestion.complementaryTaste}`
                          : `Enhance ${suggestion.primaryTaste} profile`}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {suggestion.suggestions.map((ingredient, idx) => (
                        <button
                          key={idx}
                          onClick={() => onIngredientsChange([...selectedIngredients, ingredient.name])}
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
                          <div className="font-medium">{ingredient.name}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {ingredient.category} › {ingredient.subcategory}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: TASTE_COLORS[suggestion.complementaryTaste] }}
                            />
                            <span className="text-xs text-gray-600">
                              {ingredient.flavorProfile[suggestion.complementaryTaste].toFixed(1)} {suggestion.complementaryTaste}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Balance Message */}
          <div className="mt-12 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-base text-yellow-800 flex items-center gap-3">
              <TriangleAlert size={24} strokeWidth={2} />
              {getBalanceMessage()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasteAnalysisModal;
