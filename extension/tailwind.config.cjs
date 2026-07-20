/** @type {import('tailwindcss').Config} */
// Mirrors the app's tailwind.config.js theme so shared report components
// render identically. Content scan covers the panel AND the imported
// ../src report components (their class names must survive purge).
module.exports = {
  darkMode: 'class',
  content: [
    './entrypoints/**/*.{ts,tsx,html}',
    './utils/**/*.{ts,tsx}',
    '../src/components/v2/report/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
