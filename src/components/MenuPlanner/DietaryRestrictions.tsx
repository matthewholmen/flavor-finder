import React from 'react';
import { DIETARY_RESTRICTIONS, DietaryRestriction } from '../../utils/menuPlanner';

interface DietaryRestrictionsProps {
  selected: DietaryRestriction[];
  onChange: (restrictions: DietaryRestriction[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const DietaryRestrictions: React.FC<DietaryRestrictionsProps> = ({
  selected,
  onChange,
  onNext,
  onBack
}) => {
  // Toggle restriction selection
  const toggleRestriction = (restriction: DietaryRestriction) => {
    if (selected.includes(restriction)) {
      // Remove restriction if already selected
      const newRestrictions = selected.filter(r => r !== restriction);
      onChange(newRestrictions);
    } else {
      // Add restriction if not selected
      const newRestrictions = [...selected, restriction];
      onChange(newRestrictions);
    }
  };
  
  // Common dietary patterns
  const dietaryPatterns = [
    {
      name: 'Vegetarian',
      restrictions: ['no meat', 'no fish'],
      description: 'No meat or fish'
    },
    {
      name: 'Vegan',
      restrictions: ['vegan', 'no meat', 'no fish', 'dairy-free'],
      description: 'No animal products'
    },
    {
      name: 'Gluten-Free',
      restrictions: ['gluten-free'],
      description: 'No wheat, barley, or rye'
    },
    {
      name: 'Pescatarian',
      restrictions: ['no meat'],
      description: 'No meat, but includes fish'
    }
  ];
  
  // Apply preset dietary pattern
  const applyPattern = (restrictions: DietaryRestriction[]) => {
    onChange(restrictions);
  };
  
  return (
    <div>
      <h2 className="text-xl font-medium mb-3">Dietary Restrictions</h2>
      <p className="text-sm text-gray-600 mb-4">
        Select any dietary restrictions to consider in your menu
      </p>
      
      {/* Common patterns */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Common Patterns</h3>
        <div className="grid grid-cols-2 gap-2">
          {dietaryPatterns.map(pattern => (
            <button
              key={pattern.name}
              className="px-3 py-2 border rounded-md text-left hover:bg-gray-50"
              onClick={() => applyPattern(pattern.restrictions as DietaryRestriction[])}
            >
              <div className="font-medium">{pattern.name}</div>
              <div className="text-xs text-gray-500">{pattern.description}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Individual restrictions */}
      <div className="mb-6">
        <h3 className="text-sm font-medium mb-2">Custom Restrictions</h3>
        <div className="grid grid-cols-2 gap-y-2">
          {DIETARY_RESTRICTIONS.map(restriction => (
            <div
              key={restriction}
              className="flex items-center"
            >
              <input
                type="checkbox"
                id={`restriction-${restriction}`}
                checked={selected.includes(restriction)}
                onChange={() => toggleRestriction(restriction)}
                className="mr-2 h-4 w-4"
              />
              <label 
                htmlFor={`restriction-${restriction}`}
                className="capitalize"
              >
                {restriction}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      {/* Current selection summary */}
      {selected.length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg mb-6">
          <div className="text-sm font-medium mb-1">Active Restrictions</div>
          <div className="flex flex-wrap gap-1">
            {selected.map(restriction => (
              <span 
                key={restriction}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs capitalize"
              >
                {restriction}
              </span>
            ))}
          </div>
        </div>
      )}
      
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
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
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

export default DietaryRestrictions;
