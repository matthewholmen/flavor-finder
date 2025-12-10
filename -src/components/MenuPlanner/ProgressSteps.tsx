import React from 'react';

interface ProgressStepsProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressSteps: React.FC<ProgressStepsProps> = ({ currentStep, totalSteps }) => {
  // Create array of step numbers
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);

  return (
    <div className="flex mb-6">
      {steps.map(step => (
        <div 
          key={step}
          className="flex flex-1 items-center"
        >
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === currentStep 
                ? 'bg-blue-500 text-white'
                : step < currentStep
                  ? 'bg-blue-100 text-blue-500'
                  : 'bg-gray-200 text-gray-500'
            }`}
          >
            {step}
          </div>
          {step < totalSteps && (
            <div 
              className={`flex-1 h-1 ${
                step < currentStep ? 'bg-blue-500' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default ProgressSteps;
