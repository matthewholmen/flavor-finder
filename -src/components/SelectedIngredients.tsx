// components/SelectedIngredients.tsx
import React from 'react';
import { X, Lock } from 'lucide-react';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors';

interface SelectedIngredientsProps {
  ingredients: string[];
  onRemove: (ingredient: string) => void;
  flavorMap: Map<string, Set<string>>;
  ingredientProfiles: IngredientProfile[];
}

interface IngredientPillProps {
  ingredient: string;
  profile: IngredientProfile | undefined;
  locked?: boolean;
  onRemove: (ingredient: string) => void;
  isSelected?: boolean;
}

const IngredientPill: React.FC<IngredientPillProps> = ({ 
  ingredient, 
  profile,
  locked = false,
  onRemove,
  isSelected = false
}) => {
  // Get the primary taste (highest value in flavor profile)
  const getPrimaryTaste = (profile: IngredientProfile) => {
    return Object.entries(profile.flavorProfile).reduce((a, b) => 
      (b[1] > a[1] ? b : a)
    )[0].toLowerCase() as keyof typeof TASTE_COLORS;
  };

  const borderColor = profile ? TASTE_COLORS[getPrimaryTaste(profile)] : 'rgb(209 213 219)';

  return (
    <div 
      className={`
        relative rounded-full py-3 px-6 bg-white
        border-2 transition-all duration-200
        ${isSelected ? 'shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]' : ''}
      `}
      style={{ borderColor }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="font-medium">{ingredient}</div>
          {profile && (
            <div className="text-sm text-gray-600">
              {profile.category} › {profile.subcategory}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            className={`p-1 transition-colors ${locked ? 'text-blue-500' : 'text-gray-300'}`}
            onClick={(e) => {
              e.stopPropagation();
              // Add lock toggle handler here
            }}
          >
            <Lock size={16} />
          </button>
          <button
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(ingredient);
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

const EmptySlot: React.FC = () => (
  <div 
    className="
      relative rounded-full py-3 px-6
      border-2 border-gray-200 bg-white
      flex items-center justify-between
    "
  >
    <div className="h-[42px]"></div>
  </div>
);

export const SelectedIngredients: React.FC<SelectedIngredientsProps> = ({
  ingredients,
  onRemove,
  ingredientProfiles
}) => {
  return (
    <div 
      className="
        grid gap-3 p-4
        bg-[linear-gradient(to_right,rgb(243_244_246)_1px,transparent_1px),linear-gradient(to_bottom,rgb(243_244_246)_1px,transparent_1px)]
        bg-[size:20px_20px]
      "
    >
      {[...Array(4)].map((_, index) => {
        const ingredient = ingredients[index];
        
        if (ingredient) {
          const profile = ingredientProfiles.find(p => 
            p.name.toLowerCase() === ingredient.toLowerCase()
          );
          
          return (
            <IngredientPill
              key={ingredient}
              ingredient={ingredient}
              profile={profile}
              onRemove={onRemove}
              isSelected={true} // You might want to make this dynamic based on your selection state
            />
          );
        }
        
        return <EmptySlot key={`empty-${index}`} />;
      })}
    </div>
  );
};

export default SelectedIngredients;