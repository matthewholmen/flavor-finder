import React, { useEffect, useState } from 'react';
import { Sparkles, Lock, Search, Bookmark, UtensilsCrossed, X } from 'lucide-react';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

// Canned combos for the illustrative Generate step. These don't touch the real
// flavor map — the wizard just needs to convey "press Generate, get a fresh set
// of ingredients that pair well."
const DEMO_COMBOS: string[][] = [
  ['Lamb', 'Rosemary', 'Garlic'],
  ['Scallop', 'Brown Butter', 'Sage'],
  ['Beet', 'Goat Cheese', 'Walnut'],
  ['Mango', 'Chili', 'Lime'],
  ['Dark Chocolate', 'Espresso', 'Orange'],
  ['Salmon', 'Dill', 'Cucumber'],
];

// Partner pairs for the Lock step demo. "Scallop" stays locked while these
// two slots reshuffle — showing how a locked ingredient anchors a generation.
const LOCK_PARTNERS: string[][] = [
  ['Brown Butter', 'Sage'],
  ['Leek', 'Thyme'],
  ['Lemon', 'Capers'],
  ['Bacon', 'Corn'],
  ['Fennel', 'Tarragon'],
];

const TOTAL_STEPS = 4;
// How many times the user must press Generate before the Next button unlocks.
const GENERATE_GOAL = 3;

const Pill: React.FC<{ label: string; locked?: boolean }> = ({ label, locked }) => (
  <span
    className={`
      inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[15px] border transition-colors
      ${locked
        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
        : 'bg-gray-100 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-600'
      }
    `}
  >
    {locked && <Lock size={13} strokeWidth={2.5} className="-ml-0.5" />}
    {label}
  </span>
);

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);
  const [genCount, setGenCount] = useState(0);
  const [comboIndex, setComboIndex] = useState(0);
  const [lockIndex, setLockIndex] = useState(0);

  // Reset to the beginning each time the wizard is opened.
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setGenCount(0);
      setComboIndex(0);
      setLockIndex(0);
    }
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLastStep = step === TOTAL_STEPS - 1;
  // On the Generate step, gate progress until the user has actually played.
  const nextLocked = step === 1 && genCount < GENERATE_GOAL;

  const handleGenerate = () => {
    setGenCount(c => c + 1);
    setComboIndex(i => (i + 1) % DEMO_COMBOS.length);
  };

  // Reshuffle the unlocked partners on the Lock step while Scallop stays put.
  const handleLockReshuffle = () => {
    setLockIndex(i => (i + 1) % LOCK_PARTNERS.length);
  };

  const handleNext = () => {
    if (nextLocked) return;
    if (isLastStep) {
      onClose();
    } else {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => setStep(s => Math.max(0, s - 1));

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[460px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl p-6 sm:p-7 animate-modal-in"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Welcome tour"
      >
        {/* Close — sits on its own row above the progress bar */}
        <div className="flex justify-end -mt-1 -mr-1 mb-2">
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close tour"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors duration-300 ${
                i <= step ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Stage */}
        <div className="min-h-[280px]">
          {step === 0 && (
            <div className="text-center pt-2">
              <img
                src="/logo192.png"
                alt="Flavor Finder"
                className="w-14 h-14 rounded-2xl mx-auto mb-5"
              />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 font-display tracking-tight">
                Welcome to Flavor Finder
              </h2>
              <p className="text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed max-w-[320px] mx-auto">
                Discover ingredients that taste great together. Takes about 20 seconds — let's play.
              </p>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 font-display tracking-tight">
                Start with a little magic
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Hit Generate. Each press builds a set of ingredients that all pair well. Try it a few times.
              </p>

              <div className="flex flex-wrap gap-2 justify-center my-5 min-h-[44px]">
                {DEMO_COMBOS[comboIndex].map((ing, i) => (
                  <Pill key={`${comboIndex}-${i}`} label={ing} />
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleGenerate}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[15px] font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <Sparkles size={17} strokeWidth={2} />
                  Generate
                </button>
                <p
                  className={`text-xs mt-3 transition-colors ${
                    genCount >= GENERATE_GOAL
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {genCount >= GENERATE_GOAL
                    ? "Nice — you've got the idea. Hit Next."
                    : `Generated ${genCount} time${genCount === 1 ? '' : 's'} — keep going`}
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 font-display tracking-tight">
                Lock what you like
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Lock an ingredient, then Generate again — the rest reshuffles around it. Try it: Scallop is locked.
              </p>

              <div className="flex flex-wrap gap-2 justify-center my-5 min-h-[44px]">
                <Pill label="Scallop" locked />
                {LOCK_PARTNERS[lockIndex].map((ing, i) => (
                  <Pill key={`${lockIndex}-${i}`} label={ing} />
                ))}
              </div>

              <div className="text-center">
                <button
                  onClick={handleLockReshuffle}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[15px] font-medium bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  <Sparkles size={17} strokeWidth={2} />
                  Generate
                </button>
                <p className="text-xs mt-3 text-gray-400 dark:text-gray-500">
                  Scallop stays put. Everything else is free to change.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 font-display tracking-tight">
                Build your own
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Got something in the fridge? Search to add any ingredient and we'll suggest what pairs with it.
              </p>
              <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-gray-50 dark:bg-gray-700/60">
                <Search size={18} className="text-gray-400 dark:text-gray-500" />
                <span className="text-[15px] text-gray-400 dark:text-gray-500">Try "tomato"…</span>
              </div>
              <div className="flex gap-4 mt-6 justify-center">
                <div className="text-center max-w-[130px]">
                  <UtensilsCrossed size={22} className="mx-auto text-gray-700 dark:text-gray-300" strokeWidth={1.75} />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-snug">
                    Find recipes for any combo
                  </p>
                </div>
                <div className="text-center max-w-[130px]">
                  <Bookmark size={22} className="mx-auto text-gray-700 dark:text-gray-300" strokeWidth={1.75} />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1.5 leading-snug">
                    Save combos you love
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={onClose}
            className="text-[13px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-1 py-1.5"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 rounded-lg text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={nextLocked}
              className={`
                px-5 py-2 rounded-lg text-sm font-medium transition-all
                ${nextLocked
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 active:scale-[0.98]'
                }
              `}
            >
              {isLastStep ? 'Start cooking' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
