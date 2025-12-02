import React from 'react';
import { Settings, Info, Shield, HelpCircle } from 'lucide-react';

interface MobileSettingsScreenProps {
  onOpenDietarySettings: () => void;
}

export default function MobileSettingsScreen({ onOpenDietarySettings }: MobileSettingsScreenProps) {
  const appVersion = "1.0.0";

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {/* Dietary Preferences */}
        <div className="bg-white rounded-lg mb-4 shadow-sm">
          <button
            onClick={onOpenDietarySettings}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center">
              <Shield size={24} className="text-blue-600 mr-3" />
              <div className="text-left">
                <div className="font-medium text-gray-900">Dietary Preferences</div>
                <div className="text-sm text-gray-500">Manage dietary restrictions</div>
              </div>
            </div>
            <div className="text-gray-400">›</div>
          </button>
        </div>

        {/* About Section */}
        <div className="bg-white rounded-lg mb-4 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center">
              <Info size={24} className="text-gray-600 mr-3" />
              <div>
                <div className="font-medium text-gray-900">About FlavorFinder</div>
                <div className="text-sm text-gray-500">Version {appVersion}</div>
              </div>
            </div>
          </div>
          
          <div className="p-4 text-sm text-gray-600 leading-relaxed">
            <p className="mb-3">
              FlavorFinder helps you discover amazing ingredient combinations using 
              advanced flavor pairing algorithms and a comprehensive database of culinary knowledge.
            </p>
            <p>
              Built with React and TypeScript, featuring real-time compatibility matching 
              and intelligent taste profile analysis.
            </p>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-white rounded-lg mb-4 shadow-sm">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <HelpCircle size={24} className="text-green-600 mr-3" />
              <div className="font-medium text-gray-900">How to Use</div>
            </div>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex">
                <span className="font-medium text-blue-600 mr-2">1.</span>
                <span>Tap "Add ingredient" to search and select ingredients</span>
              </div>
              <div className="flex">
                <span className="font-medium text-blue-600 mr-2">2.</span>
                <span>Use "Generate" to get random compatible combinations</span>
              </div>
              <div className="flex">
                <span className="font-medium text-blue-600 mr-2">3.</span>
                <span>Tap "Find Recipes" to search Google for recipes</span>
              </div>
              <div className="flex">
                <span className="font-medium text-blue-600 mr-2">4.</span>
                <span>Save your favorite combinations for quick access</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="bg-white rounded-lg mb-4 shadow-sm">
          <div className="p-4">
            <div className="flex items-center mb-3">
              <Shield size={24} className="text-purple-600 mr-3" />
              <div className="font-medium text-gray-900">Data & Privacy</div>
            </div>
            
            <div className="text-sm text-gray-600 space-y-2">
              <p>• All data is stored locally on your device</p>
              <p>• No personal information is collected</p>
              <p>• Saved combinations stay on your device</p>
              <p>• No analytics or tracking</p>
            </div>
          </div>
        </div>

        {/* App Info */}
        <div className="bg-white rounded-lg mb-6 shadow-sm">
          <div className="p-4 text-center">
            <div className="text-sm text-gray-500 mb-2">Made with ❤️ for food lovers</div>
            <div className="text-xs text-gray-400">
              © 2025 FlavorFinder. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
