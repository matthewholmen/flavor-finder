import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Moon, Sun, SlidersHorizontal, Bookmark, Trash2, Compass, Sparkles, Keyboard, Layers, LayoutGrid } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';
import { useTheme } from '../../contexts/ThemeContext.tsx';
import { Wordmark } from './MinimalHeader.tsx';

const shortcuts = [
  { key: 'space', action: 'generate' },
  { key: 'enter', action: 'search' },
  { key: '+', action: 'add ingredient' },
  { key: '-', action: 'remove ingredient' },
  { key: 'delete', action: 'delete last ingr.' },
  { key: 'z', action: 'undo' },
];

const COMPATIBILITY_MODES = [
  { key: 'perfect', label: 'Perfect', description: 'Generated pairings include only perfect matches — each ingredient is a recommended pairing for one another.' },
  { key: 'mixed', label: 'Mixed', description: 'Each ingredient pairs with at least one other ingredient in the set, allowing for more creative combinations.' },
  { key: 'random', label: 'Random', description: 'Completely random ingredients with no pairing requirements — for adventurous cooks!' }
];

// Pairing sources the user can toggle. Keys must match PairingSource in data/pairingMeta.ts.
const PAIRING_SOURCES = [
  { key: 'flavorbible', label: "Chef's Canon", description: 'Classic chef-recommended pairings (The Flavor Bible).' },
  { key: 'recipenlg', label: 'Recipe Data', description: 'Pairings found across 2.2M real-world recipes.' },
  { key: 'analog', label: 'Similar Ingredients', description: 'Borrowed from close culinary cousins, for ingredients too new for recipe data.' },
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
            <button
              role="switch"
              aria-checked={enabled}
              aria-label={`Toggle ${source.label}`}
              onClick={() => onToggleSource(source.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                enabled ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        );
      })}
    </div>
  );
};

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

// Classic ⇄ Taste Lab mode toggle. Lifted to the sidebar's top level (above the
// collapsible sections) so switching modes is always one tap away.
const ModeToggle = ({
  isTasteLab = false,
  onTasteLabChange = () => {},
}) => (
  <div className="relative inline-grid grid-cols-2 bg-gray-200 dark:bg-gray-700 rounded-full p-1 w-full">
    <div
      className="absolute top-1 bottom-1 bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-200 ease-out"
      style={{
        width: 'calc(50% - 2px)',
        left: isTasteLab ? 'calc(50% + 1px)' : '1px',
      }}
    />
    {[
      { key: 'classic', label: 'Classic' },
      { key: 'taste', label: 'Taste Lab' },
    ].map((mode) => {
      const active = (mode.key === 'taste') === isTasteLab;
      return (
        <button
          key={mode.key}
          onClick={() => onTasteLabChange(mode.key === 'taste')}
          className={`
            relative z-10 py-1.5 px-2 text-xs font-medium text-center
            rounded-full transition-colors duration-200
            ${active
              ? 'text-white dark:text-gray-900'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'
            }
          `}
        >
          {mode.label}
        </button>
      );
    })}
  </div>
);

// Generation Options Content. The Classic/Taste Lab mode toggle now lives at the
// sidebar's top level (see ModeToggle); this section holds the mode-specific
// generation settings.
const GenerationOptionsContent = ({
  compatibilityMode,
  onCompatibilityChange,
  isTasteLab = false,
}) => {
  // Taste Lab has no sidebar generation settings — its controls live on the
  // per-slot cards in the main view.
  if (isTasteLab) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        Set each slot's dominant taste or category right on the cards, and
        Generate finds a pairing that fits — like salty + sweet → anchovy & plum.
      </p>
    );
  }

  return (
    <>
      {/* Compatibility Section (Classic mode only) */}
      <h3 className="text-gray-700 dark:text-gray-300 font-medium text-sm mb-3">Compatibility</h3>
      <div className="relative inline-grid grid-cols-3 bg-gray-200 dark:bg-gray-700 rounded-full p-1 w-full mb-2">
        {/* Sliding background indicator */}
        <div
          className="absolute top-1 bottom-1 bg-gray-900 dark:bg-gray-100 rounded-full transition-all duration-200 ease-out"
          style={{
            width: 'calc(33.333% - 2px)',
            left: `calc(${COMPATIBILITY_MODES.findIndex(m => m.key === compatibilityMode) * 33.333}% + 1px)`,
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
    <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
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
        <button
          onClick={toggleDarkMode}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${isDarkMode ? 'bg-gray-900' : 'bg-gray-300'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
              ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>

      {/* High Contrast Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-700 dark:text-gray-300">High Contrast</span>
        <button
          onClick={toggleHighContrast}
          className={`
            relative w-11 h-6 rounded-full transition-colors duration-200
            ${isHighContrast ? 'bg-gray-900' : 'bg-gray-300'}
          `}
        >
          <div
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200
              ${isHighContrast ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
    </div>
  );
};

// Saved Combinations Content (shared)
const SavedCombinationsContent = ({
  savedCombinations,
  onLoadCombination,
  onDeleteCombination,
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
  isTasteLab = false,
  onTasteLabChange = () => {},
  enabledSources = ['flavorbible', 'recipenlg', 'flavordb'],
  onToggleSource = () => {},
  onOpenIngredientFilters = () => {},
  onOpenPresets = () => {},
  onStartTour = () => {},
  savedCombinations = [],
  onLoadCombination = () => {},
  onDeleteCombination = () => {},
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
              <Wordmark compact />
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
            {/* Description */}
            <p className="text-gray-700 dark:text-gray-400 text-sm leading-relaxed px-4 pt-3 pb-3">
              Mix and match ingredients that taste great together, then jump
              straight to recipes for your combination.
            </p>

            {/* Mode toggle — top-level for one-tap Classic ⇄ Taste Lab switching */}
            <div className="px-4 pb-4">
              <ModeToggle isTasteLab={isTasteLab} onTasteLabChange={onTasteLabChange} />
            </div>

            {/* Flavor Presets — the "discover" entry into Taste Lab */}
            <button
              onClick={onOpenPresets}
              className="w-full flex items-center justify-between py-3 px-4 text-left border-y border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="flex items-center gap-2 text-gray-900 dark:text-gray-100 font-semibold text-base">
                <LayoutGrid size={16} strokeWidth={2} className="text-gray-500 dark:text-gray-400" />
                Flavor Presets
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
              />
            </CollapsibleSection>

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
                isTasteLab={isTasteLab}
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

            {/* Spacer to push settings to bottom */}
            <div className="flex-1" />

            {/* Settings toggles at bottom */}
            <BottomSettingsToggles />
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
