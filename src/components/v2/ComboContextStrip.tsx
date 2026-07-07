import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Pill } from './ui/Pill.tsx';
import { getLoadedContext, loadContext } from '../../utils/contextLoader.ts';
import { tagDisplayLabel } from '../../utils/tagLabels.ts';

// A quiet two-liner beneath the hero combo answering "what am I looking at?" —
// dish-type/cuisine/method tags plus concrete recipe receipts, all mined offline
// from the recipe corpus (see utils/pairingContext.ts).
//
// Cuisine and dish-type tags are clickable: clicking one STEERS generation — the
// parent restricts the flavor graph to edges carrying that tag, so Generate
// shuffles ingredients while staying inside (say) Mexican or desserts. The active
// steer renders as a pinned pill with an ✕ to clear. Method tags are display-only.
//
// Renders nothing for combos with <2 ingredients or no mined context (unless a
// steer is active, which must stay clearable), so it is safe to mount always.
export const ComboContextStrip = ({
  ingredients,
  isMobile = false,
  steer = null,
  onSteerChange = null,
}) => {
  const valid = ingredients.filter(Boolean);
  const comboKey = valid.join('|');
  // The context data is ~250 KB gzipped and rides in an async chunk; the module
  // lives in state so a mount that races the load re-renders when it lands.
  const [mod, setMod] = useState(() => getLoadedContext());

  useEffect(() => {
    if (!mod) loadContext().then(setMod);
  }, [mod]);

  const ctx = useMemo(
    // Pass the active steer so the "seen in" receipts are filtered to titles that
    // actually carry the steered tag (empty under steer → line hidden, never a
    // contradicting fallback).
    () => (mod && valid.length >= 2 ? mod.getComboContext(valid, steer) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comboKey, mod, steer?.group, steer?.tag]
  );

  if (!ctx && !steer) return null;

  // Keep it to a glance: cuisine first (it orients fastest), then dish types.
  // Method tags only get a slot when dish types are scarce.
  const tagItems: Array<{ tag: string; group: 'cuisine' | 'dish' | 'method' }> = [];
  if (ctx) {
    ctx.cuisines.slice(0, 1).forEach(t => tagItems.push({ tag: t, group: 'cuisine' }));
    ctx.dishTypes.slice(0, 2).forEach(t => tagItems.push({ tag: t, group: 'dish' }));
    if (ctx.dishTypes.length < 2) {
      ctx.methods.slice(0, 1).forEach(t => tagItems.push({ tag: t, group: 'method' }));
    }
  }
  // The active steer is pinned as its own pill — don't repeat it in the tag list.
  const visibleTags = tagItems.filter(
    it => !(steer && it.group === steer.group && it.tag === steer.tag)
  );
  const titles = ctx ? ctx.titles.slice(0, isMobile ? 1 : 2) : [];
  if (!steer && visibleTags.length === 0 && titles.length === 0) return null;

  return (
    <div className={`flex ${isMobile ? 'justify-start' : 'justify-center'} px-4 pb-4`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={comboKey + (steer ? `|${steer.group}:${steer.tag}` : '')}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className={`${isMobile ? 'text-left' : 'text-center'} text-sm leading-relaxed text-gray-500 dark:text-gray-400 max-w-2xl`}
        >
          <div className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${isMobile ? 'justify-start' : 'justify-center'}`}>
            {steer && (
              <Pill
                size="sm"
                active
                onClick={() => onSteerChange?.(null)}
                className="!px-2.5 !py-0.5 !text-xs"
                aria-label={`Stop steering toward ${tagDisplayLabel(steer.tag)}`}
              >
                {tagDisplayLabel(steer.tag)}
                <X size={12} strokeWidth={2.5} />
              </Pill>
            )}
            {visibleTags.map((it, i) => (
              <React.Fragment key={`${it.group}:${it.tag}`}>
                {(i > 0 || steer) && <span className="opacity-50" aria-hidden="true">·</span>}
                {it.group !== 'method' && onSteerChange ? (
                  <button
                    onClick={() => onSteerChange({ group: it.group, tag: it.tag })}
                    className="underline decoration-transparent hover:decoration-current underline-offset-4 transition-[text-decoration-color] duration-200"
                    title={`Steer Generate toward ${tagDisplayLabel(it.tag)}`}
                  >
                    {tagDisplayLabel(it.tag)}
                  </button>
                ) : (
                  <span>{tagDisplayLabel(it.tag)}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          {titles.length > 0 && (
            <p>
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
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ComboContextStrip;
