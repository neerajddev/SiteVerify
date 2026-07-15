/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e6f6f1',
          100: '#ccece3',
          200: '#99d9c7',
          300: '#66c6ab',
          400: '#33b28f',
          500: '#1D9E75', // Primary brand color
          600: '#177e5e',
          700: '#115f46',
          800: '#0b3f2f',
          900: '#062018',
        }
      }
    },
  },
  plugins: [],
}
