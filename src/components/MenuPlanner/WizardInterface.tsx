import React from 'react';
import { DishType, DietaryRestriction } from '../../utils/menuPlanner';
import KeyIngredientSelector from './KeyIngredientSelector';
import DishConfigSelector from './DishConfigSelector';
import DietaryRestrictions from './DietaryRestrictions';
import ReviewAndGenerate from './ReviewAndGenerate';
import ProgressSteps from './ProgressSteps';
import { IngredientProfile } from '../../types';

interface WizardState {
  step: number;
  keyIngredient: string;
  dishCount: number;
  dishTypes: DishType[];
  restrictions: DietaryRestriction[];
}

interface WizardInterfaceProps {
  state: WizardState;
  onChange: (updatedState: Partial<WizardState>) => void;
  onComplete: () => void;
  isGenerating: boolean;
  allIngredients: IngredientProfile[];
}

const WizardInterface: React.FC<WizardInterfaceProps> = ({
  state,
  onChange,
  onComplete,
  isGenerating,
  allIngredients
}) => {
  // Helper to update state
  const updateState = (updates: Partial<WizardState>) => {
    onChange(updates);
  };
  
  // Navigation helpers
  const nextStep = () => {
    updateState({ step: state.step + 1 });
  };
  
  const prevStep = () => {
    updateState({ step: Math.max(1, state.step - 1) });
  };
  
  // Progress indicator component is imported
  
  // Render current step
  const renderCurrentStep = () => {
    switch(state.step) {
      case 1:
        return (
          <KeyIngredientSelector 
            value={state.keyIngredient}
            onChange={(keyIngredient) => updateState({ keyIngredient })}
            onNext={nextStep}
            allIngredients={allIngredients}
          />
        );
      case 2:
        return (
          <DishConfigSelector
            types={state.dishTypes}
            count={state.dishCount}
            onChange={(dishTypes, dishCount) => updateState({ dishTypes, dishCount })}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 3:
        return (
          <DietaryRestrictions
            selected={state.restrictions}
            onChange={(restrictions) => updateState({ restrictions })}
            onNext={nextStep}
            onBack={prevStep}
          />
        );
      case 4:
        return (
          <ReviewAndGenerate
            state={state}
            onGenerate={onComplete}
            onBack={prevStep}
            isGenerating={isGenerating}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="wizard-container border rounded-lg bg-white p-6">
      <ProgressSteps currentStep={state.step} totalSteps={4} />
      {renderCurrentStep()}
    </div>
  );
};

export default WizardInterface;
