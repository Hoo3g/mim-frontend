/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        hus: {
          blue: '#0088CC', // Lighter blue from the new logo
          dark: '#005580', // Darker shade for hover/text
          red: '#D9251D',
          gold: '#C5A059',
        }
      }
    },
  },
  plugins: [],
}
