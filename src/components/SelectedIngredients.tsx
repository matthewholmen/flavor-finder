// components/SelectedIngredients.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, XCircle } from 'lucide-react';
import { IngredientProfile } from '../types';

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
    // Change the card layout to:
<div className={`w-full rounded-lg border p-4 ${colorClass} transition-all`}>
  <div className="flex items-center justify-between">
    <div className="flex-1">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">{ingredient}</h3>
        <span className="text-sm bg-white bg-opacity-50 px-2 py-1 rounded-full">
          {compatibilityScore.toFixed(0)}% compatible
        </span>
        {profile && (
          <span className="text-sm text-gray-600">
            {profile.category} › {profile.subcategory}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
      >
        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <button
        onClick={() => onRemove(ingredient)}
        className="p-1 hover:bg-black hover:bg-opacity-10 rounded text-red-600"
      >
        <XCircle size={18} />
      </button>
    </div>
  </div>

  {isExpanded && profile && (
    <div className="mt-4 space-y-3">
      <p className="text-sm">{profile.description}</p>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Taste Profile */}
        <div>
          <div className="text-sm font-semibold mb-2">Taste Profile</div>
          <div className="space-y-1">
            {Object.entries(profile.flavorProfile).map(([taste, value]) => (
              renderTasteBar(taste, value)
            ))}
          </div>
        </div>
        
        {/* Aroma Profile */}
        <div>
          <div className="text-sm font-semibold mb-2">Aroma Profile</div>
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
    <div className="space-y-4">
      {ingredients.map(ingredient => {
        const otherIngredients = ingredients.filter(i => i !== ingredient);
        const compatibilityScore = getCompatibilityScore(ingredient, otherIngredients);
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
      })}
    </div>
  );
};