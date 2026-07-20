import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SubstituteSuggestion } from '../../../utils/suggestSubstitutes.ts';

// Per-ingredient swap ideas, collapsed rows. Suggestions come precomputed via
// substitutesInRecipe (confirmed-partner context — see FLAVOR_REPORT_DESIGN §3);
// shared texture/function chips are the ranking receipts. Pure props — reused
// verbatim by the extension side panel.

export interface SwapEntry {
  name: string;
  subs: SubstituteSuggestion[];
}

interface SwapListProps {
  entries: SwapEntry[];
}

export const SwapList: React.FC<SwapListProps> = ({ entries }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (name: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const withSubs = entries.filter(e => e.subs.length > 0);
  if (withSubs.length === 0) return null;

  return (
    <ul className="flex flex-col">
      {withSubs.map(({ name, subs }) => {
        const isOpen = expanded.has(name);
        return (
          <li key={name} className="border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
            <button
              onClick={() => toggle(name)}
              aria-expanded={isOpen}
              className="w-full flex items-center gap-3 py-2 text-left group"
            >
              <span className="flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">
                {name}
              </span>
              {!isOpen && (
                <span className="shrink-0 max-w-[55%] truncate text-[13px] text-gray-400 dark:text-gray-500">
                  {subs.map(s => s.name).join(', ')}
                </span>
              )}
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <ul className="pb-3 pl-1 flex flex-col gap-1.5">
                {subs.map(s => (
                  <li key={s.name} className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[13px] text-gray-700 dark:text-gray-200">{s.name}</span>
                    {[...s.sharedTextures, ...s.sharedFunctions].slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded-full text-[10px] uppercase tracking-wide bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default SwapList;
