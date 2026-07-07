import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Check, ChevronDown, FlaskConical, Link as LinkIcon, UtensilsCrossed, X } from 'lucide-react';
import { Pill } from './ui/Pill.tsx';
import { IconButton } from './ui/IconButton.tsx';
import {
  AtlasNeighbor,
  BEST_FRIENDS_PREVIEW,
  SEASONING_PREVIEW,
  getAtlasEntry,
} from '../../utils/atlas.ts';
import { getLoadedContext, loadContext } from '../../utils/contextLoader.ts';
import { CATEGORY_COLORS, TASTE_COLORS } from '../../utils/colors.ts';
import { categoryLabel } from '../../utils/categoryLabels.ts';

// The Ingredient Atlas: one ingredient, one page, its whole world of flavor. A
// read-only reference overlay assembled by utils/atlas.ts from the canonical
// graph — identity, best friends (with provenance), how to season it, and the
// full neighborhood organized by category. Deep-linked via ?atlas= and reachable
// from every surface that shows an ingredient name.
//
// Receipts ("seen in" titles) and recipe counts hydrate from the lazily-loaded
// context chunk (utils/contextLoader.ts) exactly like ComboContextStrip — this
// file must never import utils/pairingContext.ts statically.

interface IngredientAtlasProps {
  /** Ingredient whose page is open; null renders nothing. */
  ingredient: string | null;
  onClose: () => void;
  /** Navigate to another ingredient's page (pushes history via useAtlasRoute). */
  onNavigate: (name: string) => void;
  /** "Start a pairing from here" — seeds the generator with this ingredient locked. */
  onStartPairing: (name: string) => void;
  isMobile: boolean;
}

const TASTE_ORDER = ['sweet', 'salty', 'sour', 'umami', 'fat', 'spicy', 'aromatic'] as const;

