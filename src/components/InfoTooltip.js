import React, { useState, useEffect } from 'react';
import { Info, X, Lock, SendToBack, Sparkles, Globe, Zap } from 'lucide-react';
import PropTypes from 'prop-types';
import { TASTE_COLORS } from '../utils/colors.ts';

const InfoTooltip = ({ handleRandomize, handleRecipeSearch }) => {
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
        className="flex items-center gap-2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="About FlavorFinder"
      >
        <Info size={20} />
        <span className="text-sm"></span>
      </button>

      {isModalOpen && (
        <div 
          className="fixed inset-y-0 left-0 bg-black bg-opacity-0 flex items-stretch z-50 w-full md:w-1/2"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-white border-r border-gray-200 w-full overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-12">
              {/* Header */}
              <div className="flex justify-between items-start">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-3 -ml-2 transition-colors rounded-full border-2 text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Title */}
              <div className="mt-8">
                <h2 className="text-3xl font-bold tracking-tight mb-2">
                  About FlavorFinder
                </h2>
                <div className="text-xs tracking-[0.3em] text-gray-500 uppercase">
                  Discover Perfect Ingredient Combinations
                </div>
              </div>

              {/* Overview */}
              <div className="mt-8">
                <p className="text-xl leading-relaxed text-gray-600">
                  Discover unique ingredient combinations using chef-recommended pairings backed by culinary tradition and food science. Perfect for creative cooks looking to understand and craft harmonious flavor combinations.
                </p>
              </div>

              {/* Features Section */}
              <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Create & Discover */}
                <div>
                  <h3 className="text-lg font-medium mb-6">Create & Discover</h3>
                  <ul className="space-y-4">
                    {[
                      'Select ingredients to see what pairs well with them',
                      'Press Generate (or spacebar) for instant harmonious combinations',
                      'Use filters to find specific types of ingredients',
                      'Toggle "Partial Matches" to explore less conventional combinations'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Analyze & Refine */}
                <div>
                  <h3 className="text-lg font-medium mb-6">Analyze & Refine</h3>
                  <ul className="space-y-4">
                    {[
                      'See how ingredients complement each other through taste profiles',
                      'Adjust taste sliders to fine-tune your search',
                      'Lock favorite ingredients while exploring variations',
                      'Higher match scores indicate stronger pairings'
                    ].map((item, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mt-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Interface Controls */}
              <div className="mt-12">
                <h3 className="text-lg font-medium mb-6">Interface Controls</h3>
                <p className="text-gray-600 mb-8">
                  FlavorFinder's interface is designed to help you explore and refine ingredient combinations efficiently.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Main Controls */}
                  <div className="space-y-6">
                    <h4 className="text-base font-medium text-gray-800 mb-4">Main Controls</h4>
                    
                                {/* Generate Button */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRandomize(); // Now properly passed as a prop
                  }}
                  className="p-4 border-2 border-[#7CB342] text-black rounded-full flex items-center justify-center transition-colors hover:bg-[#7CB342] hover:text-white group"
                >
                  <Sparkles size={20} className="transform group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <div>
                <div className="font-medium mb-1">Generate</div>
                <p className="text-sm text-gray-600">
                  Try it! Press this (or spacebar) to instantly create new ingredient combinations. Each suggestion is carefully chosen based on proven flavor pairings.
                </p>
              </div>
            </div>

            {/* Recipes Button */}
            <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
              <div className="shrink-0">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRecipeSearch(); // Now properly passed as a prop
                  }}
                  className="p-4 border-2 border-[#6AAFE8] text-black rounded-full flex items-center justify-center transition-colors hover:bg-[#6AAFE8] hover:text-white group"
                >
                  <Globe size={20} className="transform group-hover:scale-110 transition-transform" />
                </button>
              </div>
              <div>
                <div className="font-medium mb-1">Recipes</div>
                <p className="text-sm text-gray-600">Search Google for recipes that use your selected ingredients. Copies your ingredients to clipboard and opens a new tab with recipe search results.</p>
              </div>
            </div>


                    {/* Partial Matches Toggle */}
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="shrink-0">
                        <button className="p-4 border-2 border-dashed border- text-gray-400 rounded-full flex items-center justify-center transition-colors hover:border-[#FFC233] hover:text-gray-800">
                          <Zap size={20} className="transform transition-transform" />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Show Partial Matches</div>
                        <p className="text-sm text-gray-600">When enabled, shows ingredient combinations that might not be traditionally paired but could create interesting flavors.</p>
                      </div>
                    </div>
                  </div>

                  {/* Ingredient Controls */}
                  <div className="space-y-6">
                    <h4 className="text-base font-medium text-gray-800 mb-4">Ingredient Controls</h4>
                    
                    {/* Lock/Unlock */}
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="shrink-0">
                        <button className="p-4 rounded-full border-0 border-gray-800 text-gray-800">
                          <Lock size={24} strokeWidth={2} className="" />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Lock/Unlock</div>
                        <p className="text-sm text-gray-600">Lock ingredients you want to keep while generating new combinations. Locked ingredients won't be replaced.</p>
                      </div>
                    </div>

                    {/* Swap */}
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="shrink-0">
                        <button className="p-4 rounded-full border-0 border-gray-800 text-gray-800">
                          <SendToBack size={28} strokeWidth={2} className="" />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Find Alternatives</div>
                        <p className="text-sm text-gray-600">Explore alternative ingredients that would work well in place of the selected ingredient while maintaining flavor harmony.</p>
                      </div>
                    </div>

                    {/* Remove */}
                    <div className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="shrink-0">
                        <button className="p-2.5 rounded-full border-0 border-transparent text-gray-800">
                          <X size={28} strokeWidth={2} className="" />
                        </button>
                      </div>
                      <div>
                        <div className="font-medium mb-1">Remove</div>
                        <p className="text-sm text-gray-600">Remove an ingredient from your combination. You can add new ingredients by clicking the empty slot or generating new combinations.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Taste Profiles */}
              <div className="mt-12">
                <h3 className="text-lg font-medium mb-6">Understanding Taste Profiles</h3>
                <p className="text-gray-600 mb-8">
                  Each ingredient is a unique blend of tastes, but is sorted into categories based on their dominant taste.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    { taste: 'sweet', examples: 'honey, raisin' },
                    { taste: 'salty', examples: 'capers, pecorino' },
                    { taste: 'sour', examples: 'citrus, vinegar' },
                    { taste: 'bitter', examples: 'coffee, chicory' },
                    { taste: 'umami', examples: 'dashi, anchovy' },
                    { taste: 'fat', examples: 'oil, nuts' },
                    { taste: 'spicy', examples: 'chili, horseradish' }
                  ].map(({ taste, examples }) => (
                    <div key={taste} className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: TASTE_COLORS[taste] }}
                        />
                        <span className="font-medium capitalize">{taste}</span>
                      </div>
                      <div className="text-sm text-gray-500 pl-6">
                        {examples}
                      </div>
                    </div>
                  ))}
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