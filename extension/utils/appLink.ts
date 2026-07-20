import { encodeRecipeState } from '@app/utils/urlEncoding.js';
import type { RecipeReportState } from '@app/hooks/useRecipeRoute.ts';

/** The live web app — handoff target for deep links. */
export const APP_URL = 'https://flavor-finder-kappa.vercel.app/';

/** Full Flavor Report in the web app (uncapped, same ?recipe= route). */
export const reportUrl = (state: RecipeReportState): string =>
  `${APP_URL}?recipe=${encodeRecipeState(state)}`;

/** Per-ingredient reference page. */
export const atlasUrl = (name: string): string =>
  `${APP_URL}?atlas=${encodeURIComponent(name)}`;
