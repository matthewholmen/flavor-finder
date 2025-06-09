import React from 'react';
import { Check } from 'lucide-react';
import { DietarySectionProps } from './types.ts';

// Common dietary restrictions for quick access
const QUICK_DIETARY_TOGGLES = [
  { key: 'Proteins:Plant Proteins', label: 'Vegetarian', description: 'Show only plant proteins' },
  { key: 'Proteins:Fish', label: 'Pescatarian', description: 'Exclude meat, allow fish' },
  { key: 'Grains:Bread', label: 'Gluten-free', description: 'Exclude gluten-containing grains' },
  { key: 'Dairy', label: 'Dairy-free', description: 'Exclude all dairy products' }
];

const DietarySection: React.FC<DietarySectionProps> = ({
  restrictions,
  onChange,
  quickToggles = QUICK_DIETARY_TOGGLES.map(t => t.key)
}) => {
  const handleQuickToggle = (restrictionKey: string) => {
    // Toggle the restriction - if it's currently enabled (true), disable it (false), and vice versa
    const newRestrictions = {
      ...restrictions,
      [restrictionKey]: !restrictions[restrictionKey]
    };
    onChange(newRestrictions);
  };

  const getToggleState = (restrictionKey: string) => {
    // For dietary restrictions, we show as "active" when the restriction is DISABLED (false)
    // because that means the category is excluded/restricted
    return restrictions[restrictionKey] === false;
  };

  const getToggleLabel = (restrictionKey: string) => {
    const toggle = QUICK_DIETARY_TOGGLES.find(t => t.key === restrictionKey);
    return toggle?.label || restrictionKey;
  };

  const getActiveRestrictionsCount = () => {
    return Object.values(restrictions).filter(enabled => enabled === false).length;
  };

  const handleClearAll = () => {
    // Reset all restrictions to enabled (true)
    const clearedRestrictions = Object.keys(restrictions).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    onChange(clearedRestrictions);
  };

  const activeCount = getActiveRestrictionsCount();

  return (
    <div className="space-y-2">
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        {activeCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Quick Dietary Toggles */}
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_DIETARY_TOGGLES.map((toggle) => {
          const isActive = getToggleState(toggle.key);
          return (
            <button
              key={toggle.key}
              onClick={() => handleQuickToggle(toggle.key)}
              className={`
                flex items-center gap-1.5 py-1.5 px-2.5 rounded-full border-2 transition-all duration-200
                text-left text-xs
                ${isActive
                  ? 'border-orange-500 bg-orange-50 text-orange-800'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-500 hover:bg-gray-50'
                }
              `}
              title={toggle.description}
            >
              <div className={`
                w-3 h-3 rounded border flex items-center justify-center flex-shrink-0
                ${isActive 
                  ? 'bg-orange-500 border-orange-500' 
                  : 'border-gray-300 bg-white'
                }
              `}>
                {isActive && <Check size={8} className="text-white" />}
              </div>
              <span className="font-medium truncate">{toggle.label}</span>
            </button>
          );
        })}
      </div>

      {/* Status Summary */}
      {activeCount > 0 && (
        <div className="text-xs text-gray-600 bg-orange-50 px-2.5 py-1.5 rounded-full border border-orange-200">
          <span className="font-medium">{activeCount}</span> dietary restriction{activeCount !== 1 ? 's' : ''} active
        </div>
      )}

      {/* Help Text */}
      {activeCount === 0 && (
        <p className="text-xs text-gray-500 italic">
          No dietary restrictions active
        </p>
      )}
    </div>
  );
};

export default DietarySection;