const recipeSearchUrl = (title: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${title} recipe`)}`;

// --- Small shared pieces --------------------------------------------------------------

/** Provenance badges: chef canon (book) and corpus confirmation (recipes). The recipe
 *  count upgrades from a plain "recipes" badge once the context chunk arrives. */
const ProvenanceBadges: React.FC<{ neighbor: AtlasNeighbor; recipeCount: number | null }> = ({
  neighbor,
  recipeCount,
}) => (
  <span className="inline-flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
    {neighbor.isCanon && (
      <span className="inline-flex items-center gap-1" title="Listed in the chef canon">
        <BookOpen size={12} strokeWidth={2} aria-hidden="true" />
        chef canon
      </span>
    )}
    {neighbor.isCorpus && (
      <span
        className="inline-flex items-center gap-1"
        title="Confirmed in the recipe corpus"
      >
        <UtensilsCrossed size={12} strokeWidth={2} aria-hidden="true" />
        {recipeCount != null ? `${recipeCount} recipes` : 'recipes'}
      </span>
    )}
    {neighbor.isMolecular && (
      <span
        className="inline-flex items-center gap-1"
        title="Shares aroma compounds (food-science lens)"
      >
        <FlaskConical size={12} strokeWidth={2} aria-hidden="true" />
        shared aroma
      </span>
    )}
  </span>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-3">
    {children}
  </h3>
);

const ShowMoreButton: React.FC<{ expanded: boolean; count: number; onClick: () => void }> = ({
  expanded,
  count,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="mt-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline decoration-transparent hover:decoration-current underline-offset-4 transition-colors"
  >
    {expanded ? 'Show fewer' : `Show ${count} more`}
  </button>
);

// --- The overlay ----------------------------------------------------------------------

export const IngredientAtlas: React.FC<IngredientAtlasProps> = ({
  ingredient,
  onClose,
  onNavigate,
  onStartPairing,
  isMobile,
}) => {
  const entry = useMemo(() => (ingredient ? getAtlasEntry(ingredient) : null), [ingredient]);

  // Lazy context chunk for receipts + recipe counts (see ComboContextStrip).
  const [ctxMod, setCtxMod] = useState(() => getLoadedContext());
  useEffect(() => {
    if (ingredient && !ctxMod) loadContext().then(setCtxMod);
  }, [ingredient, ctxMod]);

  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [showAllSeasoning, setShowAllSeasoning] = useState(false);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // In-atlas navigation must feel like a new page: top of scroll, sections collapsed.
  useEffect(() => {
    setExpandedFriend(null);
    setShowAllFriends(false);
    setShowAllSeasoning(false);
    setCopied(false);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [ingredient]);

  useEffect(() => {
    if (!ingredient) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ingredient, onClose]);

  if (!ingredient) return null;

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}?atlas=${encodeURIComponent(
      ingredient
    )}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };

  const profile = entry?.profile ?? null;
  const accent = profile ? CATEGORY_COLORS[profile.category] : undefined;

  // Ordered section list — the P3 science lens slots in as one more element here.
  const sections: Array<{ key: string; node: React.ReactNode }> = entry
    ? [
        {
          key: 'identity',
          node: (
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="font-display font-black tracking-tight text-3xl sm:text-4xl text-gray-900 dark:text-white lowercase">
                  {entry.name}
                </h2>
                {profile && (
                  <Pill size="sm" accent={accent} className="!cursor-default pointer-events-none">
                    {categoryLabel(profile.category)}
                    <span className="opacity-60">·</span>
                    {profile.subcategory}
                  </Pill>
                )}
              </div>
              {profile && (
                <>
                  <div className="mt-5 space-y-1.5">
                    {TASTE_ORDER.map(taste => {
                      const value = profile.flavorProfile[taste] ?? 0;
                      return (
                        <div key={taste} className="flex items-center gap-3">
                          <span className="w-20 shrink-0 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {taste}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(10, Math.max(0, value)) * 10}%`,
                                backgroundColor: TASTE_COLORS[taste],
                              }}
                            />
                          </div>
                          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-gray-400 dark:text-gray-500">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {profile.description && (
                    <p className="mt-4 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                      {profile.description}
                    </p>
                  )}
                </>
              )}
              {entry.aroma.length > 0 && (
                <div className="mt-5">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    <FlaskConical size={13} strokeWidth={2} aria-hidden="true" />
                    aroma notes
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {entry.aroma.map(note => (
                      <span
                        key={note}
                        className="px-2.5 py-1 rounded-full text-xs lowercase bg-gray-100 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                    From shared flavor molecules (FlavorDB) — a food-science lens on what it smells and tastes like.
                  </p>
                </div>
              )}
            </div>
          ),
        },
        {
          key: 'best-friends',
          node:
            entry.bestFriends.length > 0 ? (
              <div>
                <SectionHeading>Best friends</SectionHeading>
                <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {entry.bestFriends
                    .slice(0, showAllFriends ? undefined : BEST_FRIENDS_PREVIEW)
                    .map(friend => {
                      const edgeCtx = ctxMod ? ctxMod.getEdgeContext(entry.name, friend.name) : null;
                      const isExpanded = expandedFriend === friend.name;
                      const titles = edgeCtx?.titles ?? [];
                      return (
                        <li key={friend.name} className="py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onNavigate(friend.name)}
                              className="font-medium text-gray-900 dark:text-white hover:underline underline-offset-4 lowercase text-left"
                            >
                              {friend.name}
                            </button>
                            <ProvenanceBadges
                              neighbor={friend}
                              recipeCount={edgeCtx ? edgeCtx.recipeCount : null}
                            />
                            <span className="flex-1" />
                            {friend.isCorpus && (
                              <IconButton
                                label={
                                  isExpanded
                                    ? `Hide recipes for ${friend.name}`
                                    : `Show recipes seen with ${friend.name}`
                                }
                                aria-expanded={isExpanded}
                                onClick={() =>
                                  setExpandedFriend(isExpanded ? null : friend.name)
                                }
                                className="!min-w-[36px] !min-h-[36px] rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
                              >
                                <ChevronDown
                                  size={16}
                                  strokeWidth={2}
                                  className={`transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              </IconButton>
                            )}
                          </div>
                          {isExpanded && (
                            <p className="mt-1 pl-0.5 text-sm text-gray-500 dark:text-gray-400">
                              {titles.length > 0 ? (
                                <>
                                  <span className="opacity-75">seen in </span>
                                  {titles.map((t, i) => (
                                    <React.Fragment key={t}>
                                      {i > 0 && ', '}
                                      <a
                                        href={recipeSearchUrl(t)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="font-display italic text-gray-600 dark:text-gray-300 underline decoration-transparent hover:decoration-current underline-offset-4 transition-[text-decoration-color] duration-200"
                                      >
                                        “{t}”
                                      </a>
                                    </React.Fragment>
                                  ))}
                                </>
                              ) : ctxMod ? (
                                'No recipe receipts for this pair.'
                              ) : (
                                'Loading recipe receipts…'
                              )}
                            </p>
                          )}
                        </li>
                      );
                    })}
                </ul>
                {entry.bestFriends.length > BEST_FRIENDS_PREVIEW && (
                  <ShowMoreButton
                    expanded={showAllFriends}
                    count={entry.bestFriends.length - BEST_FRIENDS_PREVIEW}
                    onClick={() => setShowAllFriends(v => !v)}
                  />
                )}
              </div>
            ) : null,
        },
        {
          key: 'seasoning',
          node:
            entry.seasoning.items.length > 0 ? (
              <div>
                <SectionHeading>
                  {entry.seasoning.variant === 'season-it' ? 'How to season it' : 'What it seasons'}
                </SectionHeading>
                <div className="flex flex-wrap gap-2">
                  {entry.seasoning.items
                    .slice(0, showAllSeasoning ? undefined : SEASONING_PREVIEW)
                    .map(item => (
                      <Pill
                        key={item.name}
                        size="sm"
                        accent={
                          item.profile ? CATEGORY_COLORS[item.profile.category] : undefined
                        }
                        onClick={() => onNavigate(item.name)}
                        className="lowercase"
                      >
                        {item.name}
                      </Pill>
                    ))}
                </div>
                {entry.seasoning.items.length > SEASONING_PREVIEW && (
                  <ShowMoreButton
                    expanded={showAllSeasoning}
                    count={entry.seasoning.items.length - SEASONING_PREVIEW}
                    onClick={() => setShowAllSeasoning(v => !v)}
                  />
                )}
              </div>
            ) : null,
        },
        {
          key: 'neighborhood',
          node:
            entry.byCategory.length > 0 ? (
              <div>
                <SectionHeading>Everything it pairs with</SectionHeading>
                <div className="space-y-4">
                  {entry.byCategory.map(group => (
                    <div key={group.category}>
                      <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                          style={{
                            backgroundColor: CATEGORY_COLORS[group.category] ?? '#9ca3af',
                          }}
                          aria-hidden="true"
                        />
                        {categoryLabel(group.category)}
                        <span className="ml-1.5 text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                          {group.items.length}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-x-1 gap-y-1">
                        {group.items.map(item => (
                          <button
                            key={item.name}
                            onClick={() => onNavigate(item.name)}
                            className="px-2 py-0.5 rounded-full text-sm lowercase text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No pairings recorded for this ingredient yet.
              </p>
            ),
        },
        {
          key: 'surprising',
          node:
            entry.surprisingPairs.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-4">
                <SectionHeading>
                  <span className="inline-flex items-center gap-1.5">
                    <FlaskConical size={13} strokeWidth={2} aria-hidden="true" />
                    Surprising pairings
                  </span>
                </SectionHeading>
                <p className="-mt-1 mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  These share aroma compounds with{' '}
                  <span className="lowercase font-medium">{entry.name}</span> but aren't a
                  traditional pairing. A food-science lens, not a rule — the shared-compound idea
                  holds in some cuisines and not others. Worth an experiment.
                </p>
                <div className="flex flex-wrap gap-2">
                  {entry.surprisingPairs.map(item => (
                    <button
                      key={item.name}
                      onClick={() => onNavigate(item.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm lowercase bg-gray-50 dark:bg-gray-700/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                    >
                      {item.profile && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: CATEGORY_COLORS[item.profile.category] ?? '#9ca3af' }}
                          aria-hidden="true"
                        />
                      )}
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : null,
        },
      ]
    : [];

  return (
    <div
      className={`fixed inset-0 z-[80] flex ${isMobile ? '' : 'items-center justify-center p-4'}`}
      role="dialog"
      aria-modal="true"
      aria-label={`Ingredient page for ${ingredient}`}
    >
      {/* Backdrop (fully covered by the sheet on mobile, still catches nothing there) */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={onClose}
      />

      {/* Panel: full-screen sheet on mobile (page-length read), centered card on desktop */}
      <div
        className={`
          relative flex flex-col bg-white dark:bg-gray-800 animate-modal-in
          ${isMobile ? 'w-full h-[100dvh]' : 'w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 sm:px-6 py-3 border-b border-gray-100 dark:border-gray-700/60 shrink-0">
          <p className="font-display font-bold text-gray-900 dark:text-white lowercase truncate">
            {ingredient}
          </p>
          <div className="flex items-center gap-1">
            {entry && (
              <IconButton
                label={copied ? 'Link copied' : 'Copy link to this page'}
                onClick={handleShare}
                className="rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {copied ? (
                  <Check size={18} strokeWidth={2} className="text-green-600 dark:text-green-400" />
                ) : (
                  <LinkIcon size={18} strokeWidth={2} />
                )}
              </IconButton>
            )}
            <IconButton
              label="Close ingredient page"
              onClick={onClose}
              className="rounded-full text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={20} strokeWidth={2} />
            </IconButton>
          </div>
        </div>

        {/* Body — owns its scrolling (the app's <main> overflow is conditional) */}
        <div
          ref={scrollRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-6 py-5"
        >
          {entry ? (
            <div className="space-y-7 pb-2">
              {sections.map(s => (
                <React.Fragment key={s.key}>{s.node}</React.Fragment>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="font-display text-xl text-gray-900 dark:text-white">
                No page for “{ingredient}”
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                That ingredient isn't in the flavor map.
              </p>
            </div>
          )}
        </div>

        {/* Handoff to Create */}
        {entry && (
          <div
            className="shrink-0 px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-gray-700/60"
            style={isMobile ? { paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' } : undefined}
          >
            <button
              onClick={() => onStartPairing(entry.name)}
              className="w-full py-3 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-semibold hover:opacity-90 transition-opacity"
            >
              Start a pairing with <span className="font-display italic lowercase">{entry.name}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IngredientAtlas;
