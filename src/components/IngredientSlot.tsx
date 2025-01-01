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
    <div className="relative h-full flex flex-col items-center justify-center py-4">
  {ingredient ? (
    <>
<div 
  className={`
    relative py-4 md:py-6 pl-2 pr-12 bg-white w-full
    flex items-center
    ${index > 0 ? 'border-t border-gray-200' : ''}
  `}
  onClick={() => setIsModalOpen(true)}
>
  
  <div className="flex items-center gap-4"> 
       {/* Left side UI controls */}
       <div className="flex flex-col gap-2 pr-4">
  {/* Lock button */}
  <button 
    className={`
      p-2.5 transition-colors rounded-full border-2
      ${isLocked 
        ? 'text-gray-800 border-gray-800' 
        : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600'
      }
    `}
    onClick={(e) => {
      e.stopPropagation();
      onLockToggle();
    }}
    title={isLocked ? "Unlock Ingredient" : "Lock Ingredient"}
  >
    {isLocked ? (
      <Lock size={18} strokeWidth={2.5} />
    ) : (
      <LockOpen size={18} strokeWidth={2} />
    )}
  </button>

  {/* Substitute button */}
  <button
    className={`
      p-2.5 transition-colors rounded-full border-2
      ${isInSubstitutionMode 
        ? 'text-gray-800 border-gray-800' 
        : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600'
      }
    `}
    onClick={(e) => {
      e.stopPropagation();
      if (isInSubstitutionMode && onExitSubstitute) {
        onExitSubstitute();
      } else {
        onSubstitute();
      }
    }}
  >
    <SendToBack size={18} strokeWidth={isInSubstitutionMode ? 2.5 : 2} />
  </button>
</div>



        {/* Ingredient name and category */}
        <div className="flex-1">
        <div 
  className={`
    text-7xl font-bold leading-[0.85] transition-opacity hover:opacity-40
    ${isPartiallyMatched ? 'tracking-normal' : 'tracking-tight'}
  `}
  style={{ 
    color: isPartiallyMatched ? 'white' : getIngredientColor(profile),
    textShadow: isPartiallyMatched ? `
      -1.5px -1.5px 0 ${getIngredientColor(profile)},
      1.5px -1.5px 0 ${getIngredientColor(profile)},
      -1.5px 1.5px 0 ${getIngredientColor(profile)},
      1.5px 1.5px 0 ${getIngredientColor(profile)},
      -2px 0 0 ${getIngredientColor(profile)},
      2px 0 0 ${getIngredientColor(profile)},
      0 -2px 0 ${getIngredientColor(profile)},
      0 2px 0 ${getIngredientColor(profile)}
    ` : 'none'
  }}
>
  {ingredient}
</div>
  {profile && (
    <div className="text-xs tracking-[0.2em] text-gray-500 uppercase mt-4 pl-0.5">
      {profile.category} › {profile.subcategory}
    </div>
  )}
</div>



      </div>
      
      <button
    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 md:p-2.5 transition-colors rounded-full border-2 text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600"
    onClick={(e) => {
      e.stopPropagation();
      onRemove();
    }}
  >
    <X size={16} className="md:w-[18px] md:h-[18px]" />
  </button>
</div>


{/* Modal */}
{isModalOpen && profile && (
  <div 
  className="fixed inset-y-0 right-0 bg-black bg-opacity-0 flex items-stretch z-50 w-full md:w-1/2"
  onClick={() => setIsModalOpen(false)}
>
<div 
  className="bg-white border-l border-gray-200 w-full"
  onClick={e => e.stopPropagation()}
>
      {/* Header */}
      <div className="p-12">
        <div className="flex justify-between items-start">
          {/* Close button */}
          <button 
            onClick={() => setIsModalOpen(false)} 
            className="p-3 -ml-2 transition-colors rounded-full border-2 text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* Title and Category */}
        <div className="mt-8">
          <div className="leading-[0.9] mb-2">
            <div 
              className="text-7xl font-bold tracking-tight"
              style={{ color: getIngredientColor(profile) }}
            >
              {ingredient}
            </div>
          </div>
          <div className="text-xs tracking-[0.3em] text-gray-500 uppercase">
            {profile.category} › {profile.subcategory}
          </div>
        </div>

        {/* Description */}
        <div className="mt-12 text-xl leading-relaxed text-gray-600">
          {profile.description}
        </div>

        {/* Taste Profile Section */}
        <div className="mt-12">
          <h4 className="text-lg font-medium mb-8">Taste Profile</h4>
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
                      fill={TASTE_COLORS[entry.name as keyof typeof TASTE_COLORS]}
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

        {/* Pairing Status */}
        {isPartiallyMatched && (
          <div className="mt-12 p-6 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-base text-yellow-800 flex items-center gap-3">
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
        <div className={`
          relative py-6 pl-2 pr-8 bg-white w-full
          ${index > 0 ? 'border-t border-gray-200' : ''}
        `}>
  <div className="flex items-center gap-4">
    {/* Left side controls placeholder to maintain spacing */}
    <div className="flex items-center gap-2 w-30">
      <div className="p-3"></div>
      <div className="p-3"></div>
    </div>
    
    {/* Main content area placeholder */}
    <div className="flex-1">
      <div className="text-7xl font-bold tracking-tight leading-[0.85] text-transparent">
        {/* Empty space to maintain height */}
        &nbsp;
      </div>
      <div className="text-xs tracking-[0.3em] text-transparent uppercase mt-4 pl-0.5">
        &nbsp;
      </div>
    </div>
  </div>
</div>


      )}
    </div>
  );
};

export default IngredientSlot;