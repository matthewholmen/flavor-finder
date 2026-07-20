/**
 * True when running inside the extension (side panel) with the APIs the
 * extractor needs. False when the built page is opened in a plain browser tab
 * — the panel then falls back to paste-only mode, which is also how we
 * verify the UI outside Chrome's extension harness.
 */
export const hasExtensionApis = (): boolean =>
  typeof chrome !== 'undefined' && !!chrome.scripting && !!chrome.tabs;
