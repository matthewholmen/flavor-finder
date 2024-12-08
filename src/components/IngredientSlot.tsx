// components/IngredientSlot.tsx
import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { IngredientProfile } from '../types';
import { TASTE_COLORS } from '../utils/colors.ts';

const getIngredientColor = (profile?: IngredientProfile) => {
  if (!profile) return undefined;
  
  let dominantTaste = 'sweet';
  let maxValue = -1;
  
  Object.entries(profile.flavorProfile).forEach(([taste, value]) => {
    if (value > maxValue) {
      maxValue = value;
      dominantTaste = taste;
    }
  });
  
  return TASTE_COLORS[dominantTaste as keyof typeof TASTE_COLORS];
};

interface IngredientSlotProps {
  ingredient?: string;
  isLocked: boolean;
  onLockToggle: () => void;
  onRemove: () => void;
  profile?: IngredientProfile;
  index: number;
}

const IngredientSlot: React.FC<IngredientSlotProps> = ({
  ingredient,
  isLocked,
  onLockToggle,
  onRemove,
  profile,
  index
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const borderColor = ingredient ? getIngredientColor(profile) : undefined;

  return (
    <div 
      className="relative h-full flex flex-col items-center justify-center
        bg-[linear-gradient(to_right,rgb(243_244_246)_1px,transparent_1px),linear-gradient(to_bottom,rgb(243_244_246)_1px,transparent_1px)]
        bg-[size:20px_20px]"
    >
      {ingredient ? (
        <>
          <div 
            className={`
              relative rounded-full py-6 px-6 bg-white
              border-[3px] transition-all duration-200 mx-4 w-full max-w-xl
              shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]
              cursor-pointer
              hover:scale-[1.02] hover:shadow-lg
            `}
            style={{ borderColor }}
            onClick={() => setIsModalOpen(true)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 text-center">
                <div className="font-medium text-lg">{ingredient}</div>
                {profile && (
                  <div className="text-sm text-gray-600">
                    {profile.category} › {profile.subcategory}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 absolute right-4">
                <button 
                  className={`p-1 transition-colors ${isLocked ? 'text-blue-500' : 'text-gray-300'}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLockToggle();
                  }}
                >
                  <Lock size={16} />
                </button>
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Modal */}
          {isModalOpen && profile && (
            <div 
              className="fixed right-0 w-1/2 inset-y-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
              onClick={() => setIsModalOpen(false)}
            >
              <div 
                className="bg-white rounded-lg p-6 w-full mx-4" 
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">{ingredient}</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    {profile.category} › {profile.subcategory}
                  </p>
                  
                  <p className="text-sm">{profile.description}</p>
                  
                  {/* Taste Profile */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Taste Profile</h4>
                    <div className="space-y-1">
                      {Object.entries(profile.flavorProfile).map(([taste, value]) => (
                        <div key={taste} className="flex items-center gap-2 text-sm">
                          <span className="w-20 capitalize" style={{ color: TASTE_COLORS[taste as keyof typeof TASTE_COLORS] }}>
                            {taste}
                          </span>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className="rounded-full h-2 transition-all duration-500"
                              style={{ 
                                width: `${value * 10}%`,
                                backgroundColor: TASTE_COLORS[taste as keyof typeof TASTE_COLORS],
                                opacity: 0.85
                              }}
                            />
                          </div>
                          <span className="w-8 text-right" style={{ color: TASTE_COLORS[taste as keyof typeof TASTE_COLORS] }}>
                            {value}
                          </span>
                        </div>
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
            </div>
          )}
        </>
      ) : (
        <div 
          className="
            relative rounded-full py-6 px-6
            border-[3px] border-gray-200 bg-white mx-4
            w-full max-w-xl
          "
        >
          <div className="h-[42px]"></div>
        </div>
      )}
    </div>
  );
};

export default IngredientSlot;