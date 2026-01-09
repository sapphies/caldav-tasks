export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    // Priority colors
    'border-red-400',
    'bg-red-50',
    'dark:bg-red-900/30',
    'text-red-500',
    'border-amber-400',
    'bg-amber-50',
    'dark:bg-amber-900/30',
    'text-amber-500',
    'border-blue-400',
    'bg-blue-50',
    'dark:bg-blue-900/30',
    'text-blue-500',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'rgb(var(--color-primary-50, 239 246 255) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100, 219 234 254) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200, 191 219 254) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300, 147 197 253) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400, 96 165 250) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500, 59 130 246) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600, 37 99 235) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700, 29 78 216) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800, 30 64 175) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900, 30 58 138) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950, 23 37 84) / <alpha-value>)',
        },
        surface: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
