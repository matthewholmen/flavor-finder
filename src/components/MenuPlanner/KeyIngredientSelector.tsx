import React, { useState, useEffect } from 'react';
import { IngredientProfile } from '../../types';

interface KeyIngredientSelectorProps {
  value: string;
  onChange: (ingredient: string) => void;
  onNext: () => void;
  allIngredients: IngredientProfile[];
}

const KeyIngredientSelector: React.FC<KeyIngredientSelectorProps> = ({ 
  value, 
  onChange, 
  onNext,
  allIngredients
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<string[]>([]);
  
  // Search function
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term) {
      setResults([]);
      return;
    }
    
    // Find matching ingredients
    const matches = allIngredients
      .filter(ingredient => 
        ingredient.name.toLowerCase().includes(term.toLowerCase())
      )
      .map(ingredient => ingredient.name);
    
    setResults(matches.slice(0, 10));
  };

  // Suggest popular ingredients if no search term
  useEffect(() => {
    if (!searchTerm && !results.length) {
      // Suggest some common ingredients as starting points
      const suggestions = [
        'chicken', 'beef', 'salmon', 'pork', 
        'mushroom', 'tomato', 'potato', 'carrot',
        'rice', 'pasta', 'lemon', 'garlic'
      ];
      
      // Filter suggestions to only include ingredients that exist in our data
      const validSuggestions = suggestions.filter(suggestion => 
        allIngredients.some(ingredient => ingredient.name === suggestion)
      );
      
      setResults(validSuggestions);
    }
  }, [searchTerm, results.length, allIngredients]);
  
  return (
    <div>
      <h2 className="text-xl font-medium mb-3">Select Key Ingredient</h2>
      <p className="text-sm text-gray-600 mb-4">
        This ingredient will be the foundation of your menu
      </p>
      
      <div className="mb-4">
        <input
          type="text"
          className="w-full p-3 border rounded-lg"
          placeholder="Search for an ingredient..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>
      
      {results.length > 0 && (
        <div className="max-h-60 overflow-y-auto border rounded-lg mb-4">
          {results.map(ingredient => (
            <button
              key={ingredient}
              className={`block w-full text-left px-4 py-3 hover:bg-gray-50 ${
                value === ingredient ? 'bg-blue-50' : ''
              }`}
              onClick={() => onChange(ingredient)}
            >
              {ingredient}
            </button>
          ))}
        </div>
      )}
      
      {value && (
        <div className="p-3 bg-blue-50 rounded-lg flex items-center mb-6">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium mr-2">
            Key
          </span>
          <span className="font-medium">{value}</span>
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md disabled:bg-blue-300"
          disabled={!value}
          onClick={onNext}
        >
          Next
          <span className="inline-block ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
};

export default KeyIngredientSelector;
