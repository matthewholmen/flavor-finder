import React from 'react';
import { X } from 'lucide-react';
import { useScreenSize } from '../../hooks/useScreenSize.ts';

const shortcuts = [
  { key: 'space', action: 'generate' },
  { key: 'enter', action: 'search' },
  { key: '+', action: 'add ingredient' },
  { key: '-', action: 'remove ingredient' },
  { key: 'delete', action: 'delete last ingr.' },
  { key: 'z', action: 'undo' },
];

export const Sidebar = ({ isOpen, onClose }) => {
  const { isMobile } = useScreenSize();

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
          bg-gray-100
          shadow-lg
          z-[61]
          transition-transform duration-300 ease-in-out
          ${isMobile ? 'w-64' : 'w-80'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center justify-between ${isMobile ? 'px-4 py-3' : 'px-6 py-5'}`}>
            <div className="relative group cursor-pointer" onClick={onClose}>
              <img
                src="/flavor-finder-1.png"
                alt="ff"
                className={`w-auto ${isMobile ? 'h-6' : 'h-8'} transition-opacity duration-200 group-hover:opacity-0`}
              />
              <img
                src="/flavor-finder-1-hover.png"
                alt="ff"
                className={`absolute top-0 left-0 w-auto ${isMobile ? 'h-6' : 'h-8'} opacity-0 transition-opacity duration-200 group-hover:opacity-100`}
              />
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close sidebar"
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Shortcuts Section */}
          <div className={`${isMobile ? 'px-4 py-4' : 'px-6 py-6'}`}>
            <h2 className="text-gray-400 font-medium text-lg mb-4">Shortcuts</h2>
            <ul className="space-y-2">
              {shortcuts.map(({ key, action }) => (
                <li key={key} className="flex items-baseline gap-2">
                  <span className="font-bold text-gray-700">{key}</span>
                  <span className="text-gray-400">—</span>
                  <span className="text-gray-600">{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Settings link at bottom */}
          <div className={`${isMobile ? 'px-4 py-4' : 'px-6 py-6'}`}>
            <button className="text-gray-300 font-medium text-lg hover:text-gray-500 transition-colors">
              Settings
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
