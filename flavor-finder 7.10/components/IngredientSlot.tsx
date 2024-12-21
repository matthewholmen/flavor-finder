import React, { useState, useMemo, useEffect } from 'react';
import { Lock, X } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
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
  flavorMap: Map<string, Set<string>>;
  selectedIngredients: string[];
}

const IngredientSlot: React.FC<IngredientSlotProps> = ({
  ingredient,
  isLocked,
  onLockToggle,
  onRemove,
  profile,
  index,
  flavorMap,
  selectedIngredients
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const borderColor = ingredient ? getIngredientColor(profile) : undefined;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isModalOpen) {
        setIsModalOpen(false);
      }
    };
  
    if (isModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
  
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const isPartiallyMatched = useMemo(() => {
    if (!ingredient || selectedIngredients.length <= 1) return false;
    const otherIngredients = selectedIngredients.filter((_, idx) => idx !== index);
    const currentPairings = flavorMap.get(ingredient);
    if (!currentPairings) return true;
    return !otherIngredients.every(other => currentPairings.has(other));
  }, [ingredient, selectedIngredients, index, flavorMap]);

  const pieData = useMemo(() => {
    if (!profile) return [];
    return Object.entries(profile.flavorProfile)
      .filter(([_, value]) => value > 0) // Only include non-zero values
      .map(([taste, value]) => ({
        name: taste,
        value: value
      }));
  }, [profile]);

  const renderTasteLegend = () => {
    if (!profile) return null;
    
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {Object.entries(profile.flavorProfile)
          .filter(([_, value]) => value > 0)
          .map(([taste, value]) => (
            <div key={taste} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: TASTE_COLORS[taste as keyof typeof TASTE_COLORS] }}
              />
              <span className="text-sm capitalize">
                {taste}: {value}
              </span>
            </div>
          ))}
      </div>
    );
  };

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
              ${isPartiallyMatched ? '[border-style:dashed]' : ''}
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
              <div className="flex items-center gap-2 absolute left-4">
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
                className="bg-white rounded-lg p-6 w-3/4 mx-4" 
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
                  
                  {/* Taste Profile with Pie Chart */}
                  <div>
                  <h4 className="text-sm font-semibold mb-2">Taste Profile</h4>
                    <div className="flex items-center justify-center gap-8">
                      <div className="w-48 h-48">
                        <PieChart width={192} height={192}>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            dataKey="value"
                            isAnimationActive={false}
                          >
                            {pieData.map((entry) => (
                              <Cell
                                key={entry.name}
                                fill={TASTE_COLORS[entry.name as keyof typeof TASTE_COLORS]}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                      {renderTasteLegend()}
                    </div>
                    </div>
                  </div>

                  {/* Pairing Status */}
                  {isPartiallyMatched && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm text-yellow-800">
                        This ingredient doesn't pair with all other selected ingredients. Consider replacing it for better flavor harmony.
                      </p>
                    </div>
                  )}
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