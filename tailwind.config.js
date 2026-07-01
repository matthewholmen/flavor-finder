/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // UI voice — controls, labels, body copy.
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Display voice — hero ingredient names, wordmark, modal headings.
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}