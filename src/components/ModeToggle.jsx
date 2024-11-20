import React from 'react';
import { HelpCircle } from 'lucide-react';

const ModeToggle = ({ isExperimental, onToggle }) => {
  return (
    <div className="flex items-center gap-2">
      <button
        role="switch"
        aria-checked={isExperimental}
        onClick={() => onToggle(!isExperimental)}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isExperimental ? 'bg-blue-600' : 'bg-gray-200'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${isExperimental ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      <span className="text-sm font-medium">
        Experimental Mode
      </span>
      <div className="group relative">
        <HelpCircle className="w-4 h-4 text-gray-500 cursor-help" />
        <div className="invisible group-hover:visible absolute left-1/2 bottom-full mb-2 -translate-x-1/2 px-3 py-2 text-sm bg-gray-900 text-white rounded-lg whitespace-nowrap">
          Includes additional, less traditional flavor combinations
        </div>
      </div>
    </div>
  );
};

export default ModeToggle;