import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, ArrowLeft, Wand2, ChevronDown } from 'lucide-react';
import { TASTE_COLORS, CATEGORY_COLORS, WILD_COLOR } from '../../utils/colors.ts';
import { categoryLabel } from '../../utils/categoryLabels.ts';
import {
  TASTE_KEYS,
  CATEGORY_KEYS,
  SUBCATEGORIES,
  TasteKey,
  CategoryKey,
  SlotMode,
  SlotTaste,
} from '../../hooks/useSlots.ts';
import {
  FlavorPreset,
  FLAVOR_PRESETS,
  PresetTier,
  TIER_LABELS,
} from '../../data/flavorPresets.ts';

interface PresetGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (preset: FlavorPreset) => void;
  // User-built pairings shown under "Your pairings".
  customPresets?: FlavorPreset[];
  // Persist a freshly built pairing; returns it with an id so we can load it.
  onSaveCustom?: (name: string, slots: SlotTaste[]) => FlavorPreset;
  onDeleteCustom?: (id: string) => void;
}

// Relative luminance of a #rrggbb color, for choosing black vs white label text.
const hexLuminance = (hex: string): number => {
  const c = hex.replace('#', '');
  if (c.length < 6) return 1;
  const channel = (h: string) => {
    const x = parseInt(h, 16) / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * channel(c.slice(0, 2)) +
    0.7152 * channel(c.slice(2, 4)) +
    0.0722 * channel(c.slice(4, 6))
  );
};
const contrastText = (hex: string): string => (hexLuminance(hex) > 0.32 ? '#131823' : '#ffffff');

// Blend `hex` toward `target` by `amount` (0-1) — used to make opaque "toned"
// controls that read as a tint of the slot rather than a separate card, the way
// Taste Lab tints its in-slot controls.
const mixHex = (hex: string, target: string, amount: number): string => {
  const c = hex.replace('#', '');
  const t = target.replace('#', '');
  if (c.length < 6 || t.length < 6) return hex;
  const mix = (i: number) =>
    Math.round(parseInt(c.slice(i, i + 2), 16) * (1 - amount) + parseInt(t.slice(i, i + 2), 16) * amount);
  return `rgb(${mix(0)}, ${mix(2)}, ${mix(4)})`;
};

// The color + label a slot contributes — its taste tint in taste mode, its
// category tint in category mode.
const slotSwatch = (slot: SlotTaste) => {
  if (slot.mode === 'wild') return { color: WILD_COLOR, label: 'wild' };
  if (slot.mode === 'category') {
    // A narrowed slot shows its subcategory (e.g. "Cheese") in the category color.
    return { color: CATEGORY_COLORS[slot.category] ?? '#999', label: slot.subcategory || slot.category };
  }
  return { color: TASTE_COLORS[slot.taste as TasteKey] ?? '#999', label: slot.taste };
};

