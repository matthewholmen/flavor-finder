import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Moon, Sun, SlidersHorizontal, Bookmark, Trash2, Wine, Compass, Sparkles, Keyboard, Layers, LayoutGrid } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { Toggle } from './ui/index.ts';

const shortcuts = [
  { key: 'space', action: 'generate' },
  { key: 'enter', action: 'search' },
  { key: '+', action: 'add ingredient' },
  { key: '-', action: 'remove ingredient' },
  { key: 'delete', action: 'delete last ingr.' },
  { key: 'z', action: 'undo' },
];

const COMPATIBILITY_MODES = [
  { key: 'perfect', label: 'Perfect', description: 'Every ingredient pairs with every other — the full flavor-map guarantee. Recommended.' },
  { key: 'mixed', label: 'Mixed', description: 'Looser: each ingredient pairs with at least one other in the set, not necessarily all of them. Expect a few odd couples.' },
];

// Pairing sources the user can toggle. Keys must match PairingSource in data/pairingMeta.ts.
// flavordb is off by default: shared aroma compounds are a food-science hypothesis (and a
// culture-dependent one), not culinary evidence — enabling it is an explicit user choice.
const PAIRING_SOURCES = [
  { key: 'flavorbible', label: "Chef's Canon", description: 'Classic chef-recommended pairings (The Flavor Bible).' },
  { key: 'recipenlg', label: 'Recipe Data', description: 'Pairings found across 2.2M real-world recipes.' },
  { key: 'analog', label: 'Similar Ingredients', description: 'Borrowed from close culinary cousins, for ingredients too new for recipe data.' },
  { key: 'flavordb', label: 'Shared Aroma (experimental)', description: 'Foods that share flavor molecules but no culinary tradition (FlavorDB) — a food-science lens, off by default.' },
];

