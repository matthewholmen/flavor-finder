import React, { useEffect, useMemo, useState } from 'react';
import { X, Map, Sparkles, Link as LinkIcon, Check } from 'lucide-react';
import {
  computeWeave,
  substitutesInRecipe,
  aggregateTaste,
} from '../../../utils/recipeAnalysis.ts';
import { getAtlasGraph } from '../../../utils/atlas.ts';
import { encodeRecipeState } from '../../../utils/urlEncoding.js';
import { RecipeReportState } from '../../../hooks/useRecipeRoute.ts';
import { MAX_SLOTS } from '../../../hooks/useSlots.ts';
import { WeaveRows } from './WeaveRows.tsx';
import { TasteBars } from './TasteBars.tsx';
import { SwapList } from './SwapList.tsx';

// The Flavor Report — recipe-scale analysis, UNCAPPED (FLAVOR_REPORT_DESIGN).
// A full-screen overlay in the Atlas/Graph genre: dense, small-type, sectioned,
// deep-linked via ?recipe=. Narrow-first single column so the same components
// serve the extension side panel unchanged.
//
// The MAX_SLOTS cap lives only in "Riff on this" — framed as focus, not a wall.
// Coverage stays counts + weave; unexplored is never rendered as wrong.

interface FlavorReportProps {
  state: RecipeReportState | null;
  onClose: () => void;
  /** Open ≤ MAX_SLOTS picks as a normal combo. */
  onRiff: (names: string[]) => void;
  /** Seed the Graph Explorer with the whole recipe (picks are uncapped there). */
  onViewMap: (names: string[]) => void;
}

const SECTION_LABEL =
  'text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500';

export const FlavorReport: React.FC<FlavorReportProps> = ({
  state,
  onClose,
  onRiff,
  onViewMap,
}) => {
  const [core, setCore] = useState<string[]>([]);
  const [supporting, setSupporting] = useState<string[]>([]);
  const [riffPicks, setRiffPicks] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  // Sync local promote/demote state from the route payload, dropping any name the
  // current flavor map doesn't know (stale links degrade gracefully).
  useEffect(() => {
    if (!state) return;
    const g = getAtlasGraph();
    setCore(state.c.filter(n => g.has(n)));
    setSupporting(state.s.filter(n => g.has(n)));
    setCopied(false);
  }, [state]);

  const weave = useMemo(() => computeWeave(core), [core]);

  // Riff preselect: the MAX_SLOTS most-woven core (Matt's call). Re-derived when
  // the core changes; user taps refine from there.
  useEffect(() => {
    setRiffPicks(new Set(weave.slice(0, MAX_SLOTS).map(r => r.name)));
  }, [weave]);

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

  useEffect(() => {
    if (!state) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [state, onClose]);

  if (!state) return null;

  const demote = (name: string) => {
    setCore(prev => prev.filter(n => n !== name));
    setSupporting(prev => [...prev, name]);
  };
  const promote = (name: string) => {
    setSupporting(prev => prev.filter(n => n !== name));
    setCore(prev => [...prev, name]);
  };

  const toggleRiff = (name: string) =>
    setRiffPicks(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else if (next.size < MAX_SLOTS) next.add(name);
      return next;
    });

  const handleShare = () => {
    const encoded = encodeRecipeState({ t: state.t, c: core, s: supporting });
    const url = `${window.location.origin}${window.location.pathname}?recipe=${encoded}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const riffList = weave.map(r => r.name).filter(n => riffPicks.has(n));

  return (
    <div
      className="fixed inset-0 z-[80] bg-white dark:bg-gray-900 flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Flavor report"
    >
      {/* Header bar */}
      <header className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0">
          <h1 className="text-lg font-bold font-display tracking-tight text-gray-900 dark:text-white truncate">
            Flavor report
          </h1>
          <p className="text-[12px] text-gray-400 dark:text-gray-500 truncate">
            {state.t ? `${state.t} — ` : ''}
            {core.length} core · {supporting.length} supporting
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleShare}
            aria-label="Copy report link"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            {copied ? <Check size={18} /> : <LinkIcon size={18} />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close report"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Narrow-first single column (the extension panel layout) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="mx-auto w-full max-w-lg px-4 sm:px-0 py-5 flex flex-col gap-6">
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
                <h2 className={SECTION_LABEL}>The weave</h2>
                <span className="text-[12px] text-gray-400 dark:text-gray-500">
                  {confirmedPairs} of {totalPairs} pairings confirmed
                </span>
              </div>
              <WeaveRows rows={weave} />
              <button
                onClick={() => onViewMap(core)}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Map size={15} aria-hidden="true" />
                View as map
              </button>
            </section>
          )}

          {/* Taste balance */}
          {core.length > 0 && (
            <section aria-label="Taste balance">
              <h2 className={`${SECTION_LABEL} mb-2`}>Taste balance</h2>
              <TasteBars profile={taste} />
            </section>
          )}

          {/* Swaps */}
          <section aria-label="Swap ideas">
            <h2 className={`${SECTION_LABEL} mb-1`}>Swap ideas</h2>
            <SwapList entries={swapEntries} />
          </section>

          {/* Riff */}
          {core.length > 0 && (
            <section aria-label="Riff on this" className="pb-6">
              <h2 className={`${SECTION_LABEL} mb-1`}>Riff on this</h2>
              <p className="text-[13px] text-gray-400 dark:text-gray-500 mb-2">
                Pick up to {MAX_SLOTS} to remix in the combo builder — the most-woven
                are preselected.
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {weave.map(({ name }) => {
                  const active = riffPicks.has(name);
                  return (
                    <button
                      key={name}
                      onClick={() => toggleRiff(name)}
                      aria-pressed={active}
                      className={`px-2.5 py-1 rounded-full text-[13px] font-medium border transition-colors ${
                        active
                          ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                          : 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => riffList.length > 0 && onRiff(riffList)}
                disabled={riffList.length === 0}
                className="w-full py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Sparkles size={17} aria-hidden="true" />
                Open as combo{riffList.length > 0 ? ` (${riffList.length})` : ''}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default FlavorReport;
