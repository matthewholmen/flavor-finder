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
  chrome.action.onClicked.addListener(tab => {
    if (!tab.id) return;
    // Must be called synchronously inside the click to satisfy the
    // user-gesture requirement.
    chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    void extractAndPublish(tab.id);
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
