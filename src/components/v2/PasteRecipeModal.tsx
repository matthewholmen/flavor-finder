import React, { useEffect, useMemo, useState } from 'react';
import { X, ArrowLeft, HelpCircle, ArrowRight } from 'lucide-react';
import {
  matchRecipeText,
  LineMatch,
} from '../../utils/recipeIngredientMatcher.ts';
import { splitCoreSupporting } from '../../utils/recipeAnalysis.ts';
import { RecipeReportState } from '../../hooks/useRecipeRoute.ts';

// Paste-a-recipe: the "start from a real recipe" doorway (EXTENSION_PLAN X2 + X2.5).
// This modal only CAPTURES and CONFIRMS: paste ingredient lines → the matcher
// resolves canonical names → confirmable chips → hand off to the Flavor Report
// (uncapped, FLAVOR_REPORT_DESIGN). The analysis itself lives in the report.

interface PasteRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Full canonical ingredient list, for manually resolving unmatched lines. */
  allIngredients: string[];
  /** Open the Flavor Report for the confirmed cast (no ingredient cap). */
  onOpenReport: (state: RecipeReportState) => void;
}

/** One canonical hit and how much we trust it. */
interface Candidate {
  name: string;
  fuzzy: boolean;
  /** First raw line it came from — shown as the chip's receipt. */
  fromLine: string;
}

