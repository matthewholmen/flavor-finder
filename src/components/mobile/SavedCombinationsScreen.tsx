import React, { useState } from 'react';
import { Search, Plus, Clock, Edit2, Trash2, Play, Copy, X } from 'lucide-react';
import { useSavedCombinations, SavedCombination } from '../../hooks/useSavedCombinations';

interface SavedCombinationsScreenProps {
  onLoadCombination: (ingredients: string[]) => void;
  currentIngredients: string[];
  onSaveCurrent?: () => void;
}

interface CombinationCardProps {
  combination: SavedCombination;
  onLoad: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function CombinationCard({ combination, onLoad, onEdit, onDelete, onDuplicate }: CombinationCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-3 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 text-lg mb-1">{combination.name}</h3>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Clock size={14} className="mr-1" />
            <span>Last used {formatDate(combination.lastUsed)}</span>
          </div>
        </div>
        <button
          onClick={() => setShowActions(!showActions)}
          className="p-2 text-gray-400 hover:text-gray-600"
        >
          {showActions ? <X size={20} /> : <Edit2 size={20} />}
        </button>
      </div>

      {/* Ingredients list */}
      <div className="flex flex-wrap gap-1 mb-3">
        {combination.ingredients.map((ingredient, index) => (
          <span
            key={index}
            className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full"
          >
            {ingredient}
          </span>
        ))}
      </div>

      {/* Tags */}
      {combination.tags && combination.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {combination.tags.map((tag, index) => (
            <span
              key={index}
              className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {combination.notes && (
        <p className="text-sm text-gray-600 mb-3 italic">"{combination.notes}"</p>
      )}

      {/* Action buttons */}
      {showActions ? (
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onEdit}
            className="flex items-center justify-center py-2 px-3 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
          >
            <Edit2 size={16} className="mr-1" />
            <span className="text-sm">Edit</span>
          </button>
          <button
            onClick={onDuplicate}
            className="flex items-center justify-center py-2 px-3 text-green-600 border border-green-200 rounded-lg hover:bg-green-50"
          >
            <Copy size={16} className="mr-1" />
            <span className="text-sm">Copy</span>
          </button>
          <button
            onClick={onDelete}
            className="flex items-center justify-center py-2 px-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-1" />
            <span className="text-sm">Delete</span>
          </button>
        </div>
      ) : (
        <button
          onClick={onLoad}
          className="w-full flex items-center justify-center py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          <Play size={20} className="mr-2" />
          Load Combination
        </button>
      )}
    </div>
  );
}

export default function SavedCombinationsScreen({ 
  onLoadCombination, 
  currentIngredients,
  onSaveCurrent 
}: SavedCombinationsScreenProps) {
  const { 
    combinations, 
    loadCombination, 
    deleteCombination, 
    duplicateCombination, 
    searchCombinations,
    saveCombination 
  } = useSavedCombinations();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCombination, setEditingCombination] = useState<SavedCombination | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');

  const filteredCombinations = searchQuery 
    ? searchCombinations(searchQuery) 
    : combinations;

  const handleLoad = (id: string) => {
    const ingredients = loadCombination(id);
    if (ingredients.length > 0) {
      onLoadCombination(ingredients);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this combination?')) {
      deleteCombination(id);
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateCombination(id);
  };

  const handleSaveCurrent = () => {
    if (currentIngredients.length === 0) return;
    
    const defaultName = `Combination ${combinations.length + 1}`;
    setNewCombinationName(defaultName);
    setShowSaveDialog(true);
  };

  const confirmSave = () => {
    if (currentIngredients.length > 0 && newCombinationName.trim()) {
      saveCombination(newCombinationName.trim(), currentIngredients);
      setShowSaveDialog(false);
      setNewCombinationName('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Saved Combinations
          </h1>
          {currentIngredients.length > 0 && (
            <button
              onClick={handleSaveCurrent}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus size={16} className="mr-1" />
              Save Current
            </button>
          )}
        </div>
        
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search combinations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-4 overflow-y-auto">
        {filteredCombinations.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus size={24} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No matches found' : 'No saved combinations'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? `No combinations match "${searchQuery}"`
                : 'Save your favorite ingredient combinations for quick access'
              }
            </p>
            {!searchQuery && currentIngredients.length > 0 && (
              <button
                onClick={handleSaveCurrent}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
              >
                Save Current Combination
              </button>
            )}
          </div>
        ) : (
          <div className="pb-16">
            {filteredCombinations.map((combination) => (
              <CombinationCard
                key={combination.id}
                combination={combination}
                onLoad={() => handleLoad(combination.id)}
                onEdit={() => setEditingCombination(combination)}
                onDelete={() => handleDelete(combination.id)}
                onDuplicate={() => handleDuplicate(combination.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-medium mb-4">Save Combination</h2>
            <input
              type="text"
              placeholder="Enter name..."
              value={newCombinationName}
              onChange={(e) => setNewCombinationName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmSave}
                disabled={!newCombinationName.trim()}
                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
