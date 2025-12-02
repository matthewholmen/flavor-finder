import React from 'react';
import { Search, Heart, Settings } from 'lucide-react';

interface BottomNavigationProps {
  activeTab: 'discover' | 'saved' | 'settings';
  onTabChange: (tab: 'discover' | 'saved' | 'settings') => void;
}

export default function BottomNavigation({ activeTab, onTabChange }: BottomNavigationProps) {
  const tabs = [
    {
      id: 'discover' as const,
      icon: Search,
      label: 'Discover',
      iconSize: 24
    },
    {
      id: 'saved' as const,
      icon: Heart,
      label: 'Saved',
      iconSize: 24
    },
    {
      id: 'settings' as const,
      icon: Settings,
      label: 'Settings',
      iconSize: 24
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 md:hidden">
      <div className="grid grid-cols-3 h-16">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center h-full transition-colors ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <IconComponent size={tab.iconSize} />
              <span className={`text-xs mt-1 font-medium ${
                isActive ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
