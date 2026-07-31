/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Matches --font-heading and --font-body CSS variables used throughout
        heading: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        body:    ['Inter',             'system-ui', '-apple-system', 'sans-serif'],
        // Keep 'sans' pointing to Inter as the body default
        sans:    ['Inter',             'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Matches --coral / --primary-purple tokens used in app CSS
        primary: {
          DEFAULT: '#7C3AED',
          light:   '#8B5CF6',
          dark:    '#6D28D9',
        },
      },
      borderRadius: {
        // Named radii used throughout app
        'sm': '12px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
      },
    },
  },
  plugins: [],
};
