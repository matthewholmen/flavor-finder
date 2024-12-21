import React, { useState, useEffect } from 'react';
import { Info } from 'lucide-react';
import { TASTE_COLORS } from '../utils/colors.ts';

const InfoTooltip = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
  
    if (isModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
  
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={toggleModal}
        className="flex items-center gap-2 p-2 text-gray-800 hover:text-gray-400 transition-colors"
        aria-label="About FlavorFinder"
      >
        <Info size={20} />
        <span className="text-sm">Info</span>
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-6 max-w-3xl w-full relative border border-gray-700 max-h-[90vh] overflow-y-auto">
            <button
              onClick={toggleModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              aria-label="Close modal"
            >
              ×
            </button>

            <div className="space-y-6">
              {/* Overview - Full Width */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-gray-100">FlavorFinder</h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Discover unique ingredient combinations using chef-recommended pairings backed by culinary tradition and food science. Perfect for creative cooks looking to understand and craft harmonious flavor combinations.
                </p>
              </div>

              {/* Two Column Layout for Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Create & Discover Column */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-200">Create & Discover</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Select ingredients to see what pairs well with them</li>
                    <li>• Press Generate (or spacebar) for instant harmonious combinations</li>
                    <li>• Use filters to find specific types of ingredients (e.g., sour liquids, spicy vegetables)</li>
                    <li>• Toggle "Partial Matches" to explore less conventional combinations</li>
                  </ul>
                </div>

                {/* Analyze & Refine Column */}
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-200">Analyze & Refine</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• See how ingredients complement each other through taste profiles</li>
                    <li>• Adjust taste sliders to fine-tune your search</li>
                    <li>• Lock favorite ingredients while exploring variations</li>
                    <li>• Higher match scores (in green) indicate stronger pairings</li>
                  </ul>
                </div>
              </div>

              {/* Taste Profiles - Full Width */}
              <div className="space-y-3 pt-4 border-t border-gray-700">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium text-gray-200">Understanding Taste Profiles</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                  Each ingredient is a unique blend of tastes, but is sorted into categories based on their dominant taste.
                </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.sweet }}></div>
                    <span className="text-gray-300">Sweet (honey, raisin)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.salty }}></div>
                    <span className="text-gray-300">Salty (capers, pecorino)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.sour }}></div>
                    <span className="text-gray-300">Sour (citrus, vinegar)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.bitter }}></div>
                    <span className="text-gray-300">Bitter (coffee, chicory)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.umami }}></div>
                    <span className="text-gray-300">Umami (dashi, anchovy)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.fat }}></div>
                    <span className="text-gray-300">Fat (oil, nuts)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.spicy }}></div>
                    <span className="text-gray-300">Spicy (chili, horseradish)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InfoTooltip;