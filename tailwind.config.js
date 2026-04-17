/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f8f2ea',
        blush: '#ead5c4',
        rosewood: '#7a4b45',
        slategreen: '#4a6256',
        charcoal: '#2a2a2a',
      },
      fontFamily: {
        heading: ['Cormorant Garamond', 'serif'],
        body: ['Manrope', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px rgba(42, 42, 42, 0.12)',
      },
      keyframes: {
        floatIn: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
      },
      animation: {
        floatIn: 'floatIn 700ms ease-out forwards',
      },
    },
  },
  plugins: [],
}
