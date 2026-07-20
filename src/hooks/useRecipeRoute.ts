// hooks/useRecipeRoute.ts
//
// URL routing for the Flavor Report overlay: `?recipe=<base64url>` opens the report
// for that recipe, deep-linkable and shareable (FLAVOR_REPORT_DESIGN §4). Mirrors
// useAtlasRoute's one-history-entry model, minus in-overlay navigation (a report
// never navigates to another report). The payload carries canonical names + title
// only — never pasted text. Other overlays (?graph=, ?atlas=) preserve unknown
// params, so the map can stack on top of an open report and Back returns to it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { encodeRecipeState, decodeRecipeState } from '../utils/urlEncoding.js';

const RECIPE_PARAM = 'recipe';

/** The report's shareable state. Short keys keep the URL compact. */
export interface RecipeReportState {
  /** Optional recipe title. */
  t?: string;
  /** Core (flavor-identity) canonical names. */
  c: string[];
  /** Supporting-cast canonical names (promotable in the report). */
  s: string[];
}

const isValidState = (v: unknown): v is RecipeReportState => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    Array.isArray(o.c) && o.c.every(x => typeof x === 'string') &&
    Array.isArray(o.s) && o.s.every(x => typeof x === 'string')
  );
};

const readRecipeParam = (): RecipeReportState | null => {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(RECIPE_PARAM);
  if (!raw) return null;
  const decoded = decodeRecipeState(raw);
  return isValidState(decoded) ? decoded : null;
};

export interface RecipeRoute {
  /** Open report's state, or null when closed. */
  recipeState: RecipeReportState | null;
  openRecipeReport: (state: RecipeReportState) => void;
  closeRecipeReport: () => void;
}

export const useRecipeRoute = (): RecipeRoute => {
  const [recipeState, setRecipeState] = useState<RecipeReportState | null>(readRecipeParam);
  // 0 = the current entry wasn't pushed by us (cold-open deep link).
  const pushDepth = useRef(0);

  useEffect(() => {
    const onPopState = () => {
      pushDepth.current = Math.max(0, pushDepth.current - 1);
      setRecipeState(readRecipeParam());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openRecipeReport = useCallback((state: RecipeReportState) => {
    const encoded = encodeRecipeState(state);
    if (!encoded) return;
    const params = new URLSearchParams(window.location.search);
    const alreadyOpen = params.get(RECIPE_PARAM) !== null;
    params.set(RECIPE_PARAM, encoded);
    const url = `${window.location.pathname}?${params.toString()}`;
    if (alreadyOpen) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
      pushDepth.current += 1;
    }
    setRecipeState(state);
  }, []);

  const closeRecipeReport = useCallback(() => {
    if (pushDepth.current > 0) {
      const depth = pushDepth.current;
      pushDepth.current = 0;
      window.history.go(-depth);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete(RECIPE_PARAM);
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
    setRecipeState(null);
  }, []);

  return { recipeState, openRecipeReport, closeRecipeReport };
};
