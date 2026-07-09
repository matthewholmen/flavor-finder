// hooks/overlayRouteSync.ts
//
// Shared plumbing for the two overlay route hooks (useAtlasRoute, useGraphRoute).
//
// Why this exists: handing off from one overlay to the other ("Explore the map" on an
// Atlas page) must NOT be a close() followed by an open(). When the closing overlay was
// opened in-app, its close runs `history.go(-n)` — which is asynchronous — and the
// open()'s pushState races it: the deferred go() then navigates back past the fresh
// entry and the app lands on the bare home page. The fix is a single, synchronous
// replaceState that swaps one param for the other, plus a custom event that tells both
// hooks to re-read the URL (replaceState fires no popstate of its own).

export const OVERLAY_ROUTE_SYNC = 'flavorfinder:overlay-route-sync';

/** Swap overlay params in one synchronous history operation: drop `dropParam`, set
 *  `setParam=value`, then notify every route hook to re-sync from the URL. */
export const swapOverlayParam = (dropParam: string, setParam: string, value: string): void => {
  const canonical = value.trim().toLowerCase();
  if (!canonical) return;
  const params = new URLSearchParams(window.location.search);
  params.delete(dropParam);
  params.set(setParam, canonical);
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  window.dispatchEvent(new Event(OVERLAY_ROUTE_SYNC));
};
