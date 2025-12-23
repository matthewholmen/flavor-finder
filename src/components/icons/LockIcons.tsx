import React from 'react';

interface LockIconProps {
  color: string;
  size?: string | number;
}

/**
 * Custom Lock icon with white-filled body for better visibility
 * Used to indicate locked/pinned ingredients
 */
export const FilledLock: React.FC<LockIconProps> = ({ color, size = '100%' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ width: size, height: size }}
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="white" />
    <rect
      x="3" y="11" width="18" height="11" rx="2" ry="2"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    <path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
  </svg>
);

/**
 * Custom Unlock icon matching the FilledLock style
 * Used to indicate unlocked ingredients (hover state)
 */
export const CustomUnlock: React.FC<LockIconProps> = ({ color, size = '100%' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ width: size, height: size }}
  >
    <rect
      x="3" y="11" width="18" height="11" rx="2" ry="2"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
    <path
      d="M7 11V7a5 5 0 0 1 9.9-1"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"
    />
  </svg>
);
