// <button 
//               onClick={() => setIsMatrixModalOpen(true)}
//               className="px-4 py-2 border-2 border-[#FF954F] text-[#000000] hover:bg-[#FF954F] hover:text-white rounded-full font-sans flex items-center gap-2 transition-colors"
//             >
//               <Table size={16} />
//               Matrix
//             </button>

import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { flavorPairings } from '../data/flavorPairings.ts';

interface FlavorMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIngredients: string[];
  flavorMap: Map<string, Set<string>>;
}

const FlavorMatrixModal: React.FC<FlavorMatrixModalProps> = ({
  isOpen,
  onClose,
  selectedIngredients,
  flavorMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Get all relevant ingredients - selected ones plus their compatible ingredients
  const relevantIngredients = useMemo(() => {
    if (selectedIngredients.length === 0) return [];
    
    const compatible = new Set<string>();
    // Add selected ingredients
    selectedIngredients.forEach(ing => compatible.add(ing));
    
    // Add ingredients that pair with any selected ingredient
    selectedIngredients.forEach(selected => {
      const pairings = flavorMap.get(selected);
      if (pairings) {
        pairings.forEach(ing => compatible.add(ing));
      }
    });
    
    return Array.from(compatible).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [selectedIngredients, flavorMap]);

  const [filteredIngredients, setFilteredIngredients] = useState<string[]>(relevantIngredients);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle search filtering
  useEffect(() => {
    const filtered = relevantIngredients.filter(ing => 
      ing.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredIngredients(filtered);
  }, [searchTerm, relevantIngredients]);

  if (!isOpen) return null;

  const isPair = (ing1: string, ing2: string) => {
    return flavorMap.get(ing1)?.has(ing2) || false;
  };

  const getCellColor = (ing1: string, ing2: string) => {
    if (ing1 === ing2) return 'bg-amber-100';
    const isSelected = selectedIngredients.includes(ing1) && selectedIngredients.includes(ing2);
    if (isSelected && isPair(ing1, ing2)) return 'bg-yellow-200';
    return isPair(ing1, ing2) ? 'bg-green-100' : 'bg-blue-100';
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 w-[90vw] h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold">Flavor Pairing Matrix</h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredIngredients.length} ingredients and their pairings
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter ingredients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border rounded-lg w-64"
          />
        </div>

        <div className="overflow-auto h-[calc(90vh-200px)]">
          <table className="min-w-full border-collapse relative">
            <thead className="sticky top-0 z-20 bg-white">
              <tr>
                <th className="p-2 border sticky left-0 bg-white z-30"></th>
                {filteredIngredients.map((ing) => (
                  <th 
                    key={ing} 
                    className={`p-2 border text-sm font-medium rotate-45 h-32 bg-white ${
                      selectedIngredients.includes(ing) ? 'text-yellow-600 font-bold' : ''
                    }`}
                  >
                    {ing}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.map((row) => (
                <tr key={row}>
                  <th 
                    className={`p-2 border text-sm font-medium text-left whitespace-nowrap sticky left-0 bg-white z-10 ${
                      selectedIngredients.includes(row) ? 'text-yellow-600 font-bold' : ''
                    }`}
                  >
                    {row}
                  </th>
                  {filteredIngredients.map((col) => (
                    <td
                      key={`${row}-${col}`}
                      className={`p-2 border text-center ${getCellColor(row, col)}`}
                      title={`${row} + ${col}: ${isPair(row, col) ? 'Compatible' : 'Not compatible'}`}
                    >
                      {row === col ? '0' : (isPair(row, col) ? '1' : '0')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FlavorMatrixModal;