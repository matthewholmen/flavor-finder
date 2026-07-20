import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  matchRecipeText,
  LineMatch,
} from '@app/utils/recipeIngredientMatcher.ts';
import type { RecipeReportState } from '@app/hooks/useRecipeRoute.ts';
import {
  extractRecipeFromPage,
  ExtractedRecipe,
  ExtractionRecord,
} from '../../utils/extractRecipe';
import { hasExtensionApis } from '../../utils/chromeEnv';
import { PasteView } from './PasteView.tsx';
import { ConfirmView } from './ConfirmView.tsx';
import { ReportView } from './ReportView.tsx';

// The side panel flow (FLAVOR_REPORT_DESIGN §5): extract → confirm chips →
// flavor report. Same matcher, same analysis, same report components as the
// web app — this file is only plumbing between them.

type Stage =
  | { kind: 'reading' }
  | { kind: 'paste'; hint: string | null }
  | { kind: 'confirm'; title: string; lines: LineMatch[] }
  | { kind: 'report'; state: RecipeReportState };

const App: React.FC = () => {
  const [stage, setStage] = useState<Stage>({ kind: 'reading' });
  const canReadPage = hasExtensionApis();

  const toConfirm = useCallback((title: string, rawLines: string[]) => {
    setStage({
      kind: 'confirm',
      title,
      lines: matchRecipeText(rawLines.join('\n')),
    });
  }, []);

  const applyRecord = useCallback(
    (record: ExtractionRecord) => {
      if (record.recipe) {
        toConfirm(record.recipe.title, record.recipe.lines);
      } else {
        setStage({
          kind: 'paste',
          hint: record.error
            ? 'Couldn’t read this page (Chrome blocks some pages) — paste the ingredients instead.'
            : 'No recipe found on this page — paste the ingredients instead.',
        });
      }
    },
    [toConfirm]
  );

  // The background extracts on toolbar click (the only moment the activeTab
  // grant is guaranteed) and stashes the result; the panel just consumes it.
  useEffect(() => {
    if (!canReadPage) {
      setStage({ kind: 'paste', hint: null });
      return;
    }
    chrome.storage.session
      .get('lastExtraction')
      .then(({ lastExtraction }) => {
        if (lastExtraction) applyRecord(lastExtraction as ExtractionRecord);
        else {
          setStage({
            kind: 'paste',
            hint: 'Click the Flavor Finder toolbar icon while on a recipe page, or paste the ingredients below.',
          });
        }
      })
      .catch(() => setStage({ kind: 'paste', hint: null }));
    const listener = (msg: unknown) => {
      const m = msg as { type?: string; record?: ExtractionRecord };
      if (m?.type === 'extraction' && m.record) applyRecord(m.record);
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [canReadPage, applyRecord]);

  // Manual re-read (↻): direct injection works while the icon-click grant for
  // this tab is still live; after navigation it needs a fresh icon click.
  const readPage = useCallback(async () => {
    if (!canReadPage) {
      setStage({ kind: 'paste', hint: null });
      return;
    }
    setStage({ kind: 'reading' });
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) throw new Error('no active tab');
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractRecipeFromPage,
      });
      applyRecord({
        at: Date.now(),
        recipe: (result?.result ?? null) as ExtractedRecipe | null,
      });
    } catch {
      setStage({
        kind: 'paste',
        hint: 'Couldn’t re-read this page — click the Flavor Finder toolbar icon while on the recipe, or paste the ingredients below.',
      });
    }
  }, [canReadPage, applyRecord]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="shrink-0 sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="min-w-0">
          <h1 className="text-lg font-bold font-display tracking-tight text-gray-900 dark:text-white">
            Flavor Finder
          </h1>
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            The flavor checker
          </p>
        </div>
        {canReadPage && (
          <button
            onClick={readPage}
            aria-label="Re-read this page"
            title="Re-read this page"
            className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-500 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={17} />
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-4">
        {stage.kind === 'reading' && (
          <p className="text-sm text-gray-400 dark:text-gray-500 animate-pulse">
            Reading this page…
          </p>
        )}

        {stage.kind === 'paste' && (
          <PasteView
            hint={stage.hint}
            onAnalyze={text => toConfirm('', text.split('\n'))}
          />
        )}

        {stage.kind === 'confirm' && (
          <ConfirmView
            title={stage.title}
            lines={stage.lines}
            onBack={() => setStage({ kind: 'paste', hint: null })}
            onOpenReport={state => setStage({ kind: 'report', state })}
          />
        )}

        {stage.kind === 'report' && (
          <ReportView
            state={stage.state}
            onBack={() => readPage()}
          />
        )}
      </main>
    </div>
  );
};

export default App;
