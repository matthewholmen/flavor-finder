import React from 'react';
import { Menu } from '../../types';

interface MenuOverviewProps {
  menu: Menu;
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
    case 'beverage':
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2h4" />
            <path d="M12 14v7" />
            <path d="M4 14a8 8 0 0 1 16 0" />
            <path d="M6 22h12" />
          </svg>
        </span>
      );
    case 'sauce':
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 3h10" />
            <path d="M5 7h14" />
            <path d="M18 12a6 6 0 0 1-12 0" />
            <path d="M12 12v9" />
            <path d="M9 21h6" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="inline-block mr-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7h5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            <line x1="3" x2="8" y1="11" y2="11" />
            <path d="M21 7h-5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V7Z" />
            <line x1="16" x2="21" y1="11" y2="11" />
            <line x1="12" x2="12" y1="3" y2="21" />
          </svg>
        </span>
      );
  }
};

// Helper to get balance score color
const getBalanceScoreColor = (score: number) => {
  if (score > 80) return 'bg-green-100 text-green-800';
  if (score > 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

const capitalizeFirst = (str: string): string => {
  if (!str || typeof str !== 'string') return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const MenuOverview: React.FC<MenuOverviewProps> = ({ menu }) => {
  if (!menu) {
    return <div>No menu available</div>;
  }

  return (
    <div className="border rounded-lg bg-white p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-medium">{menu.name}</h2>
        <div className="flex items-center">
          <span className="text-sm mr-2">Balance Score:</span>
          <span className={`px-2 py-1 rounded-md text-xs font-medium ${getBalanceScoreColor(menu.balanceScore)}`}>
            {Math.round(menu.balanceScore)}
          </span>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium mr-2">
            Key
          </span>
          <span className="font-medium capitalize">{menu.keyIngredient}</span>
        </div>
      </div>
      
      <div className="space-y-4 mb-6">
        {menu.dishes.map(dish => (
          <div key={dish.id} className="border-b pb-4">
            <h3 className="font-medium mb-2">{dish.name}</h3>
            <div className="flex flex-wrap gap-1 mb-2">
              {dish.ingredients.map(ingredient => (
                <span key={ingredient} className="text-xs px-2 py-1 bg-gray-100 rounded-full">
                  {ingredient}
                </span>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>
                {getDishTypeIcon(dish.type)}
                {capitalizeFirst(dish.type)}
              </span>
              <span>
                <span className="inline-block mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m8 14 2.5-2.5" />
                    <path d="M16 10a2 2 0 0 0-1.38.59l-4.23 4.24a2 2 0 0 0 0 2.83 2 2 0 0 0 2.83 0L17.4 13.4A8 8 0 1 0 8.6 4.6L14 10" />
                  </svg>
                </span>
                Weight: {dish.weight}/10
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {/* Taste profile visualization would go here */}
      <div className="mt-6">
        <h3 className="text-sm font-medium mb-2">Menu Taste Profile</h3>
        <div className="grid grid-cols-7 gap-1">
          {Object.entries(menu.tasteProfile).map(([taste, value]) => (
            <div key={taste} className="flex flex-col items-center">
              <div className="text-xs mb-1 capitalize">{taste}</div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 rounded-full h-2" 
                  style={{ width: `${value * 10}%` }}
                />
              </div>
              <div className="text-xs mt-1">{value.toFixed(1)}</div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end mt-4 gap-2">
        <button className="px-4 py-2 border rounded-md flex items-center">
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
          </span>
          Save Menu
        </button>
        <button className="px-4 py-2 border rounded-md flex items-center">
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </span>
          Share
        </button>
      </div>
    </div>
  );
};

export default MenuOverview;
