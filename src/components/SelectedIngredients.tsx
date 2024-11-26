// components/SelectedIngredients.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { IngredientProfile } from '../types';
import { getCompatibilityScore, getCompatibilityColor } from '../utils/compatibility.ts'



const TASTE_COLORS = {
  sweet: '#f97316',  // orange
  salty: '#3b82f6',  // blue
  sour: '#22c55e',   // green
  bitter: '#a855f7',  // purple
  umami: '#ef4444',  // red
  fat: '#facc15',    // yellow
  spicy: '#ec4899'   // pink
};


interface SelectedIngredientsProps {
  ingredients: string[];
  onRemove: (ingredient: string) => void;
  flavorMap: Map<string, Set<string>>;
  activeCategories: string[];
  ingredientProfiles: IngredientProfile[];
}

interface IngredientCardProps {
  ingredient: string;
  profile: IngredientProfile | undefined;
  compatibilityScore: number;
  colorClass: string;
  onRemove: (ingredient: string) => void;
}
const IngredientCard: React.FC<IngredientCardProps> = ({ 
  ingredient, 
  profile, 
  compatibilityScore, 
  colorClass, 
  onRemove 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const renderTasteBar = (taste: string, value: number) => {
    const tasteKey = taste.toLowerCase() as keyof typeof TASTE_COLORS;
    const color = TASTE_COLORS[tasteKey];
    
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-20" style={{ color }}>
          {taste}
        </span>
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div 
            className="rounded-full h-2 transition-all duration-500"
            style={{ 
              width: `${value * 10}%`,
              backgroundColor: color,
              opacity: 0.85
            }}
          />
        </div>
        <span className="w-8 text-right" style={{ color }}>
          {value}
        </span>
      </div>
    );
  };
  

return (
  <div className={`w-full rounded-lg border p-4 ${colorClass} relative overflow-hidden`}>
    <div className="relative h-full flex flex-col">
      {/* X button in upper right */}
      <button
        onClick={() => onRemove(ingredient)}
        className="absolute top-0 right-0 p-2 hover:bg-black hover:bg-opacity-5 rounded-bl transition-colors text-red-600"
      >
        <XCircle size={18} />
      </button>

      {/* Main content */}
      <div className="pt-2">
        <h3 className="text-lg font-semibold">{ingredient}</h3>
        {profile && (
          <span className="text-sm text-gray-600">
            {profile.category} › {profile.subcategory}
          </span>
        )}
      </div>

      {/* Chevron button in lower right */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute bottom-0 right-0 p-2 hover:bg-black hover:bg-opacity-5 rounded-tl transition-colors"
      >
        <ChevronDown size={18} />
      </button>

      {/* Modal */}
      {isExpanded && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIsExpanded(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full m-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">{ingredient}</h3>
              <button onClick={() => setIsExpanded(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <XCircle size={18} />
              </button>
            </div>
            
            {profile && (
              <div className="space-y-4">
                <p className="text-sm">{profile.description}</p>
                
                <div className="space-y-4">
                  {/* Taste Profile */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Taste Profile</h4>
                    <div className="space-y-1">
                      {Object.entries(profile.flavorProfile).map(([taste, value]) => (
                        renderTasteBar(taste, value)
                      ))}
                    </div>
                  </div>
                  
                  {/* Aroma Profile */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Aroma Profile</h4>
                    <div className="text-sm">
                      Primary: {profile.aromas.primary}
                      {profile.aromas.secondary && (
                        <><br />Secondary: {profile.aromas.secondary}</>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
);
};



export const SelectedIngredients: React.FC<SelectedIngredientsProps> = ({
  ingredients,
  onRemove,
  flavorMap,
  ingredientProfiles
}) => {

  const getCompatibilityScore = (ingredient: string, otherIngredients: string[]): number => {
    if (otherIngredients.length === 0) return 100;
    const pairings = flavorMap.get(ingredient);
    if (!pairings) return 0;
    const compatibleCount = otherIngredients.filter(other => 
      pairings.has(other)
    ).length;
    return (compatibleCount / otherIngredients.length) * 100;
  };

  
  const getCompatibilityColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-green-50 border-green-200';
    if (percentage >= 50) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {/* Empty grid slots */}
      {[...Array(10)].map((_, index) => {
        const ingredient = ingredients[index];
        
        if (ingredient) {
          // Existing ingredient card
          const compatibilityScore = getCompatibilityScore(ingredient, ingredients.filter(i => i !== ingredient));
          const colorClass = getCompatibilityColor(compatibilityScore);
          const profile = ingredientProfiles.find(p => 
            p.name.toLowerCase() === ingredient.toLowerCase()
          );
          
          return (
            <IngredientCard
              key={ingredient}
              ingredient={ingredient}
              profile={profile}
              compatibilityScore={compatibilityScore}
              colorClass={colorClass}
              onRemove={onRemove}
            />
          );
        }
        
        // Empty slot placeholder
        return (
          <div 
            key={`empty-${index}`}
            className="border-2 border-dashed border-gray-200 rounded-lg h-24 flex items-center justify-center"
          >
            <span className="text-gray-300 text-sm">{index + 1}</span>
          </div>
        );
      })}
    </div>
  );
};
export default SelectedIngredients;