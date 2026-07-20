import { TASTE_COLORS } from '@app/utils/colors.ts';
import { ingredientProfiles } from '@app/data/ingredientProfiles.ts';

// Dominant-taste accent per ingredient — the same rule the app's graph pills
// and ingredientColors.ts use: highest flavorProfile dimension wins, mapped
// through TASTE_COLORS. Undefined (neutral pill) when there's no profile or
// the profile is all zeros.
const accents = new Map<string, string>();
for (const profile of ingredientProfiles) {
  const fp = profile.flavorProfile as Record<string, number> | undefined;
  if (!fp) continue;
  let dominant: string | null = null;
  let max = 0;
  for (const [taste, value] of Object.entries(fp)) {
    if (typeof value === 'number' && value > max) {
      max = value;
      dominant = taste;
    }
  }
  const color = dominant
    ? TASTE_COLORS[dominant as keyof typeof TASTE_COLORS]
    : undefined;
  if (color) accents.set(profile.name.toLowerCase(), color);
}

export const tasteAccent = (name: string): string | undefined =>
  accents.get(name.toLowerCase());
