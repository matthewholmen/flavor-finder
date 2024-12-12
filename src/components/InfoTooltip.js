import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { TASTE_COLORS } from '../utils/colors.ts';

const InfoTooltip = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  return (
    <div className="relative">
      {/* Info Button */}
      <button
        onClick={toggleModal}
        className="flex items-center gap-2 p-2 text-gray-800 hover:text-gray-400 transition-colors"
        aria-label="How to use FlavorFinder"
      >
        <Info size={20} />
        <span className="text-sm">Info</span>
      </button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg p-8 max-w-xl w-full relative border border-gray-700">
            {/* Close button */}
            <button
              onClick={toggleModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-200"
              aria-label="Close modal"
            >
              ×
            </button>

            {/* Modal content */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-100">Welcome to FlavorFinder</h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-200">Discover Perfect Pairings</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• Start by selecting any ingredient - we'll show you what pairs well with it</li>
                    <li>• Add up to 5 ingredients to explore complex flavor combinations</li>
                    <li>• Use spacebar or the Generate button for AI-powered suggestions</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-200">Taste Visualization</h3>
                  <p className="text-gray-300 text-sm">Each ingredient is color-coded by its dominant taste profile:</p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.sweet }}></div>
                      <span className="text-gray-300">Sweet (desserts, fruits)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.salty }}></div>
                      <span className="text-gray-300">Salty (cheese, seafood)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.sour }}></div>
                      <span className="text-gray-300">Sour (citrus, vinegars)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.bitter }}></div>
                      <span className="text-gray-300">Bitter (coffee, greens)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.umami }}></div>
                      <span className="text-gray-300">Umami (mushrooms, meat)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.fat }}></div>
                      <span className="text-gray-300">Fat (oils, nuts)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: TASTE_COLORS.spicy }}></div>
                      <span className="text-gray-300">Spicy (peppers, spices)</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-gray-200">Advanced Features</h3>
                  <ul className="space-y-2 text-gray-300 text-sm">
                    <li>• <span className="text-gray-200">Categories:</span> Filter by ingredient types (Fruits, Proteins, etc.)</li>
                    <li>• <span className="text-gray-200">Taste Sliders:</span> Fine-tune intensity of each taste profile</li>
                    <li>• <span className="text-gray-200">Partial Matches:</span> Toggle to see ingredients that match some (not all) of your selections</li>
                    <li>• <span className="text-gray-200">Lock Feature:</span> Lock your favorite ingredients while exploring new combinations</li>
                  </ul>
                </div>

                <div className="bg-gray-800 p-4 rounded-md">
                  <p className="text-sm text-gray-300">
                    <span className="font-medium text-gray-200">How It Works:</span> FlavorFinder combines traditional culinary pairings with modern flavor science. Our algorithm analyzes taste profiles and proven combinations to suggest matches. Higher compatibility scores (shown in green) indicate stronger flavor harmonies.
                  </p>
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