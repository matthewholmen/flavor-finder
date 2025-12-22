/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Add your custom font families here
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        // Add more custom fonts as needed
      },
    },
  },
  plugins: [],
}