# Flavor Finder — Chrome extension

The **flavor checker** (EXTENSION_PLAN.md phase X3): a side panel that reads
the recipe on the current page, runs it through the same flavor map as the
web app, and shows the Flavor Report — the weave, taste balance, and swap
ideas — with a one-click handoff to the full app.

Everything is shared with the web app via imports from `../src` (the `@app`
alias): the matcher, the analysis, and the report components. There is no
copied data and no backend — the whole engine ships in the panel bundle.

## Try it in Chrome (no store needed)

1. Build it — from this folder:
   ```bash
   npm install
   npm run build
   ```
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top-right toggle).
4. Click **Load unpacked** and pick the `extension/.output/chrome-mv3` folder.
5. Go to any recipe page and click the Flavor Finder icon in the toolbar
   (pin it via the puzzle-piece menu if you don't see it). The side panel
   opens and reads the page.

After code changes, run `npm run build` again and press the ↻ refresh icon
on the extension's card in `chrome://extensions`.

## How it reads a page

Clicking the toolbar icon grants access to that tab only (`activeTab` —
deliberately minimal permissions). The panel injects a tiny read-only
extractor that tries, in order:

1. **JSON-LD** structured data (covers ~90% of recipe sites)
2. **Microdata** (`itemprop="recipeIngredient"`)
3. **Known recipe-plugin CSS classes** (WP Recipe Maker, Tasty, Mediavine…)

If none hit, the panel falls back to paste. Only the title and ingredient
lines are read; nothing is stored or sent anywhere.

## Commands

```bash
npm run dev      # Dev mode: opens Chrome with the extension loaded, HMR
npm run build    # Production build → .output/chrome-mv3
npm run zip      # Store-ready zip (phase X4)
npm run compile  # TypeScript check
```

## What's deliberately not here (yet)

- Auto-detection badge (`<all_urls>`) — X4, after first CWS review.
- "Seen in" receipts (`pairingContext.ts`, 1.65 MB) — X4 candidate, lazy.
- Icons + store listing — X4.
