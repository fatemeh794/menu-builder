/** Scoped to the 3D food-plate feature only. `preflight` is off so Tailwind's
 * base reset doesn't fight Angular Material's own reset elsewhere in the app -
 * this app uses Tailwind purely for utility classes, not as its design system. */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        plate: {
          bg: '#0f1115',
          card: 'rgba(255,255,255,0.06)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
