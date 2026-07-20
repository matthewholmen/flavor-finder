import { defineConfig } from 'wxt';
import path from 'node:path';

// Flavor Finder extension (EXTENSION_PLAN.md phase X3).
// The panel imports the app's engine + report components straight from ../src —
// one repo, one source of truth for the flavor map (no data copies, ever).
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  alias: {
    // Shared engine + UI from the web app. WXT wires this into both Vite and
    // the generated tsconfig paths. Vite resolves the codebase's explicit
    // `.ts` import extensions natively (the CRA quirk is a non-issue here).
    '@app': path.resolve(__dirname, '../src'),
  },
  manifest: {
    name: 'Flavor Finder',
    description:
      'The flavor checker — see how any recipe hangs together, and what to swap.',
    permissions: ['sidePanel', 'activeTab', 'scripting', 'storage'],
    action: {
      default_title: 'Check this recipe’s flavors',
    },
  },
  vite: () => ({
    server: {
      fs: {
        // Let the dev server serve files from the parent app.
        allow: [path.resolve(__dirname, '..')],
      },
    },
  }),
});
