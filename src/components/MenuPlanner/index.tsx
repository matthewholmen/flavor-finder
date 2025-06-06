import React, { useState, useEffect } from 'react';
import { Menu, Dish, IngredientProfile } from '../../types';
import { 
  DISH_TYPES, 
  DishType, 
  DIETARY_RESTRICTIONS, 
  DietaryRestriction,
  autoGenerateMenu,
  createIngredientProfileMap
} from '../../utils/menuPlanner';
import ModeSelector from './ModeSelector';
import WizardInterface from './WizardInterface';
import InteractiveBuilder from './InteractiveBuilder';

interface MenuPlannerProps {
  allIngredients: IngredientProfile[];
  flavorMap: Map<string, Set<string>>;
}

// Wizard state shape
interface WizardState {
  step: number;
  keyIngredient: string;
  dishCount: number;
  dishTypes: DishType[];
  restrictions: DietaryRestriction[];
}

// Overall MenuPlanner state shape
interface MenuPlannerState {
  mode: 'wizard' | 'interactive';
  wizardState: WizardState;
  currentMenu: Menu | null;
  activeTab: string;
  isGenerating: boolean;
  error: string | null;
}

const MenuPlanner: React.FC<MenuPlannerProps> = ({ allIngredients, flavorMap }) => {
  // Initialize state
  const [state, setState] = useState<MenuPlannerState>({
    mode: 'wizard',
    wizardState: {
      step: 1,
      keyIngredient: '',
      dishCount: 3,
      dishTypes: ['entree', 'side', 'salad'],
      restrictions: []
    },
    currentMenu: null,
    activeTab: 'overview',
    isGenerating: false,
    error: null
  });

  // Create ingredient profile map for quick lookups
  const [ingredientProfileMap, setIngredientProfileMap] = useState(() => 
    createIngredientProfileMap(allIngredients)
  );

  // Update ingredient profile map when allIngredients changes
  useEffect(() => {
    setIngredientProfileMap(createIngredientProfileMap(allIngredients));
  }, [allIngredients]);

  // Handle mode selection
  const handleModeChange = (mode: 'wizard' | 'interactive') => {
    setState(prevState => ({
      ...prevState,
      mode
    }));
  };

  // Handle wizard state updates
  const updateWizardState = (updates: Partial<WizardState>) => {
    setState(prevState => ({
      ...prevState,
      wizardState: {
        ...prevState.wizardState,
        ...updates
      }
    }));
  };

  // Generate menu from wizard inputs
  const generateMenu = () => {
    setState(prevState => ({ ...prevState, isGenerating: true, error: null }));

    try {
      const { keyIngredient, dishTypes, restrictions } = state.wizardState;
      
      const menu = autoGenerateMenu(
        keyIngredient,
        dishTypes,
        allIngredients,
        flavorMap,
        ingredientProfileMap,
        restrictions
      );
      
      setState(prevState => ({
        ...prevState,
        currentMenu: menu,
        mode: 'interactive', // Switch to interactive mode after generation
        isGenerating: false
      }));
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        isGenerating: false,
        error: error instanceof Error ? error.message : 'Failed to generate menu'
      }));
    }
  };

  // Handle menu updates
  const updateMenu = (menu: Menu) => {
    setState(prevState => ({
      ...prevState,
      currentMenu: menu
    }));
  };

  // Reset to wizard mode
  const resetToWizard = () => {
    setState(prevState => ({
      ...prevState,
      mode: 'wizard',
      wizardState: {
        ...prevState.wizardState,
        step: 1
      }
    }));
  };

  return (
    <div className="menu-planner w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Menu Planner</h1>
      
      <ModeSelector mode={state.mode} onChange={handleModeChange} />
      
      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {state.error}
        </div>
      )}
      
      {state.mode === 'wizard' ? (
        <WizardInterface
          state={state.wizardState}
          onChange={updateWizardState}
          onComplete={generateMenu}
          isGenerating={state.isGenerating}
          allIngredients={allIngredients}
        />
      ) : (
        <InteractiveBuilder
          initialMenu={state.currentMenu}
          onChange={updateMenu}
          onRestart={resetToWizard}
          allIngredients={allIngredients}
          flavorMap={flavorMap}
          ingredientProfileMap={ingredientProfileMap}
        />
      )}
    </div>
  );
};

export default MenuPlanner;
