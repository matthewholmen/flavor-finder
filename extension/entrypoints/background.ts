import { defineBackground } from '#imports';
import {
  extractRecipeFromPage,
  ExtractedRecipe,
  ExtractionRecord,
} from '../utils/extractRecipe';

// Toolbar click → open the panel AND run the extractor, both from here.
// The extraction must happen in this callback: activeTab is only guaranteed
// for the clicked tab at the moment of the click. (The panel itself often
// runs before/without that grant — extracting from there fails, which is
// why this doesn't use setPanelBehavior({ openPanelOnActionClick }).)
export default defineBackground(() => {
  // The first shipped version set openPanelOnActionClick: true, and Chrome
  // PERSISTS that per-install even after the code stops setting it — which
  // both toggles the panel on click and swallows action.onClicked entirely.
  // Explicitly clear it so clicks reach the listener below.
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => {});

  chrome.action.onClicked.addListener(tab => {
    if (!tab.id) return;
    // Must be called synchronously inside the click to satisfy the
    // user-gesture requirement.
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    void extractAndPublish(tab.id);
  });

  // Badge: the content script reports whether the page looks like a recipe.
  // Badge state is per-tab, so it clears itself on navigation.
  chrome.action.setBadgeBackgroundColor({ color: '#7CB342' }).catch(() => {}); // TASTE_COLORS.sour green
  chrome.action.setBadgeTextColor?.({ color: '#FFFFFF' })?.catch(() => {});
  chrome.runtime.onMessage.addListener((msg, sender) => {
    const m = msg as { type?: string; found?: boolean };
    if (m?.type === 'recipeSeen' && sender.tab?.id) {
      chrome.action
        .setBadgeText({ tabId: sender.tab.id, text: m.found ? '✓' : '' })
        .catch(() => {});
    }
  });
});

async function extractAndPublish(tabId: number): Promise<void> {
  let record: ExtractionRecord;
  try {
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: extractRecipeFromPage,
    });
    record = { at: Date.now(), recipe: (res?.result ?? null) as ExtractedRecipe | null };
  } catch (e) {
    record = { at: Date.now(), recipe: null, error: String(e) };
  }
  // Stash for a panel that hasn't mounted yet, then nudge one that has.
  await chrome.storage.session.set({ lastExtraction: record });
  chrome.runtime
    .sendMessage({ type: 'extraction', record })
    .catch(() => {}); // No listener yet — the stash covers it.
}
