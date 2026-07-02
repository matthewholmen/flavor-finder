// utils/contextLoader.ts
//
// Shared lazy accessor for the mined pairing-context module (utils/pairingContext.ts and
// its ~1 MB generated data file). Everything context-related — the combo strip's display
// and the tag-steering filter — loads through this cache, so the data stays out of the
// main bundle and is fetched exactly once.

type ContextModule = typeof import('./pairingContext.ts');

let loaded: ContextModule | null = null;
let promise: Promise<ContextModule> | null = null;

/** The module if the chunk has already arrived, else null (kick off loadContext). */
export const getLoadedContext = (): ContextModule | null => loaded;

export const loadContext = (): Promise<ContextModule> => {
  if (!promise) {
    promise = import('./pairingContext.ts').then(m => {
      loaded = m;
      return m;
    });
  }
  return promise;
};
