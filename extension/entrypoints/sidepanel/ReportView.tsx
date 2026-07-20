import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, ExternalLink, Link as LinkIcon } from 'lucide-react';
import {
  aggregateTaste,
  computeWeave,
  substitutesInRecipe,
} from '@app/utils/recipeAnalysis.ts';
import { getAtlasGraph } from '@app/utils/atlas.ts';
import type { RecipeReportState } from '@app/hooks/useRecipeRoute.ts';
import { WeaveRows } from '@app/components/v2/report/WeaveRows.tsx';
import { TasteBars } from '@app/components/v2/report/TasteBars.tsx';
import { SwapList } from '@app/components/v2/report/SwapList.tsx';
import { reportUrl } from '../../utils/appLink';

// The panel's flavor report — composes the SAME pure report components the
// web app's FlavorReport overlay uses (WeaveRows / TasteBars / SwapList), in
// the same narrow single-column layout they were designed for. The riff
// picker stays in the web app; "Open in Flavor Finder" hands the full cast
// over via the uncapped ?recipe= deep link.

interface ReportViewProps {
  state: RecipeReportState;
  onBack: () => void;
}

const SECTION_LABEL =
  'text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500';

export const ReportView: React.FC<ReportViewProps> = ({ state, onBack }) => {
  const [core, setCore] = useState<string[]>([]);
  const [supporting, setSupporting] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const g = getAtlasGraph();
    setCore(state.c.filter(n => g.has(n)));
    setSupporting(state.s.filter(n => g.has(n)));
    setCopied(false);
  }, [state]);

  const weave = useMemo(() => computeWeave(core), [core]);
  const taste = useMemo(() => aggregateTaste(core), [core]);
  const swapEntries = useMemo(
    () => weave.map(r => ({ name: r.name, subs: substitutesInRecipe(r.name, core, 4) })),
    [weave, core]
  );
  const confirmedPairs = useMemo(
    () => weave.reduce((sum, r) => sum + r.confirmed.length, 0) / 2,
    [weave]
  );
  const totalPairs = (core.length * (core.length - 1)) / 2;

  const demote = (name: string) => {
    setCore(prev => prev.filter(n => n !== name));
    setSupporting(prev => [...prev, name]);
  };
  const promote = (name: string) => {
    setSupporting(prev => prev.filter(n => n !== name));
    setCore(prev => [...prev, name]);
  };

  const currentState: RecipeReportState = {
    ...(state.t ? { t: state.t } : {}),
    c: core,
    s: supporting,
  };

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(reportUrl(currentState))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <ArrowLeft size={15} aria-hidden="true" />
          Back
        </button>
        <button
          onClick={handleCopyLink}
          aria-label="Copy report link"
          title="Copy a link to this report"
          className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        >
          {copied ? <Check size={17} /> : <LinkIcon size={17} />}
        </button>
      </div>

      <div>
        <h2 className="text-base font-bold font-display tracking-tight text-gray-900 dark:text-white">
          Flavor report
        </h2>
        <p className="text-[12px] text-gray-400 dark:text-gray-500 truncate">
          {state.t ? `${state.t} — ` : ''}
          {core.length} core · {supporting.length} supporting
        </p>
      </div>

      {/* Cast */}
      <section aria-label="Ingredients">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {core.map(name => (
            <button
              key={name}
              onClick={() => demote(name)}
              title="Tap to move to supporting"
              aria-label={`${name} — move to supporting`}
              className="px-2.5 py-1 rounded-full text-[13px] font-medium border border-gray-900 dark:border-white text-gray-900 dark:text-white"
            >
              {name}
            </button>
          ))}
        </div>
        {supporting.length > 0 && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className={SECTION_LABEL}>Supporting</span>
            {supporting.map(name => (
              <button
                key={name}
                onClick={() => promote(name)}
                title="Tap to promote to core"
                aria-label={`${name} — promote to core`}
                className="px-2.5 py-1 rounded-full text-[13px] border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500"
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* The weave */}
      {core.length >= 2 && (
        <section aria-label="The weave">
          <div className="flex items-baseline justify-between mb-1">
            <h3 className={SECTION_LABEL}>The weave</h3>
            <span className="text-[12px] text-gray-400 dark:text-gray-500">
              {confirmedPairs} of {totalPairs} pairings confirmed
            </span>
          </div>
          <WeaveRows rows={weave} />
        </section>
      )}

      {/* Taste balance */}
      {core.length > 0 && (
        <section aria-label="Taste balance">
          <h3 className={`${SECTION_LABEL} mb-2`}>Taste balance</h3>
          <TasteBars profile={taste} />
        </section>
      )}

      {/* Swaps */}
      <section aria-label="Swap ideas">
        <h3 className={`${SECTION_LABEL} mb-1`}>Swap ideas</h3>
        <SwapList entries={swapEntries} />
      </section>

      {/* Handoff to the full app: riff picker, map view, drink pairing live there */}
      <a
        href={reportUrl(currentState)}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity"
      >
        Open in Flavor Finder
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </div>
  );
};
