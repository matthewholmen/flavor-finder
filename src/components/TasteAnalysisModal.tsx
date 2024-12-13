import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { TASTE_COLORS } from '../utils/colors.ts';
import EnhancedTasteAnalysis from './EnhancedTasteAnalysis.tsx';
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

  const totalTasteValue = Object.values(averageScores).reduce((sum, value) => sum + value, 0);

  const pieData = Object.entries(averageScores)
    .map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: value,
      color: TASTE_COLORS[name.toLowerCase() as keyof typeof TASTE_COLORS],
      percentage: ((value / totalTasteValue) * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);

    const CustomizedLegend = () => (
      <div className="flex flex-col gap-1.5 w-full max-w-sm">
        {pieData.map((entry, index) => (
          <div key={index} className="flex items-center gap-3 px-2 w-full">
            <span className="text-sm text-gray-400 w-4 shrink-0">
              {index + 1}.
            </span>
            <div 
              className="w-3 h-3 rounded-full shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium shrink-0">
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
    

// Convert flavorMap to Record format
const flavorPairingsRecord: Record<string, string[]> = {};
flavorMap.forEach((value, key) => {
  flavorPairingsRecord[key] = Array.from(value);
});

// Get suggestions using our new algorithm
const tasteSuggestions = generateTasteSuggestions(
  profiles,
  ingredientProfiles,
  flavorPairingsRecord
);

  return (
    <div 
      className="fixed right-0 w-1/2 inset-y-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-11/12 mx-4 h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header Section */}
        <div className="px-6 pt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Taste Profile Analysis</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
          
          {/* Selected Ingredients */}
          <div className="mt-4 min-h-[60px] max-h-[80px] overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              {selectedIngredients.map((ingredient: string) => {
                const profile = ingredientProfiles.find((p) => 
                  p.name.toLowerCase() === ingredient.toLowerCase()
                );
                const dominantTaste = Object.entries(profile?.flavorProfile ?? {})
                  .reduce((a, b) => a[1] > b[1] ? a : b, ['', 0])[0];
                const color = TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS];
                
                const compatibilityScore = getCompatibilityScore(
                  ingredient,
                  selectedIngredients.filter((i) => i !== ingredient),
                  flavorMap,
                  true
                );
                const isPartialMatch = compatibilityScore.score < 100;
  
                return (
                  <div
                    key={ingredient}
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
                      border-2 transition-colors cursor-pointer
                      ${isPartialMatch ? 'border-dashed' : 'border-solid'}
                      ${selectedIngredients.length > 5 ? 'border-red-500' : ''}
                    `}
                    style={{ 
                      borderColor: color,
                      backgroundColor: 'white',
                      color: 'black',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = color;
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = 'black';
                    }}
                  >
                    {ingredient}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newIngredients = selectedIngredients.filter((i) => i !== ingredient);
                        onIngredientsChange(newIngredients);
                      }}
                      className="ml-2 rounded-full p-1 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
              {selectedIngredients.length > 5 && (
                <div className="text-sm text-red-500 ml-2 flex items-center">
                  Max 5 ingredients for suggestions
                </div>
              )}
            </div>
          </div>
        </div>
  
        {/* Border Line */}
        <div className="h-px bg-gray-200 mx-6 mt-4" />
  
        {/* Main Content Area */}
        <div className="flex-1 flex min-h-0 p-6 pt-4">
          {/* Left column: Pie chart */}
          <div className="w-1/2 pr-3 flex flex-col">
            <div className="space-y-4">
              <div className="h-[35vh]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      dataKey="value"
                      startAngle={90}
                      endAngle={450}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        `${value.toFixed(1)} (${pieData.find(item => item.name === name)?.percentage}%)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Compact Legend */}
              <div className="mt-0">
                <CustomizedLegend />
              </div>
            </div>
          </div>
  
          {/* Right column: Scrollable Enhanced analysis */}
          <div className="w-1/2 pl-3 flex flex-col h-full">
            <h3 className="text-l font-sans sticky top-0 bg-white pb-3 z-10 border-b">
              Enhanced Taste Analysis
            </h3>
            <div className="overflow-y-auto flex-1">
              <EnhancedTasteAnalysis 
                averageScores={averageScores}
                ingredientProfiles={ingredientProfiles}
                selectedIngredients={selectedIngredients}
                flavorMap={flavorMap}
                handleIngredientSelect={(ingredient: string) => { 
                  const newIngredients = [...selectedIngredients, ingredient];
                  onIngredientsChange(newIngredients);
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TasteAnalysisModal;