// The signature palette strip — one tinted segment per slot, labeled. Shared by
// the preset cards and the builder's live preview so they read identically.
const PaletteStrip = ({ slots, className = 'h-20' }: { slots: SlotTaste[]; className?: string }) => (
  <div className={`flex ${className}`}>
    {slots.map((slot, i) => {
      const { color, label } = slotSwatch(slot);
      return (
        <div
          key={i}
          className="flex-1 flex items-end justify-center pb-1.5"
          style={{ backgroundColor: color }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-wide capitalize px-1 truncate"
            style={{ color: contrastText(color) }}
          >
            {label}
          </span>
        </div>
      );
    })}
  </div>
);

// One preset rendered as a color-palette card. Click loads it into Taste Lab;
// custom presets also get a delete affordance.
const PresetCard = ({
  preset,
  onSelect,
  onDelete,
}: {
  preset: FlavorPreset;
  onSelect: () => void;
  onDelete?: () => void;
}) => (
  <div className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-md transition-all">
    {onDelete && (
      <button
        onClick={onDelete}
        aria-label={`Delete ${preset.name}`}
        className="absolute top-1.5 right-1.5 z-10 p-1.5 rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/50"
      >
        <Trash2 size={13} strokeWidth={2.25} />
      </button>
    )}
    <button onClick={onSelect} className="flex flex-col text-left">
      <PaletteStrip slots={preset.slots} />
      <div className="p-3">
        <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{preset.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug mt-0.5">
          {preset.description}
        </div>
      </div>
    </button>
  </div>
);

// Editor for a single slot, styled like a Taste Lab half: a colored tile (its
// current tint) with every control layered on top — the value as the hero, a
// compact Taste ⇄ Category toggle, and a tap-to-open value picker. The tile IS
// the palette segment, so there's no separate preview strip.
const SlotEditor = ({
  slot,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  slot: SlotTaste;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<SlotTaste>) => void;
  onRemove: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [excludeOpen, setExcludeOpen] = useState(false);
  const [narrowOpen, setNarrowOpen] = useState(false);
  const { color, label } = slotSwatch(slot);
  const fg = contrastText(color);
  // Toned surfaces nudged toward the text color, so controls read as a tint of
  // the tile (matching Taste Lab) rather than separate cards.
  const pillBg = mixHex(color, fg, fg === '#ffffff' ? 0.22 : 0.12);
  const strongBg = mixHex(color, fg, fg === '#ffffff' ? 0.34 : 0.22);
  const isCategory = slot.mode === 'category';
  const isWild = slot.mode === 'wild';

  const options: { value: string; color: string }[] = isCategory
    ? CATEGORY_KEYS.map(c => ({ value: c, color: CATEGORY_COLORS[c] }))
    : TASTE_KEYS.map(t => ({ value: t, color: TASTE_COLORS[t as TasteKey] }));

  const pick = (value: string) => {
    // Changing the category drops any subcategory narrow (subcats are per-category).
    onChange(isCategory ? { category: value as CategoryKey, subcategory: undefined } : { taste: value as TasteKey });
    setOpen(false);
  };

  // Narrow a category slot to one of its subcategories (or "Any" to clear).
  const subcategories = isCategory ? SUBCATEGORIES[slot.category] ?? [] : [];
  const pickSubcategory = (sub?: string) => {
    onChange({ subcategory: sub });
    setNarrowOpen(false);
  };

  // Exclude carves categories out of the slot's pool. Pointless on a category
  // slot (already one category), so it's only offered for taste & wild.
  const excluded = slot.exclude ?? [];
  const canExclude = !isCategory;
  const toggleExclude = (c: CategoryKey) =>
    onChange({ exclude: excluded.includes(c) ? excluded.filter(x => x !== c) : [...excluded, c] });

  return (
    <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: color }}>
      {canRemove && (
        <button
          onClick={onRemove}
          aria-label={`Remove slot ${index + 1}`}
          className="absolute top-2 right-2 z-10 p-1 rounded-full transition-transform active:scale-90"
          style={{ color: fg, opacity: 0.7 }}
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}

      <div className="flex flex-col items-center gap-2.5 px-4 py-5">
        {/* Value hero — tap to open the picker. A wild slot has no value to pick,
            so it's a plain label, no chevron. */}
        {isWild ? (
          <span className="text-2xl font-black capitalize tracking-tight" style={{ color: fg }}>
            {label}
          </span>
        ) : (
          <button
            onClick={() => { setOpen(o => !o); setExcludeOpen(false); }}
            className="flex items-center gap-1.5"
            style={{ color: fg }}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="text-2xl font-black capitalize tracking-tight">{label}</span>
            <ChevronDown
              size={18}
              strokeWidth={2.75}
              style={{ opacity: 0.75, transform: open ? 'rotate(180deg)' : undefined }}
            />
          </button>
        )}

        {/* Compact Taste | Category | Wild toggle */}
        <div className="flex p-0.5 rounded-full" style={{ backgroundColor: strongBg }}>
          {(['taste', 'category', 'wild'] as SlotMode[]).map(mode => {
            const active = slot.mode === mode;
            return (
              <button
                key={mode}
                onClick={() => {
                  onChange({ mode });
                  if (mode === 'wild') setOpen(false);
                }}
                className="px-3 py-1 rounded-full text-xs font-bold capitalize transition-all"
                style={{ color: fg, opacity: active ? 1 : 0.6, backgroundColor: active ? pillBg : 'transparent' }}
              >
                {mode}
              </button>
            );
          })}
        </div>

        {/* Narrow — restrict a category slot to one subcategory (e.g. Cheese) */}
        {isCategory && (
          <button
            onClick={() => { setNarrowOpen(o => !o); setOpen(false); }}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: fg, opacity: 0.8 }}
            aria-expanded={narrowOpen}
          >
            {slot.subcategory ? `Only ${slot.subcategory}` : 'Narrow…'}
            <ChevronDown
              size={13}
              strokeWidth={2.75}
              style={{ transform: narrowOpen ? 'rotate(180deg)' : undefined }}
            />
          </button>
        )}

        {/* Exclude — carve categories out of this slot's pool */}
        {canExclude && (
          <button
            onClick={() => { setExcludeOpen(o => !o); setOpen(false); }}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide"
            style={{ color: fg, opacity: 0.8 }}
            aria-expanded={excludeOpen}
          >
            {excluded.length ? `Excluding ${excluded.length}` : 'Exclude…'}
            <ChevronDown
              size={13}
              strokeWidth={2.75}
              style={{ transform: excludeOpen ? 'rotate(180deg)' : undefined }}
            />
          </button>
        )}
      </div>

      {/* Inline value picker — a toned panel within the tile (no clipping, no
          separate surface) listing the options for the active mode. */}
      {open && !isWild && (
        <div className="px-2 pb-2">
          <div
            className="rounded-xl p-1.5 max-h-44 overflow-y-auto grid grid-cols-2 gap-0.5"
            style={{ backgroundColor: pillBg }}
            role="listbox"
          >
            {options.map(({ value, color: dot }) => {
              const selected = value === label;
              return (
                <button
                  key={value}
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(value)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm font-medium text-left transition-colors"
                  style={{ color: fg, backgroundColor: selected ? strongBg : 'transparent' }}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                  <span className="capitalize truncate">{value}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline narrow panel — restrict a category slot to one subcategory */}
      {narrowOpen && isCategory && (
        <div className="px-2 pb-2">
          <div className="rounded-xl p-1.5 flex flex-wrap gap-1" style={{ backgroundColor: pillBg }}>
            <button
              onClick={() => pickSubcategory(undefined)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
              style={{ color: fg, backgroundColor: !slot.subcategory ? strongBg : 'transparent', opacity: !slot.subcategory ? 1 : 0.7 }}
            >
              {`Any ${slot.category}`}
            </button>
            {subcategories.map(sub => {
              const on = slot.subcategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => pickSubcategory(sub)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors"
                  style={{ color: fg, backgroundColor: on ? strongBg : 'transparent', opacity: on ? 1 : 0.7 }}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inline exclude panel — tap a category to carve it out of the slot */}
      {excludeOpen && canExclude && (
        <div className="px-2 pb-2">
          <div className="rounded-xl p-1.5 flex flex-wrap gap-1" style={{ backgroundColor: pillBg }}>
            {CATEGORY_KEYS.map(c => {
              const on = excluded.includes(c as CategoryKey);
              return (
                <button
                  key={c}
                  onClick={() => toggleExclude(c as CategoryKey)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors"
                  style={{
                    color: fg,
                    opacity: on ? 1 : 0.7,
                    backgroundColor: on ? strongBg : 'transparent',
                    textDecoration: on ? 'line-through' : 'none',
                  }}
                >
                  {categoryLabel(c)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MIN_SLOTS = 2;
const MAX_SLOTS = 4;

// A fresh slot carries both a taste and a category so the toggle remembers both.
const newSlot = (taste: TasteKey, category: CategoryKey = 'Proteins'): SlotTaste => ({
  mode: 'taste',
  taste,
  category,
});

// The "create a pairing" view: compose 2–4 slots visually, preview the palette
// live, then open it in Taste Lab or save it to your gallery.
const PairingBuilder = ({
  onBack,
  onOpen,
  onSave,
}: {
  onBack: () => void;
  onOpen: (slots: SlotTaste[]) => void;
  onSave: (name: string, slots: SlotTaste[]) => void;
}) => {
  const [slots, setSlots] = useState<SlotTaste[]>([newSlot('sweet', 'Fruits'), newSlot('salty', 'Proteins')]);
  const [name, setName] = useState('');

  const patchSlot = (i: number, patch: Partial<SlotTaste>) =>
    setSlots(prev => prev.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const addSlot = () =>
    setSlots(prev => (prev.length >= MAX_SLOTS ? prev : [...prev, newSlot('umami', 'Vegetables')]));
  const removeSlot = (i: number) =>
    setSlots(prev => (prev.length <= MIN_SLOTS ? prev : prev.filter((_, j) => j !== i)));

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 shrink-0">
        <button
          onClick={onBack}
          aria-label="Back to presets"
          className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-transform active:scale-90"
        >
          <ArrowLeft size={18} strokeWidth={2.5} />
        </button>
        <div>
          <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight font-display">
            Create a pairing
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Mix tastes and categories — e.g. Protein + Spicy.
          </p>
        </div>
      </div>

      {/* Slot tiles — the editable palette itself. Kept to a narrow centered
          column so it doesn't sprawl on wide viewports. */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="max-w-md mx-auto space-y-2.5">
          {slots.map((slot, i) => (
            <SlotEditor
              key={i}
              slot={slot}
              index={i}
              canRemove={slots.length > MIN_SLOTS}
              onChange={patch => patchSlot(i, patch)}
              onRemove={() => removeSlot(i)}
            />
          ))}
          {slots.length < MAX_SLOTS && (
            <button
              onClick={addSlot}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 font-semibold text-sm hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} /> Add a slot
            </button>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
        <div className="max-w-md mx-auto flex flex-col sm:flex-row sm:items-center gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Name (optional)"
            className="flex-1 min-w-0 px-3.5 py-2.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-medium outline-none text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => onSave(name, slots)}
              className="shrink-0 px-4 py-2.5 rounded-full text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 transition-transform active:scale-95"
            >
              Save
            </button>
            <button
              onClick={() => onOpen(slots)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 transition-transform active:scale-95"
            >
              <Wand2 size={15} strokeWidth={2.5} /> Load this pairing
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const PresetGallery = ({
  isOpen,
  onClose,
  onSelect,
  customPresets = [],
  onSaveCustom,
  onDeleteCustom,
}: PresetGalleryProps) => {
  const [view, setView] = useState<'gallery' | 'create'>('gallery');

  // Always reopen on the gallery, never mid-build.
  useEffect(() => {
    if (!isOpen) setView('gallery');
  }, [isOpen]);

  if (!isOpen) return null;

  // Group presets by tier, custom first, preserving declaration order within.
  const tiers = (['custom', 'classic', 'structural', 'themed'] as PresetTier[])
    .map(tier => ({
      tier,
      presets: tier === 'custom' ? customPresets : FLAVOR_PRESETS.filter(p => p.tier === tier),
    }))
    .filter(group => group.presets.length > 0);

  // Load a freshly built pairing without saving it — the fast path for testing.
  const handleOpenBuilt = (slots: SlotTaste[]) => {
    onSelect({
      id: `draft-${Date.now()}`,
      name: 'Custom pairing',
      description: 'Your pairing',
      tier: 'custom',
      slots,
    });
  };

  // Save a built pairing, then return to the gallery so it shows under "Your
  // pairings". (Doesn't auto-load — saving is about building a library.)
  const handleSaveBuilt = (name: string, slots: SlotTaste[]) => {
    onSaveCustom?.(name, slots);
    setView('gallery');
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-overlay-in"
        onClick={() => {
          setView('gallery');
          onClose();
        }}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Flavor presets"
        className={`relative w-full max-h-[85vh] flex flex-col rounded-3xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden transition-[max-width] duration-200 animate-modal-in ${
          view === 'create' ? 'max-w-xl' : 'max-w-4xl'
        }`}
      >
        {view === 'create' ? (
          <PairingBuilder
            onBack={() => setView('gallery')}
            onOpen={handleOpenBuilt}
            onSave={handleSaveBuilt}
          />
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 shrink-0">
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white tracking-tight font-display">
                  Flavor Presets
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Pick a flavor DNA — Generate keeps producing fresh combinations that fit it.
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close presets"
                className="shrink-0 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 transition-transform active:scale-90"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
              {/* Create card */}
              <button
                onClick={() => setView('create')}
                className="w-full flex items-center justify-center gap-2 py-5 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <Plus size={18} strokeWidth={2.5} /> Create a pairing
              </button>

              {tiers.map(({ tier, presets }) => (
                <section key={tier}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                    {TIER_LABELS[tier]}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {presets.map(preset => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        onSelect={() => onSelect(preset)}
                        onDelete={
                          tier === 'custom' && onDeleteCustom
                            ? () => onDeleteCustom(preset.id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PresetGallery;
