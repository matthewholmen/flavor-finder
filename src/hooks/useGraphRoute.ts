// hooks/useGraphRoute.ts
//
// URL routing for the Graph Explorer overlay: `?graph=<name>` opens the Atlas-view force
// graph centered on that ingredient, deep-linkable and shareable. Mirrors useAtlasRoute
// exactly (same pushState/popstate history model) but on its own param, so the two
// overlays are independent and a shared combo link can carry either on top.
//
// History model: each openGraph while the app is running pushes an entry, so in-graph
// re-centering (hop → hop) chains and browser Back walks back through visited centers
// before closing. A cold-open deep link pushed nothing, so closing it strips the param
// via replaceState instead of navigating back out of the app.

import { useCallback, useEffect, useRef, useState } from 'react';

const GRAPH_PARAM = 'graph';

const readGraphParam = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get(GRAPH_PARAM);
  return value ? value.trim().toLowerCase() : null;
};

export interface GraphRoute {
  /** Ingredient the Graph Explorer is centered on, or null when closed. */
  graphIngredient: string | null;
  openGraph: (name: string) => void;
  closeGraph: () => void;
}

export const useGraphRoute = (): GraphRoute => {
  const [graphIngredient, setGraphIngredient] = useState<string | null>(readGraphParam);
  // History entries this session has pushed that are still "ahead" of the pre-graph
  // state. 0 means the current entry wasn't pushed by us (cold-open link).
  const pushDepth = useRef(0);

  useEffect(() => {
    const onPopState = () => {
      pushDepth.current = Math.max(0, pushDepth.current - 1);
      setGraphIngredient(readGraphParam());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const openGraph = useCallback((name: string) => {
    const canonical = name.trim().toLowerCase();
    if (!canonical) return;
    const params = new URLSearchParams(window.location.search);
    params.set(GRAPH_PARAM, canonical);
    window.history.pushState(null, '', `${window.location.pathname}?${params.toString()}`);
    pushDepth.current += 1;
    setGraphIngredient(canonical);
  }, []);

  const closeGraph = useCallback(() => {
    if (pushDepth.current > 0) {
      const depth = pushDepth.current;
      pushDepth.current = 0;
      window.history.go(-depth);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete(GRAPH_PARAM);
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
    setGraphIngredient(null);
  }, []);

  return { graphIngredient, openGraph, closeGraph };
};
