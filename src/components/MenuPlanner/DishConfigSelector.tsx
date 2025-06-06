import React from 'react';
import { DEFAULT_DISH_CONFIGS, DISH_TYPES, DishType } from '../../utils/menuPlanner';

interface DishConfigSelectorProps {
  types: DishType[];
  count: number;
  onChange: (types: DishType[], count: number) => void;
  onNext: () => void;
  onBack: () => void;
}

const DishConfigSelector: React.FC<DishConfigSelectorProps> = ({
  types,
  count,
  onChange,
  onNext,
  onBack
}) => {
  // Toggle dish type selection
  const toggleDishType = (type: DishType) => {
    if (types.includes(type)) {
      // Remove type if already selected
      const newTypes = types.filter(t => t !== type);
      onChange(newTypes, count);
    } else {
      // Add type if not selected
      const newTypes = [...types, type];
      onChange(newTypes, count);
    }
  };
  
  // Handle preset selection
  const selectPreset = (presetTypes: DishType[]) => {
    onChange(presetTypes, presetTypes.length);
  };
  
  return (
    <div>
      <h2 className="text-xl font-medium mb-3">Choose Your Dishes</h2>
      <p className="text-sm text-gray-600 mb-4">
        Select which types of dishes to include in your menu
      </p>
      
      {/* Preset configurations */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Quick Start Options</h3>
        <div className="grid grid-cols-2 gap-2">
          {DEFAULT_DISH_CONFIGS.map(config => (
            <button
              key={config.name}
              className="px-3 py-2 border rounded-md text-left hover:bg-gray-50"
              onClick={() => selectPreset(config.types)}
            >
              <div className="font-medium">{config.name}</div>
              <div className="text-xs text-gray-500">{config.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Custom dish selection */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Custom Selection</h3>
        <div className="space-y-2">
          {DISH_TYPES.map(type => (
            <div
              key={type}
              className="flex items-center"
            >
              <input
                type="checkbox"
                id={`dish-type-${type}`}
                checked={types.includes(type)}
                onChange={() => toggleDishType(type)}
                className="mr-2 h-4 w-4"
              />
              <label 
                htmlFor={`dish-type-${type}`}
                className="capitalize"
              >
                {type}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Current selection summary */}
      <div className="p-3 bg-blue-50 rounded-lg mb-6">
        <div className="text-sm font-medium mb-1">Your Selection</div>
        <div className="flex flex-wrap gap-1">
          {types.map(type => (
            <span 
              key={type}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs capitalize"
            >
              {type}
            </span>
          ))}
        </div>
      </div>
      
      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          className="px-4 py-2 border rounded-md"
          onClick={onBack}
        >
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </span>
          Back
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
          disabled={types.length === 0}
          onClick={onNext}
        >
          Next
          <span className="inline-block ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

export default DishConfigSelector;
