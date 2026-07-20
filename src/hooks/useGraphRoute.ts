// hooks/useGraphRoute.ts
//
// URL routing for the Graph Explorer overlay: `?graph=<name>` opens the Atlas-view force
// graph centered on that ingredient, deep-linkable and shareable. Mirrors useAtlasRoute
// exactly (same pushState/popstate history model) but on its own param, so the two
// overlays are independent and a shared combo link can carry either on top.
//
// History model: the overlay occupies at most ONE history entry. The first in-app
// openGraph pushes; every re-center after that (hop → hop) replaces in place, so the
// browser Back button always closes the whole overlay in one press and returns to the
// exact pre-open screen — never a walk back through visited centers (Matt's July 2026
// back-nav complaint). A cold-open deep link pushed nothing, so closing it strips the
// param via replaceState instead of navigating back out of the app.

import { useCallback, useEffect, useRef, useState } from 'react';
import { OVERLAY_ROUTE_SYNC } from './overlayRouteSync.ts';

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
    // Overlay handoffs (swapOverlayParam) rewrite the URL via replaceState, which fires
    // no popstate — re-read the param when told to. If our param was swapped away, the
    // current entry now belongs to the other overlay, so forget our pushed-entry count
    // (a later close must not history.go() past entries we no longer own).
    const onSync = () => {
      const value = readGraphParam();
      if (value === null) pushDepth.current = 0;
      setGraphIngredient(value);
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener(OVERLAY_ROUTE_SYNC, onSync);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener(OVERLAY_ROUTE_SYNC, onSync);
    };
  }, []);

  const openGraph = useCallback((name: string) => {
    const canonical = name.trim().toLowerCase();
    if (!canonical) return;
    const params = new URLSearchParams(window.location.search);
    // Re-centering an already-open overlay replaces the current entry instead of
    // pushing a new one — the overlay stays a single Back-press deep no matter how
    // many hops the user makes inside it.
    const alreadyOpen = params.get(GRAPH_PARAM) !== null;
    params.set(GRAPH_PARAM, canonical);
    const url = `${window.location.pathname}?${params.toString()}`;
    if (alreadyOpen) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
      pushDepth.current += 1;
    }
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
