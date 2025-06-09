import React from 'react';

interface ModeSelectorProps {
  mode: 'wizard' | 'interactive';
  onChange: (mode: 'wizard' | 'interactive') => void;
}

const ModeSelector: React.FC<ModeSelectorProps> = ({ mode, onChange }) => {
  return (
    <div className="flex justify-end mb-4">
      <div className="bg-gray-100 rounded-lg p-1 inline-flex">
        <button
          className={`px-3 py-2 rounded-md text-sm ${
            mode === 'wizard' 
              ? 'bg-white shadow-sm' 
              : 'text-gray-600'
          }`}
          onClick={() => onChange('wizard')}
        >
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="3" />
              <path d="M8.5 2H14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-.5" />
              <path d="M15.423 6L16.7 14.37c.12.78.623 1.341 1.177 1.345h1.69c.551 0 1.06-.511 1.206-1.282L22.5 6" />
              <path d="M9 10h1" />
              <path d="M4 15h10.5" />
              <path d="M4 18h10" />
              <path d="M4 21h6" />
            </svg>
          </span>
          Guided
        </button>
        <button
          className={`px-3 py-2 rounded-md text-sm ${
            mode === 'interactive' 
              ? 'bg-white shadow-sm' 
              : 'text-gray-600'
          }`}
          onClick={() => onChange('interactive')}
        >
          <span className="inline-block mr-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </span>
          Advanced
        </button>
      </div>
    </div>
  );
};

export default ModeSelector;
