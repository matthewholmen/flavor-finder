import React, { useEffect, useId, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle } from 'lucide-react';
import { LineMatch } from '@app/utils/recipeIngredientMatcher.ts';
import { splitCoreSupporting } from '@app/utils/recipeAnalysis.ts';
import { getAtlasGraph } from '@app/utils/atlas.ts';
import type { RecipeReportState } from '@app/hooks/useRecipeRoute.ts';

// Confirm chips — the same trust contract as the web app's PasteRecipeModal:
// confident matches preselected, fuzzy hits wait for an explicit tap, and
// unmatched lines are flagged with a fix-up picker, never silently dropped.

interface Candidate {
  name: string;
  fuzzy: boolean;
}

interface ConfirmViewProps {
  title: string;
  lines: LineMatch[];
  onBack: () => void;
  onOpenReport: (state: RecipeReportState) => void;
}

const SECTION_LABEL =
  'text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500';

/** Datalist-based assign control for unrecognized lines. */
const ResolveInput: React.FC<{
  options: string[];
  onPick: (name: string) => void;
}> = ({ options, onPick }) => {
  const [value, setValue] = useState('');
  const listId = useId();
  return (
    <span className="shrink-0">
      <input
        list={listId}
        value={value}
        onChange={e => {
          const v = e.target.value;
          setValue(v);
          if (options.includes(v)) {
            onPick(v);
            setValue('');
          }
        }}
        placeholder="Assign…"
        aria-label="Assign an ingredient"
        className="w-28 px-2.5 py-1 rounded-full text-[13px] bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400"
      />
      <datalist id={listId}>
        {options.map(o => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </span>
  );
};

export const ConfirmView: React.FC<ConfirmViewProps> = ({
  title,
  lines,
  onBack,
  onOpenReport,
}) => {
  /** Manual assignments for unmatched lines, keyed by line index. */
  const [manual, setManual] = useState<Record<number, string>>({});
  const [included, setIncluded] = useState<Set<string>>(new Set());

  const allIngredients = useMemo(
    () => [...getAtlasGraph().keys()].sort(),
    []
  );

  // Preselect confident core; fuzzy hits wait for an explicit tap
  // (same rule as PasteRecipeModal.handleAnalyze).
  useEffect(() => {
    const names = new Map<string, boolean>(); // name -> fuzzy
    for (const l of lines) {
      if (l.match) {
        const prev = names.get(l.match.canonical);
        names.set(l.match.canonical, prev === false ? false : l.match.needsConfirm);
      }
    }
    const { core } = splitCoreSupporting([...names.keys()]);
    setManual({});
    setIncluded(new Set(core.filter(n => names.get(n) === false)));
  }, [lines]);

  const candidates = useMemo((): Candidate[] => {
    const seen = new Map<string, Candidate>();
    lines.forEach((l, i) => {
      const name = manual[i] ?? l.match?.canonical;
      if (!name) return;
      const fuzzy = manual[i] ? false : !!l.match?.needsConfirm;
      const prev = seen.get(name);
      if (!prev) seen.set(name, { name, fuzzy });
      else if (prev.fuzzy && !fuzzy) prev.fuzzy = false;
    });
    return [...seen.values()];
  }, [lines, manual]);

  const split = useMemo(
    () => splitCoreSupporting(candidates.map(c => c.name)),
    [candidates]
  );

  const staples = useMemo(() => {
    const seen = new Set<string>();
    for (const l of lines) {
      if (!l.match && l.staple) seen.add(l.staple);
    }
    return [...seen];
  }, [lines]);

  const unmatched = useMemo(
    () =>
      lines
        .map((line, index) => ({ line, index }))
        .filter(
          ({ line, index }) =>
            !line.isGroupHeader &&
            !line.match &&
            !line.staple &&
            !manual[index] &&
            line.raw.trim() !== ''
        ),
    [lines, manual]
  );

  const toggle = (name: string) =>
    setIncluded(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const includedList = useMemo(
    () => candidates.map(c => c.name).filter(n => included.has(n)),
    [candidates, included]
  );
  const reportReady = includedList.length >= 2;

  const chip = (name: string, opts: { muted?: boolean; fuzzy?: boolean } = {}) => {
    const active = included.has(name);
    return (
      <button
        key={name}
        onClick={() => toggle(name)}
        aria-pressed={active}
        title={opts.fuzzy && !active ? 'Best guess — tap to confirm' : undefined}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium border-2 transition-all duration-150 ${
          active
            ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : opts.fuzzy
              ? 'border-dashed border-amber-400 text-amber-700 dark:text-amber-400'
              : `border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 ${opts.muted ? '' : 'line-through'}`
        }`}
      >
        {opts.fuzzy && !active && <HelpCircle size={13} aria-hidden="true" />}
        {name}
      </button>
    );
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 mb-3 text-sm font-medium text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ArrowLeft size={15} aria-hidden="true" />
        Start over
      </button>

      {title && (
        <h2 className="text-base font-bold font-display tracking-tight text-gray-900 dark:text-white mb-1 leading-snug">
          {title}
        </h2>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
        Found these in the flavor map — tap to include or leave out.
      </p>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {split.core.map(name =>
          chip(name, { fuzzy: candidates.find(c => c.name === name)?.fuzzy })
        )}
      </div>

      {(split.supporting.length > 0 || staples.length > 0) && (
        <div className="mb-4">
          <h3 className={`${SECTION_LABEL} mb-2`}>Supporting cast</h3>
          <div className="flex flex-wrap gap-1.5 items-center">
            {split.supporting.map(name => chip(name, { muted: true }))}
            {staples.map(label => (
              <span
                key={label}
                title="Pantry staple — not a flavor-map ingredient"
                className="px-3 py-1 rounded-full text-[13px] text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800/80"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {unmatched.length > 0 && (
        <div className="mb-4">
          <h3 className={`${SECTION_LABEL} mb-2`}>Didn’t recognize</h3>
          <ul className="flex flex-col gap-2">
            {unmatched.map(({ line, index }) => (
              <li key={index} className="flex items-center justify-between gap-2">
                <span className="text-[13px] text-gray-500 dark:text-gray-400 truncate">
                  “{line.raw}”
                </span>
                <ResolveInput
                  options={allIngredients}
                  onPick={name => {
                    setManual(prev => ({ ...prev, [index]: name }));
                    setIncluded(prev => new Set(prev).add(name));
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() =>
          reportReady &&
          onOpenReport({
            ...(title ? { t: title } : {}),
            c: includedList,
            s: split.supporting.filter(n => !included.has(n)),
          })
        }
        disabled={!reportReady}
        className="mt-2 w-full py-3 rounded-full font-semibold inline-flex items-center justify-center gap-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        See the flavor report
        <ArrowRight size={17} aria-hidden="true" />
      </button>
    </div>
  );
};
