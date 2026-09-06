/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // The base 50-950 steps above are the app's custom slate ramp. The
        // 150/250/350/450/550/650/750/850 half-steps below are additions
        // interpolated between their neighbors so classes like text-slate-450
        // and border-slate-250 (used throughout the frontend) actually
        // resolve to a color instead of silently compiling to no CSS.
        slate: {
          50: '#fafafa',
          100: '#f4f4f5',
          150: '#ececee',
          200: '#e4e4e7',
          250: '#dcdce0',
          300: '#d4d4d8',
          350: '#bbbbc1',
          400: '#a1a1aa',
          450: '#898992',
          500: '#71717a',
          550: '#62626b',
          600: '#52525b',
          650: '#494951',
          700: '#3f3f46',
          750: '#2c2c31',
          800: '#18181b',
          850: '#131316',
          900: '#0e0e11',
          950: '#000000',
        },
        // Tailwind's default red/emerald/amber ramps already cover the
        // standard 50-950 steps; only the half-steps actually used in the
        // frontend (e.g. text-red-650, bg-emerald-650) need to be added here.
        red: {
          250: '#fdb8b8',
          650: '#cb2121',
        },
        emerald: {
          250: '#8bedc4',
          350: '#51dda8',
          650: '#058760',
        },
        amber: {
          250: '#fddd6c',
          350: '#fcc939',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
