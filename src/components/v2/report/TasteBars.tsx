import React from 'react';
import { TASTE_COLORS } from '../../../utils/colors.ts';
import { TasteKey } from '../../../utils/recipeAnalysis.ts';

// Aggregate 7-dim taste balance of the report's core. Descriptive only — no
// "needs more acid" prescriptions (that's judgment the map doesn't hold).
// Pure props — reused verbatim by the extension side panel.

interface TasteBarsProps {
  profile: Record<TasteKey, number>;
}

export const TasteBars: React.FC<TasteBarsProps> = ({ profile }) => (
  <div className="flex flex-col gap-1">
    {(Object.keys(TASTE_COLORS) as TasteKey[]).map(k => (
      <div key={k} className="flex items-center gap-2">
        <span className="w-20 text-[12px] text-gray-500 dark:text-gray-400 capitalize">{k}</span>
        <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${(profile[k] / 10) * 100}%`,
              backgroundColor: TASTE_COLORS[k],
            }}
          />
        </div>
        <span className="w-7 text-right text-[12px] tabular-nums text-gray-400 dark:text-gray-500">
          {profile[k]}
        </span>
      </div>
    ))}
  </div>
);

export default TasteBars;
