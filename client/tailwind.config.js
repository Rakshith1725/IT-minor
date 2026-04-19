/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        acid: {
          400: '#C8F135',
          500: '#C8F135', // Match variable
        },
        ember: {
          500: '#FF5C35',
        },
        frost: {
          500: '#38BDF8',
        },
        violet: {
          500: '#8B5CF6',
        },
        ink: {
          50: '#F2F4F7',
          100: '#E4E6E9',
          200: '#C8CDD3',
          300: '#94A3B8',
          400: '#64748B',
          500: '#475569',
          600: '#334155',
          700: '#1e293b',
          800: '#0F172A',
          900: '#0D0F12',
          950: '#06080A',
        },
      },
      backgroundImage: {
        'grid-ink': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='rgba(200, 241, 53, 0.03)' stroke-width='0.5'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
