import React, { useState } from 'react';
import { Globe } from 'lucide-react';

interface CopyIngredientsButtonProps {
  selectedIngredients: string[];
  useBooleanSearch?: boolean;
}

const SearchIngredientsButton: React.FC<CopyIngredientsButtonProps> = ({ 
  selectedIngredients,
  useBooleanSearch = false
}) => {
  const [showSuccess, setShowSuccess] = useState(false);
  
  const handleSearch = () => {
    if (selectedIngredients.length === 0) {
      // Nothing to search if no ingredients
      return;
    }

    // Format the search query based on the boolean search setting
    let ingredientsText;
    if (useBooleanSearch) {
      // Add quotes around each ingredient for boolean search
      ingredientsText = selectedIngredients.map(ingredient => `"${ingredient}"`).join(' ');
    } else {
      // Simple space-separated list
      ingredientsText = selectedIngredients.join(' ');
    }
    
    // Copy to clipboard first
    navigator.clipboard.writeText(ingredientsText)
      .then(() => {
        // Show success feedback
        setShowSuccess(true);
        
        // Open new tab with search
        const searchURL = `https://www.google.com/search?q=${encodeURIComponent(ingredientsText)}`;
        window.open(searchURL, '_blank');
        
        // Hide success message after 2 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy ingredients:', err);
      });
  };

  return (
    <div className="relative">
      <button 
        onClick={handleSearch}
        title="Search the Internet for These Ingredients"
        className={`p-4 h-14 border-2 ${showSuccess ? 'border-blue-500 text-blue-500' : 'border-gray-300 text-gray-500'} hover:bg-gray-100 rounded-full transition-colors mr-2`}
      >
        <Globe size={20} />
      </button>
      
      {showSuccess && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
          Opening search in new tab
        </div>
      )}
    </div>
  );
};

export default SearchIngredientsButton;
