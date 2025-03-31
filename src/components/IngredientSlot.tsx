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
      <div className="flex flex-col gap-2 w-full">
        {sortedTastes.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 w-full">
            <div 
              className="w-3 h-3 rounded-full shrink-0" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium capitalize">
              {entry.name}
            </span>
            <div className="flex-grow mx-1 border-b border-dotted border-gray-200" />
            <span className="text-sm text-gray-500">
              {entry.value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <div className="relative w-full h-full min-h-0 flex items-center justify-center">
      <div 
        className="relative py-3 md:py-6 pl-4 pr-14 bg-white w-full h-full flex items-center justify-between overflow-hidden"
        onClick={() => ingredient && setIsModalOpen(true)}
      >
        <div className="flex items-center gap-4 h-full w-full"> 
          {/* Left side UI controls - Always visible */}
          <div className="flex flex-col gap-2 pr-4 py-1 h-full justify-center">
            {/* Lock button */}
            <button 
              className={`
                p-2 md:p-2.5 transition-colors rounded-full border-2
                ${isLocked 
                  ? 'text-gray-800 border-gray-800' 
                  : ingredient 
                    ? 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600'
                    : 'text-gray-300 border-transparent'
                }
              `}
              onClick={(e) => {
                e.stopPropagation();
                if (ingredient) onLockToggle();
              }}
              disabled={!ingredient}
              title={isLocked ? "Unlock Ingredient" : "Lock Ingredient"}
            >
              {isLocked ? (
                <Lock size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2.5} />
              ) : (
                <LockOpen size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={2} />
              )}
            </button>

            {/* Substitute button - hidden on very small screens */}
            <button
              className={`
                p-2 md:p-2.5 transition-colors rounded-full border-2
                hidden sm:block
                ${isInSubstitutionMode 
                  ? 'text-gray-800 border-gray-800' 
                  : ingredient
                    ? 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600'
                    : 'text-gray-200 border-transparent'
                }
                relative
              `}
              onClick={(e) => {
                e.stopPropagation();
                if (!ingredient) return;
                if (isInSubstitutionMode && onExitSubstitute) {
                  onExitSubstitute();
                } else {
                  onSubstitute();
                }
              }}
              disabled={!ingredient}
              aria-label={isInSubstitutionMode ? "Cancel Substitution" : "Find Substitutes"}
              title={isInSubstitutionMode ? "Cancel Substitution" : "Find Substitutes"}
            >
              <SendToBack size={16} className="md:w-[18px] md:h-[18px]" strokeWidth={isInSubstitutionMode ? 2.5 : 2} />
            </button>
          </div>

          {/* Ingredient name and category */}
          <div className="flex-1 pl-2 md:pl-4 pr-2 md:pr-4 text-clip overflow-visible flex flex-col justify-center">
            <div className="-ml-2 -mr-2">
              {ingredient ? (
                <>
                  <div 
                    className={`
                      text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight transition-opacity hover:opacity-40
                      ${isPartiallyMatched ? 'tracking-normal' : 'tracking-tight'}
                      whitespace-nowrap overflow-visible
                      pb-1 md:pb-2 max-w-full
                    `}
                    style={{ 
                      color: isPartiallyMatched ? 'white' : getIngredientColor(profile),
                      textShadow: isPartiallyMatched ? `
                        -2px -2px 0 ${getIngredientColor(profile)},
                        2px -2px 0 ${getIngredientColor(profile)},
                        -2px 2px 0 ${getIngredientColor(profile)},
                        2px 2px 0 ${getIngredientColor(profile)},
                        -2.5px 0 0 ${getIngredientColor(profile)},
                        2.5px 0 0 ${getIngredientColor(profile)},
                        0 -2.5px 0 ${getIngredientColor(profile)},
                        0 2.5px 0 ${getIngredientColor(profile)}
                      ` : 'none'
                    }}
                  >
                    {ingredient}
                  </div>
                  {profile && (
                    <div className="text-xs tracking-[0.15em] text-gray-500 uppercase mt-1 pl-0.5">
                      {profile.category} › {profile.subcategory}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Empty placeholders to maintain height */}
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-transparent">
                    &nbsp;
                  </div>
                  <div className="text-xs tracking-[0.15em] text-transparent uppercase mt-1 pl-0.5">
                    &nbsp;
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Remove button - Always visible */}
        <button
          className={`
            absolute right-3 md:right-4 top-1/2 -translate-y-1/2 p-1.5 md:p-2.5 transition-colors rounded-full border-2 
            ${ingredient 
              ? 'text-gray-600 border-gray-200 hover:text-gray-800 hover:border-gray-400' 
              : 'text-gray-300 border-gray-200'
            } bg-white z-10 flex items-center justify-center
          `}
          onClick={(e) => {
            e.stopPropagation();
            if (ingredient) onRemove();
          }}
          disabled={!ingredient}
        >
          <X size={16} className="md:w-[18px] md:h-[18px]" />
        </button>
        
        
      </div>

      {/* Modal */}
      {isModalOpen && ingredient && profile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[100]"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white border border-gray-200 w-full sm:max-w-md rounded-t-lg sm:rounded-lg overflow-auto max-h-[90vh] transition-transform duration-300 ease-out"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 pb-10">
              {/* Drag indicator for mobile */}
              <div className="sm:hidden flex justify-center mb-2">
                <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
              </div>
              <div className="flex justify-end items-center">
                {/* Close button */}
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 transition-colors rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title and Category */}
              <div className="mt-6">
                <div className="leading-[0.9] mb-2">
                  <div 
                    className="text-3xl sm:text-4xl font-bold tracking-tight overflow-hidden text-ellipsis leading-normal pb-1"
                    style={{ color: getIngredientColor(profile) }}
                  >
                    {ingredient}
                  </div>
                </div>
                <div className="text-xs tracking-[0.2em] text-gray-500 uppercase">
                  {profile.category} › {profile.subcategory}
                </div>
              </div>

              {/* Description */}
              <div className="mt-6 text-base leading-relaxed text-gray-600">
                {profile.description}
              </div>

              {/* Taste Profile Section */}
              <div className="mt-8">
                <h4 className="text-lg font-medium mb-4">Taste Profile</h4>
                <div className="flex flex-col items-center gap-6">
                  <div className="w-[180px] h-[180px]">
                    <PieChart width={180} height={180}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
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
                  <div className="w-full">
                    {renderTasteLegend()}
                  </div>
                </div>
              </div>

              {/* Pairing Status */}
              {isPartiallyMatched && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 flex items-start gap-2">
                    <TriangleAlert size={18} className="shrink-0 mt-0.5" strokeWidth={2} />
                    <span>We don't have this ingredient as a perfect match with all other selected ingredients — but that doesn't mean it can't be delicious.</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IngredientSlot;