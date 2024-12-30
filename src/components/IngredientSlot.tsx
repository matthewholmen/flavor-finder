import React, { useState, useMemo, useEffect } from 'react';
import { Lock, LockOpen, X, GitCompare, SendToBack, TriangleAlert } from 'lucide-react';
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
  onSubstitute: () => void;
  onExitSubstitute?: () => void;  
  isInSubstitutionMode?: boolean;
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
  onSubstitute,
  onExitSubstitute,
  profile,
  index,
  flavorMap,
  selectedIngredients,
  isInSubstitutionMode
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
    
    const sortedTastes = Object.entries(profile.flavorProfile)
      .filter(([_, value]) => value > 0)
      .sort(([_t1, a], [_t2, b]) => b - a)
      .map(([taste, value], index) => ({
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
              ${isInSubstitutionMode ? 'ring-4 ring-gray-200 ring-offset-8' : ''}
              cursor-pointer
              hover:scale-[1.02] hover:shadow-lg
              ${isPartiallyMatched ? '[border-style:dashed]' : ''}
            `}
            style={{ borderColor }}
            onClick={() => setIsModalOpen(true)}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 absolute left-6">
                
              <button 
                  className={`p-1 transition-all rounded-full ${
                    isLocked 
                      ? 'text-gray-800 scale-110' 
                      : 'text-gray-400 hover:scale-110 hover:text-gray-600'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onLockToggle();
                  }}
                  title={isLocked ? "Unlock Ingredient" : "Lock Ingredient"}
                >
                  {isLocked ? (
                    <Lock size={16} strokeWidth={2.5} />
                  ) : (
                    <LockOpen size={16} strokeWidth={2} />
                  )}
                </button>

                <button
  className={`p-1 transition-colors ${isInSubstitutionMode ? 'text-gray-800 scale-110' : 'text-gray-400 hover:text-gray-600 hover:scale-110'}`}
  onClick={(e) => {
    e.stopPropagation();
    if (isInSubstitutionMode && onExitSubstitute) {
      onExitSubstitute();
    } else {
      onSubstitute();
    }
  }}
  title={isInSubstitutionMode ? "Exit Substitute Mode" : "Substitute Ingredient"}
>
  <SendToBack size={16} strokeWidth={isInSubstitutionMode ? 2.5 : 2} />
</button>
                
              </div>
              <div className="flex-1 text-center">
                <div className="font-medium text-lg">{ingredient}</div>
                {profile && (
                  <div className="text-sm text-gray-600">
                    {profile.category} › {profile.subcategory}
                  </div>
                )}
              </div>
              <div className="absolute right-8">
                <button
                  className="p-1 text-gray-400 hover:text-gray-600 hover:scale-110 transition-colors"
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
                className="bg-white border-2 border-gray-800 rounded-3xl p-8 w-3/4 mx-4" 
                onClick={e => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">{ingredient}</h3>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-2 color-gray-100 hover:scale-110 hover:color-gray-800"
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
                  <div className="h-px bg-gray-200 mb-4" />
                    <h4 className="text-sm font-semibold mb-1">Taste Profile</h4>
                    <div className="flex items-center justify-between">
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
                      <div className="flex-1 flex items-center">
                        {renderTasteLegend()}
                      </div>
                    </div>
                  </div>

                  {/* Pairing Status */}
                  {isPartiallyMatched && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-800 flex items-center gap-3 pl-2">
                      <TriangleAlert size={24} strokeWidth={2} /> 
                      We don't have this ingredient as a perfect match with all other selected ingredients — but that doesn't mean it can't be delicious.
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