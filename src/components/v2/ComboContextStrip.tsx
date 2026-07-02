import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// The mined context data is ~250 KB gzipped, so it's loaded as an async chunk after
// first paint rather than riding in the main bundle. The strip renders nothing until
// the module arrives — indistinguishable from a combo that has no context.
let contextModule = null;
let contextPromise = null;
const loadContextModule = () => {
  if (!contextPromise) {
    contextPromise = import('../../utils/pairingContext.ts').then(m => { contextModule = m; return m; });
  }
  return contextPromise;
};

// A quiet one-liner beneath the hero combo answering "what am I looking at?" —
// dish-type/cuisine/method tags plus a couple of concrete recipe titles, all mined
// offline from the recipe corpus (see utils/pairingContext.ts). Pure annotation:
// it reads the combo, never influences generation.
//
// Renders nothing for combos with <2 ingredients or no mined context, so it is
// safe to mount unconditionally.
export const ComboContextStrip = ({ ingredients, isMobile = false }) => {
  const valid = ingredients.filter(Boolean);
  const comboKey = valid.join('|');
  // The module lives in state (not just the module-level cache) so a mount that races
  // the async load re-renders when it lands, and hot reloads recover cleanly.
  const [mod, setMod] = useState(() => contextModule);

  useEffect(() => {
    if (!mod) loadContextModule().then(setMod);
  }, [mod]);

  const ctx = useMemo(
    () => (mod && valid.length >= 2 ? mod.getComboContext(valid) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comboKey, mod]
  );

  if (!ctx) return null;

  // Keep it to a glance: a few tags, cuisine first (it orients fastest), then a
  // couple of receipts. Method tags only get a slot when dish types are scarce.
  const tags = [
    ...ctx.cuisines.slice(0, 1),
    ...ctx.dishTypes.slice(0, 2),
    ...(ctx.dishTypes.length < 2 ? ctx.methods.slice(0, 1) : []),
  ];
  const titles = ctx.titles.slice(0, isMobile ? 1 : 2);
  if (tags.length === 0 && titles.length === 0) return null;

  return (
    <div className={`flex justify-center px-4 ${isMobile ? 'pb-3' : 'pb-4'}`}>
      <AnimatePresence mode="wait">
        <motion.p
          key={comboKey}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="text-center text-sm leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl"
        >
          {tags.join(' · ')}
          {tags.length > 0 && titles.length > 0 && <span className="mx-2 opacity-60">—</span>}
          {titles.length > 0 && (
            <>
              <span className="opacity-75">seen in </span>
              {titles.map((t, i) => (
                <React.Fragment key={t}>
                  {i > 0 && ', '}
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(`${t} recipe`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display italic text-gray-600 dark:text-gray-300 underline decoration-transparent hover:decoration-current underline-offset-4 transition-[text-decoration-color] duration-200"
                  >
                    “{t}”
                  </a>
                </React.Fragment>
              ))}
            </>
          )}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default ComboContextStrip;
