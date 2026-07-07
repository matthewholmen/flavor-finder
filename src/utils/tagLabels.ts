// User-facing relabels for a few mined steer tags whose canonical spelling is
// clunky in the UI. The canonical tag (a CONTEXT_DISH_TYPES / CONTEXT_CUISINES
// entry) is deliberately left UNCHANGED — it still keys the steering subgraph
// and the "seen in" receipts. This map only prettifies what the user reads on
// the steer pill and in landing search hits, so display and data stay decoupled.
//
// Kept as a tiny standalone module (not in the lazily-loaded context chunk) so
// it can be imported statically wherever a tag is shown.
const TAG_DISPLAY: Record<string, string> = {
  'sandwiches & burgers': 'sandwiches',
};

/** The label to show a user for a steer tag (falls back to the tag itself). */
export const tagDisplayLabel = (tag: string): string => TAG_DISPLAY[tag] ?? tag;