// Tiny inline resolver for lines the matcher couldn't place: type-to-filter over
// the canonical vocabulary, pick to assign. Deliberately minimal (not SearchBar —
// this lives inside a modal list row).
const ResolveInput: React.FC<{
  allIngredients: string[];
  onPick: (name: string) => void;
}> = ({ allIngredients, onPick }) => {
  const [term, setTerm] = useState('');
  const hits = useMemo(() => {
    const q = term.trim().toLowerCase();
    if (q.length < 2) return [];
    const starts: string[] = [];
    const contains: string[] = [];
    for (const ing of allIngredients) {
      const lower = ing.toLowerCase();
      if (lower.startsWith(q)) starts.push(ing);
      else if (lower.includes(q)) contains.push(ing);
    }
    return [...starts, ...contains].slice(0, 5);
  }, [term, allIngredients]);

  return (
    <div className="relative">
      <input
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder="Pick an ingredient…"
        aria-label="Assign an ingredient to this line"
        className="
          w-40 px-2.5 py-1 rounded-lg text-sm
          bg-gray-100 dark:bg-gray-700
          text-gray-900 dark:text-white
          placeholder:text-gray-400 dark:placeholder:text-gray-500
          focus:outline-none focus:ring-2 focus:ring-gray-400
        "
      />
      {hits.length > 0 && (
        <div className="absolute z-10 mt-1 w-48 rounded-xl bg-white dark:bg-gray-700 shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          {hits.map(name => (
            <button
              key={name}
              onClick={() => onPick(name)}
              className="block w-full text-left px-3 py-1.5 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const PasteRecipeModal: React.FC<PasteRecipeModalProps> = ({
  isOpen,
  onClose,
  allIngredients,
  onOpenReport,
}) => {
  const [text, setText] = useState('');
  const [lines, setLines] = useState<LineMatch[] | null>(null);
  /** Manual assignments for unmatched lines, keyed by line index. */
  const [manual, setManual] = useState<Record<number, string>>({});
  /** Names currently included in the analysis (and the combo handoff). */
  const [included, setIncluded] = useState<Set<string>>(new Set());

  // Fresh slate each open.
  useEffect(() => {
    if (isOpen) {
      setText('');
      setLines(null);
      setManual({});
      setIncluded(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Distinct canonical candidates across auto matches + manual assignments.
  const candidates = useMemo((): Candidate[] => {
    if (!lines) return [];
    const seen = new Map<string, Candidate>();
    lines.forEach((l, i) => {
      const name = manual[i] ?? l.match?.canonical;
      if (!name) return;
      const fuzzy = manual[i] ? false : !!l.match?.needsConfirm;
      const prev = seen.get(name);
      if (!prev) seen.set(name, { name, fuzzy, fromLine: l.raw });
      else if (prev.fuzzy && !fuzzy) prev.fuzzy = false;
    });
    return [...seen.values()];
  }, [lines, manual]);

  const split = useMemo(
    () => splitCoreSupporting(candidates.map(c => c.name)),
    [candidates]
  );

  const staples = useMemo(() => {
    if (!lines) return [];
    const seen = new Set<string>();
    for (const l of lines) {
      if (!l.match && l.staple) seen.add(l.staple);
    }
    return [...seen];
  }, [lines]);

  const unmatched = useMemo(() => {
    if (!lines) return [];
    return lines
      .map((l, i) => ({ line: l, index: i }))
      .filter(
        ({ line, index }) =>
          !line.isGroupHeader && !line.match && !line.staple && !manual[index] &&
          line.raw.trim() !== ''
      );
  }, [lines, manual]);

  const handleAnalyze = () => {
    if (!text.trim()) return;
    const parsed = matchRecipeText(text);
    setLines(parsed);
    // Preselect confident core; fuzzy hits wait for an explicit tap.
    const names = new Map<string, boolean>(); // name -> fuzzy
    for (const l of parsed) {
      if (l.match) {
        const prev = names.get(l.match.canonical);
        names.set(l.match.canonical, prev === false ? false : l.match.needsConfirm);
      }
    }
    const { core } = splitCoreSupporting([...names.keys()]);
    setIncluded(new Set(core.filter(n => names.get(n) === false)));
  };

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

  if (!isOpen) return null;

  const reportReady = includedList.length >= 2;

  const chip = (name: string, opts: { muted?: boolean; fuzzy?: boolean } = {}) => {
    const active = included.has(name);
    return (
      <button
        key={name}
        onClick={() => toggle(name)}
        aria-pressed={active}
        title={opts.fuzzy && !active ? 'Best guess — tap to confirm' : undefined}
        className={`
          inline-flex items-center gap-1.5
          px-3.5 py-1.5 rounded-full text-sm font-medium
          border-2 transition-all duration-150
          ${active
            ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
            : opts.fuzzy
              ? 'border-dashed border-amber-400 text-amber-700 dark:text-amber-400'
              : `border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 ${opts.muted ? '' : 'line-through'}`
          }
        `}
      >
        {opts.fuzzy && !active && <HelpCircle size={14} aria-hidden="true" />}
        {name}
      </button>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Paste a recipe"
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      <div
        className="
          relative w-full sm:max-w-xl
          max-h-[85vh] overflow-y-auto
          bg-white dark:bg-gray-800
          rounded-t-3xl sm:rounded-3xl
          shadow-2xl
          p-6 sm:p-8
          animate-modal-in
        "
      >
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4
            w-9 h-9 rounded-full
            flex items-center justify-center
            text-gray-400 hover:text-gray-600 hover:bg-gray-100
            dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-700
            transition-colors
          "
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 font-display tracking-tight">
          Paste a recipe
        </h2>

        {!lines ? (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Drop in an ingredient list (or a whole recipe) and see how it hangs
              together on the flavor map.
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={10}
              placeholder={'2 tablespoons olive oil\n3 cloves garlic, minced\n1 bunch fresh basil…'}
              aria-label="Recipe text"
              className="
                w-full rounded-2xl p-4 text-sm leading-relaxed
                bg-gray-50 dark:bg-gray-900/40
                border border-gray-200 dark:border-gray-600
                text-gray-900 dark:text-white
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                focus:outline-none focus:ring-2 focus:ring-gray-400
                resize-none
              "
            />
            <button
              onClick={handleAnalyze}
              disabled={!text.trim()}
              className="
                mt-4 w-full py-3 rounded-full font-semibold
                bg-gray-900 dark:bg-white text-white dark:text-gray-900
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90 transition-opacity
              "
            >
              Analyze
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setLines(null)}
              className="
                inline-flex items-center gap-1 mb-4
                text-sm font-medium text-gray-400 dark:text-gray-500
                hover:text-gray-700 dark:hover:text-gray-300 transition-colors
              "
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Edit text
            </button>

            {/* The flavor ingredients — tap to include/exclude */}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Found these in the flavor map — tap to include or leave out.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {split.core.map(name =>
                chip(name, {
                  fuzzy: candidates.find(c => c.name === name)?.fuzzy,
                })
              )}
            </div>

            {/* Supporting cast: staples + ubiquitous canonicals (promotable) */}
            {(split.supporting.length > 0 || staples.length > 0) && (
              <div className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Supporting cast
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  {split.supporting.map(name => chip(name, { muted: true }))}
                  {staples.map(label => (
                    <span
                      key={label}
                      title="Pantry staple — not a flavor-map ingredient"
                      className="px-3 py-1 rounded-full text-sm text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700/60"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Lines we couldn't place — pick or skip, never silently dropped */}
            {unmatched.length > 0 && (
              <div className="mb-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">
                  Didn't recognize
                </h3>
                <ul className="flex flex-col gap-2">
                  {unmatched.map(({ line, index }) => (
                    <li key={index} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        “{line.raw}”
                      </span>
                      <ResolveInput
                        allIngredients={allIngredients}
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

            {/* Handoff — the analysis lives in the (uncapped) Flavor Report */}
            <button
              onClick={() =>
                reportReady &&
                onOpenReport({
                  c: includedList,
                  s: split.supporting.filter(n => !included.has(n)),
                })
              }
              disabled={!reportReady}
              className="
                mt-5 w-full py-3 rounded-full font-semibold
                inline-flex items-center justify-center gap-2
                bg-gray-900 dark:bg-white text-white dark:text-gray-900
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90 transition-opacity
              "
            >
              See the flavor report
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PasteRecipeModal;
