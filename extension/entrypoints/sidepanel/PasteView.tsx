import React, { useState } from 'react';

// Paste fallback — the panel's equivalent of the web app's PasteRecipeModal
// capture step, for pages with no structured recipe data.
interface PasteViewProps {
  hint: string | null;
  onAnalyze: (text: string) => void;
}

export const PasteView: React.FC<PasteViewProps> = ({ hint, onAnalyze }) => {
  const [text, setText] = useState('');

  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {hint ??
          'Drop in an ingredient list (or a whole recipe) and see how it hangs together on the flavor map.'}
      </p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={10}
        placeholder={'2 tablespoons olive oil\n3 cloves garlic, minced\n1 bunch fresh basil…'}
        aria-label="Recipe text"
        className="w-full rounded-2xl p-4 text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
      />
      <button
        onClick={() => text.trim() && onAnalyze(text)}
        disabled={!text.trim()}
        className="mt-3 w-full py-3 rounded-full font-semibold bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Analyze
      </button>
    </div>
  );
};
