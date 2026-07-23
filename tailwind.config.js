/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0a12',
        surface: 'rgba(255, 255, 255, 0.05)',
        primary: '#c4a052' // golden touch
      }
    },
  },
  plugins: [],
}