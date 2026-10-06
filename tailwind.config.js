/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0d0f12',
        surface: '#16191f',
        'surface-elevated': '#1f242c',
        border: '#2a313d',
      }
    },
  },
  plugins: [],
}
