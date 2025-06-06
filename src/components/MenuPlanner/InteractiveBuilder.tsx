import React, { useState } from 'react';
import { Menu, Dish, IngredientProfile } from '../../types';
import MenuOverview from './MenuOverview';
import DishEditor from './DishEditor';

interface InteractiveBuilderProps {
  initialMenu: Menu | null;
  onChange: (menu: Menu) => void;
  onRestart: () => void;
  allIngredients: IngredientProfile[];
  flavorMap: Map<string, Set<string>>;
  ingredientProfileMap: Map<string, IngredientProfile>;
}

// Helper to get dish type icon
const getDishTypeIcon = (type: string) => {
  switch (type) {
    case 'entree':
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
            <line x1="6" x2="18" y1="17" y2="17" />
          </svg>
        </span>
      );
    case 'side':
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 12a9 9 0 0 0 9-9" />
            <path d="M3 21a9 9 0 0 1 9-9" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </span>
      );
    case 'salad':
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11h18" />
            <path d="M12 2v2" />
            <path d="M7 7H5" />
            <path d="M19 7h-2" />
            <path d="M21 16v-.9a8 8 0 0 0-1.1-4.1l-.9-1.4" />
            <path d="M3 16v-.9a8 8 0 0 1 1.1-4.1l.9-1.4" />
            <path d="M11 16v.9H9.1l-3 2.3" />
            <path d="M21 22l-3-2" />
            <path d="M3 22l3-2" />
            <path d="M12 16v.9h1.9l3 2.3" />
          </svg>
        </span>
      );
    case 'dessert':
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2h8" />
            <path d="M12 2v7" />
            <path d="M10 9h4" />
            <path d="M7 22v-9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v9" />
            <path d="M7 16H5c-1 0-2-.6-2-2v-2c0-4.4 3.6-8 8-8h2c4.4 0 8 3.6 8 8v2c0 1.4-1 2-2 2h-2" />
          </svg>
        </span>
      );
    default:
      return null;
  }
};

const capitalizeFirst = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const InteractiveBuilder: React.FC<InteractiveBuilderProps> = ({
  initialMenu,
  onChange,
  onRestart,
  allIngredients,
  flavorMap,
  ingredientProfileMap
}) => {
  const [activeTab, setActiveTab] = useState<string>(
    initialMenu?.dishes[0]?.type || 'overview'
  );
  
  // Handle case where no menu exists yet
  if (!initialMenu) {
    return (
      <div className="text-center p-8">
        <h3 className="text-lg font-medium mb-2">No Menu Yet</h3>
        <p className="text-gray-600 mb-4">
          You need to create a menu using the guided wizard first.
        </p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md"
          onClick={onRestart}
        >
          Start Wizard
        </button>
      </div>
    );
  }
  
  // Handle dish updates
  const updateDish = (updatedDish: Dish) => {
    const updatedDishes = initialMenu.dishes.map(dish => 
      dish.id === updatedDish.id ? updatedDish : dish
    );
    
    // Recalculate menu balance
    // Note: In a real implementation, we would use the utility functions
    // from the menuPlanner utils
    
    onChange({
      ...initialMenu,
      dishes: updatedDishes
    });
  };
  
  // Handle dish deletion
  const deleteDish = (dishId: string) => {
    const updatedDishes = initialMenu.dishes.filter(dish => dish.id !== dishId);
    
    // If no dishes left, switch to overview
    if (updatedDishes.length === 0) {
      setActiveTab('overview');
    }
    // If deleted dish was active, switch to overview
    else if (!updatedDishes.some(dish => dish.type === activeTab)) {
      setActiveTab('overview');
    }
    
    onChange({
      ...initialMenu,
      dishes: updatedDishes
    });
  };
  
  return (
    <div className="interactive-builder">
      <div className="flex border-b overflow-x-auto">
        <button
          className={`px-4 py-2 whitespace-nowrap ${
            activeTab === 'overview' ? 'border-b-2 border-blue-500' : ''
          }`}
          onClick={() => setActiveTab('overview')}
        >
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          </span>
          Overview
        </button>
        
        {initialMenu.dishes.map(dish => (
          <button
            key={dish.id}
            className={`px-4 py-2 whitespace-nowrap ${
              activeTab === dish.type ? 'border-b-2 border-blue-500' : ''
            }`}
            onClick={() => setActiveTab(dish.type)}
          >
            {getDishTypeIcon(dish.type)}
            {capitalizeFirst(dish.type)}
          </button>
        ))}
      </div>
      
      <div className="mt-4">
        {activeTab === 'overview' ? (
          <MenuOverview menu={initialMenu} />
        ) : (
          <DishEditor
            dish={initialMenu.dishes.find(d => d.type === activeTab)}
            otherDishes={initialMenu.dishes.filter(d => d.type !== activeTab)}
            onChange={updateDish}
            onDelete={deleteDish}
            allIngredients={allIngredients}
            flavorMap={flavorMap}
            ingredientProfileMap={ingredientProfileMap}
          />
        )}
      </div>
    </div>
  );
};

export default InteractiveBuilder;
