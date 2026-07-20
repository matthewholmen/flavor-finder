import { defineBackground } from '#imports';

// Minimal service worker: clicking the toolbar icon opens the side panel
// (and grants activeTab for the page, which the panel's extractor uses).
export default defineBackground(() => {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => {});
});
