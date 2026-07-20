// hooks/useAtlasRoute.ts
//
// URL routing for the Ingredient Atlas overlay: `?atlas=<name>` opens the page for that
// ingredient, deep-linkable and shareable. This is the app's only pushState/popstate
// integration — kept self-contained here. Other params (`ing`, `lab`, `sources`) are
// preserved when opening, so a shared combo link can carry an open Atlas page on top.
//
// History model: the overlay occupies at most ONE history entry (mirrors useGraphRoute).
// The first in-app openAtlas pushes; in-Atlas navigation (friend → friend) replaces in
// place, so hardware/browser Back always closes the whole overlay in one press. A
// cold-open deep link pushed nothing, so closing it strips the param via replaceState
// instead of navigating back out of the app.

import { useCallback, useEffect, useRef, useState } from 'react';
import { OVERLAY_ROUTE_SYNC } from './overlayRouteSync.ts';

const ATLAS_PARAM = 'atlas';

const readAtlasParam = (): string | null => {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get(ATLAS_PARAM);
  return value ? value.trim().toLowerCase() : null;
};

export interface AtlasRoute {
  /** Ingredient whose Atlas page is open, or null when closed. */
  atlasIngredient: string | null;
  openAtlas: (name: string) => void;
  closeAtlas: () => void;
}

export const useAtlasRoute = (): AtlasRoute => {
  const [atlasIngredient, setAtlasIngredient] = useState<string | null>(readAtlasParam);
  // How many history entries this session has pushed that are still "ahead" of the
  // pre-Atlas state. 0 means the current entry wasn't pushed by us (cold-open link).
  const pushDepth = useRef(0);

  useEffect(() => {
    const onPopState = () => {
      pushDepth.current = Math.max(0, pushDepth.current - 1);
      setAtlasIngredient(readAtlasParam());
    };
    // Overlay handoffs (swapOverlayParam) rewrite the URL via replaceState, which fires
    // no popstate — re-read the param when told to. If our param was swapped away, the
    // current entry now belongs to the other overlay, so forget our pushed-entry count
    // (a later close must not history.go() past entries we no longer own).
    const onSync = () => {
      const value = readAtlasParam();
      if (value === null) pushDepth.current = 0;
      setAtlasIngredient(value);
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener(OVERLAY_ROUTE_SYNC, onSync);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener(OVERLAY_ROUTE_SYNC, onSync);
    };
  }, []);

  const openAtlas = useCallback((name: string) => {
    const canonical = name.trim().toLowerCase();
    if (!canonical) return;
    const params = new URLSearchParams(window.location.search);
    // In-Atlas navigation replaces the current entry — one Back press always closes
    // the overlay entirely (same rule as useGraphRoute).
    const alreadyOpen = params.get(ATLAS_PARAM) !== null;
    params.set(ATLAS_PARAM, canonical);
    const url = `${window.location.pathname}?${params.toString()}`;
    if (alreadyOpen) {
      window.history.replaceState(null, '', url);
    } else {
      window.history.pushState(null, '', url);
      pushDepth.current += 1;
    }
    setAtlasIngredient(canonical);
  }, []);

  const closeAtlas = useCallback(() => {
    if (pushDepth.current > 0) {
      // Close means fully out, even after chained in-Atlas navigation — jump past every
      // entry we pushed (Back, by contrast, steps through them one page at a time).
      // The single popstate that follows syncs state from the restored URL.
      const depth = pushDepth.current;
      pushDepth.current = 0;
      window.history.go(-depth);
      return;
    }
    const params = new URLSearchParams(window.location.search);
    params.delete(ATLAS_PARAM);
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      query ? `${window.location.pathname}?${query}` : window.location.pathname
    );
    setAtlasIngredient(null);
  }, []);

  return { atlasIngredient, openAtlas, closeAtlas };
};
