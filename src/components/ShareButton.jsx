import React, { useState } from 'react';
import { Share, Check } from 'lucide-react';

/**
 * Share button component for sharing ingredient combinations
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Function to call when button is clicked
 * @param {boolean} props.disabled - Whether the button is disabled
 */
const ShareButton = ({ onClick, disabled }) => {
  const [isClicked, setIsClicked] = useState(false);
  
  const handleClick = () => {
    if (disabled) return;
    
    onClick();
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 2000);
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md 
                 transition-colors
                 ${isClicked 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-[#6AAFE8] text-white hover:bg-[#5A9ED6]'} 
                 disabled:opacity-50 disabled:cursor-not-allowed`}
      aria-label="Share combination"
    >
      {isClicked ? (
        <>
          <Check size={16} />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Share size={16} />
          <span>Share</span>
        </>
      )}
    </button>
  );
};

export default ShareButton;
