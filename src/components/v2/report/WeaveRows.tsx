import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { WeaveRow } from '../../../utils/recipeAnalysis.ts';

// The weave: per-ingredient connection rows, most- to least-woven (the recipe-scale
// replacement for a pair-chip wall — FLAVOR_REPORT_DESIGN §2.2). Rows start collapsed
// (Matt's call); tapping expands the confirmed/unexplored partner lists. Pure props —
// reused verbatim by the extension side panel.

interface WeaveRowsProps {
  rows: WeaveRow[];
}

export const WeaveRows: React.FC<WeaveRowsProps> = ({ rows }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const max = rows.length > 0 ? rows[0].confirmed.length + rows[0].unexplored.length : 0;

  const toggle = (name: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <ul className="flex flex-col">
      {rows.map(row => {
        const isOpen = expanded.has(row.name);
        const total = row.confirmed.length + row.unexplored.length;
        return (
          <li key={row.name} className="border-b border-gray-100 dark:border-gray-700/60 last:border-b-0">
            <button
              onClick={() => toggle(row.name)}
              aria-expanded={isOpen}
              aria-label={`${row.name} — ${row.confirmed.length} of ${total} pairings confirmed`}
              className="w-full flex items-center gap-3 py-2 text-left group"
            >
              <span className="w-28 shrink-0 truncate text-sm font-medium text-gray-900 dark:text-white">
                {row.name}
              </span>
              <span className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <span
                  className="block h-full rounded-full bg-gray-900 dark:bg-white"
                  style={{ width: total > 0 ? `${(row.confirmed.length / Math.max(max, 1)) * 100}%` : 0 }}
                />
              </span>
              <span className="w-16 shrink-0 text-right text-[12px] tabular-nums text-gray-400 dark:text-gray-500">
                {row.confirmed.length} of {total}
              </span>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className={`shrink-0 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {isOpen && (
              <div className="pb-3 pl-1 text-[13px] leading-relaxed">
                {row.confirmed.length > 0 && (
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-medium text-gray-900 dark:text-white">Pairs with:</span>{' '}
                    {row.confirmed.join(', ')}
                  </p>
                )}
                {row.unexplored.length > 0 && (
                  <p className="text-gray-400 dark:text-gray-500">
                    <span className="font-medium">Unexplored with:</span>{' '}
                    {row.unexplored.join(', ')} — not wrong, just uncharted
                  </p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default WeaveRows;