// Pairing Sources Content
const PairingSourcesContent = ({ enabledSources, onToggleSource }) => {
  return (
    <div className="space-y-3">
      <p className="text-gray-500 dark:text-gray-400 text-xs leading-relaxed">
        Choose which evidence drives ingredient pairings. At least one stays on.
      </p>
      {PAIRING_SOURCES.map((source) => {
        const enabled = enabledSources.includes(source.key);
        return (
          <div key={source.key} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{source.label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{source.description}</div>
            </div>
            <Toggle
              checked={enabled}
              onChange={() => onToggleSource(source.key)}
              label={`Toggle ${source.label}`}
            />
          </div>
        );
      })}
    </div>
  );
};

// Small uppercase group label — clusters the menu rows by kind (Build / Settings
// / Help) so popouts and accordions read as intentional groups, not one long
// interleaved list. Matches the app's section-label style (e.g. DISH FRAMES).
const GroupLabel = ({ children }) => (
  <div className="px-4 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
    {children}
  </div>
);

// Collapsible Section Component
const CollapsibleSection = ({ title, icon, isOpen, onToggle, children }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
          {icon}
          {title}
        </span>
        <ChevronDown
          size={20}
          strokeWidth={1.5}
          className={`text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};

// Generation Options Content: the compatibility mode picker.
const GenerationOptionsContent = ({
  compatibilityMode,
  onCompatibilityChange,
}) => {
  return (
    <>
      {/* Compatibility Section */}
      <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-3">Compatibility</h3>
      <div className="relative inline-grid grid-cols-2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 w-full mb-2">
        {/* Sliding background indicator */}
        <div
          className="absolute top-1 bottom-1 bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-200 ease-out"
          style={{
            width: 'calc(50% - 2px)',
            left: `calc(${Math.max(0, COMPATIBILITY_MODES.findIndex(m => m.key === compatibilityMode)) * 50}% + 1px)`,
          }}
        />
        {COMPATIBILITY_MODES.map((mode) => (
          <button
            key={mode.key}
            onClick={() => onCompatibilityChange(mode.key)}
            className={`
              relative z-10 py-1.5 px-2 text-xs font-medium text-center
              rounded-full transition-colors duration-200
              ${compatibilityMode === mode.key
                ? 'text-white dark:text-gray-900'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
              }
            `}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        {COMPATIBILITY_MODES.find(m => m.key === compatibilityMode)?.description}
      </p>
    </>
  );
};

// Bottom Settings Toggles (shared)
const BottomSettingsToggles = () => {
  const { isDarkMode, toggleDarkMode, isHighContrast, toggleHighContrast } = useTheme();

  return (
    <>
      <GroupLabel>Appearance</GroupLabel>
      <div className="px-4 pb-4 space-y-3">
        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDarkMode ? (
              <Moon size={18} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <Sun size={18} className="text-gray-600 dark:text-gray-300" />
            )}
            <span className="text-sm text-gray-700 dark:text-gray-300">Dark Mode</span>
          </div>
          <Toggle checked={isDarkMode} onChange={toggleDarkMode} label="Toggle dark mode" />
        </div>

        {/* High Contrast Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">High Contrast</span>
          <Toggle checked={isHighContrast} onChange={toggleHighContrast} label="Toggle high contrast" />
        </div>
      </div>
    </>
  );
};

// Saved Combinations Content (shared)
const SavedCombinationsContent = ({
  savedCombinations,
  onLoadCombination,
  onDeleteCombination,
  onDrinkPairing,
}) => {
  if (savedCombinations.length === 0) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        Tap the <Bookmark size={12} className="inline -mt-0.5" strokeWidth={2.5} /> Save
        button up top to keep a combination here for later.
      </p>
    );
  }

  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto -mx-1 px-1">
      {savedCombinations.map((combo) => (
        <div
          key={combo.id}
          className="group flex items-start gap-1 rounded-lg bg-white dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
        >
          <button
            onClick={() => onLoadCombination(combo.ingredients)}
            className="flex-1 text-left px-3 py-2.5 min-w-0"
            title="Load this combination"
          >
            <div className="flex flex-wrap gap-1">
              {combo.ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  {ing}
                </span>
              ))}
            </div>
          </button>
          <button
            onClick={() => onDrinkPairing(combo)}
            className="shrink-0 p-2 mt-1 text-gray-300 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="What to drink with this"
            title="What to drink"
          >
            <Wine size={15} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => onDeleteCombination(combo.id)}
            className="shrink-0 p-2 mt-1 mr-1 text-gray-300 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
            aria-label="Delete saved combination"
            title="Delete"
          >
            <Trash2 size={15} strokeWidth={1.75} />
          </button>
        </div>
      ))}
    </div>
  );
};

export const Sidebar = ({
  isOpen,
  onClose,
  dietaryRestrictions = {},
  onDietaryChange = () => {},
  compatibilityMode = 'perfect',
  onCompatibilityChange = () => {},
  enabledSources = ['flavorbible', 'recipenlg', 'flavordb'],
  onToggleSource = () => {},
  onOpenIngredientFilters = () => {},
  onOpenPresets = () => {},
  onStartTour = () => {},
  savedCombinations = [],
  onLoadCombination = () => {},
  onDeleteCombination = () => {},
  onDrinkPairing = () => {},
}) => {
  const { isMobile } = useScreenSize();
  const [openSections, setOpenSections] = useState({ saved: false, generation: false, sources: false, shortcuts: false });

  const toggleSection = (section) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/20
          transition-opacity duration-300
          z-[60]
          ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
      />

      {/* Sidebar Panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full
          bg-gray-100 dark:bg-gray-800
          shadow-lg
          z-[61]
          transition-transform duration-300 ease-in-out
          ${isMobile ? 'w-72' : 'w-80'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between ${isMobile ? 'px-4 py-3' : 'px-6 py-5'}`}>
            <div className="relative group cursor-pointer transition-opacity hover:opacity-70" onClick={onClose}>
              {isMobile ? (
                <img
                  src="/flavor-finder-HORIZONTAL-512.png"
                  alt="Flavor Finder"
                  className="w-auto h-[18px]"
                />
              ) : (
                <img
                  src="/mobile-logo.png"
                  alt="Flavor Finder"
                  className="w-auto h-8"
                />
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close sidebar"
            >
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* — BUILD: start or recall a combination — */}
            <GroupLabel>Build</GroupLabel>

            {/* Flavor Presets — curated slot-role recipes for the generator */}
            <button
              onClick={() => {
                onClose();
                onOpenPresets();
              }}
              className="w-full flex items-center justify-between py-3 px-4 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
                <LayoutGrid size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
                Build a Dish
              </span>
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            </button>

            {/* Saved Combinations */}
            <CollapsibleSection
              title="Saved Combinations"
              icon={<Bookmark size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />}
              isOpen={openSections.saved}
              onToggle={() => toggleSection('saved')}
            >
              <SavedCombinationsContent
                savedCombinations={savedCombinations}
                onLoadCombination={onLoadCombination}
                onDeleteCombination={onDeleteCombination}
                onDrinkPairing={onDrinkPairing}
              />
            </CollapsibleSection>

            {/* — SETTINGS: how generation behaves and what's in the pool — */}
            <GroupLabel>Settings</GroupLabel>

            {/* Generation Options */}
            <CollapsibleSection
              title="Generation Options"
              icon={<Sparkles size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />}
              isOpen={openSections.generation}
              onToggle={() => toggleSection('generation')}
            >
              <GenerationOptionsContent
                compatibilityMode={compatibilityMode}
                onCompatibilityChange={onCompatibilityChange}
              />
            </CollapsibleSection>

            {/* Pairing Sources */}
            <CollapsibleSection
              title="Pairing Sources"
              icon={<Layers size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />}
              isOpen={openSections.sources}
              onToggle={() => toggleSection('sources')}
            >
              <PairingSourcesContent
                enabledSources={enabledSources}
                onToggleSource={onToggleSource}
              />
            </CollapsibleSection>

            {/* Ingredient Filters */}
            <button
              onClick={() => {
                onClose();
                onOpenIngredientFilters();
              }}
              className="w-full flex items-center justify-between py-3 px-4 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
                <SlidersHorizontal size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
                Ingredient Filters
              </span>
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            </button>

            {/* Spacer to push help + settings to bottom */}
            <div className="flex-1" />

            {/* — HELP: demoted to the footer, next to the theme toggles — */}
            <GroupLabel>Help</GroupLabel>

            {/* Take the tour */}
            <button
              onClick={onStartTour}
              className="w-full flex items-center justify-between py-3 px-4 text-left border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
                <Compass size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
                Take the tour
              </span>
              <ChevronRight size={20} strokeWidth={1.5} className="text-gray-400 dark:text-gray-500" />
            </button>

            {/* Keyboard shortcuts - desktop only */}
            {!isMobile && (
              <CollapsibleSection
                title="Shortcuts"
                icon={<Keyboard size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />}
                isOpen={openSections.shortcuts}
                onToggle={() => toggleSection('shortcuts')}
              >
                <ul className="space-y-1.5">
                  {shortcuts.map(({ key, action }) => (
                    <li key={key} className="flex items-baseline gap-2 text-sm">
                      <span className="font-bold text-gray-700 dark:text-gray-300">{key}</span>
                      <span className="text-gray-400 dark:text-gray-500">—</span>
                      <span className="text-gray-600 dark:text-gray-400">{action}</span>
                    </li>
                  ))}
                </ul>
              </CollapsibleSection>
            )}

            {/* Settings toggles at bottom */}
            <BottomSettingsToggles />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
