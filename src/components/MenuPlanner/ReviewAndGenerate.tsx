import React from 'react';
import { DishType, DietaryRestriction } from '../../utils/menuPlanner';
import { IngredientProfile } from '../../types';

interface ReviewAndGenerateProps {
  state: {
    keyIngredient: string;
    dishTypes: DishType[];
    restrictions: DietaryRestriction[];
  };
  onGenerate: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

const ReviewAndGenerate: React.FC<ReviewAndGenerateProps> = ({
  state,
  onGenerate,
  onBack,
  isGenerating
}) => {
  const { keyIngredient, dishTypes, restrictions } = state;
  
  return (
    <div>
      <h2 className="text-xl font-medium mb-3">Review Your Menu Settings</h2>
      <p className="text-sm text-gray-600 mb-4">
        Review your selections before creating your menu
      </p>
      
      {/* Key Ingredient */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-1">Key Ingredient</h3>
        <div className="p-3 bg-blue-50 rounded-lg flex items-center">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium mr-2">
            Key
          </span>
          <span className="font-medium capitalize">{keyIngredient}</span>
        </div>
      </div>
      
      {/* Dish Types */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-1">Included Dishes</h3>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex flex-wrap gap-1">
            {dishTypes.map(type => (
              <span 
                key={type}
                className="px-2 py-1 bg-gray-200 rounded-md text-xs capitalize"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      </div>
      
      {/* Dietary Restrictions */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-1">Dietary Restrictions</h3>
        <div className="p-3 bg-gray-50 rounded-lg">
          {restrictions.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {restrictions.map(restriction => (
                <span 
                  key={restriction}
                  className="px-2 py-1 bg-gray-200 rounded-md text-xs capitalize"
                >
                  {restriction}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-gray-500">No restrictions selected</span>
          )}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          className="px-4 py-2 border rounded-md"
          onClick={onBack}
          disabled={isGenerating}
        >
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
          Back
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300 flex items-center"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <>
              <span className="inline-block mr-2 animate-spin">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v3" />
                  <path d="M12 21v-3" />
                  <path d="M3 12h3" />
                  <path d="M21 12h-3" />
                  <path d="M4.93 19.07 7.05 17" />
                  <path d="M16.95 7.05l2.12-2.12" />
                  <path d="M4.93 4.93 7.05 7.05" />
                  <path d="M16.95 16.95l2.12 2.12" />
                </svg>
              </span>
              Generating...
            </>
          ) : (
            <>
              Generate Menu
              <span className="inline-block ml-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v3" />
                  <path d="m19 7-3-3" />
                  <path d="M8 16H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4" />
                  <path d="M12 19v3" />
                  <path d="m5 19 3-3" />
                  <path d="M16 16h4a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-4" />
                  <path d="M12 7v5" />
                  <path d="m15 9-3 3-3-3" />
                </svg>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReviewAndGenerate;
