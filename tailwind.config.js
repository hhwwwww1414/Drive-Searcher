/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './carrier-finder-app.tsx',
    './public/**/*.html'
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'ui-sans-serif', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
        ui: ['Nunito', 'Inter', 'system-ui', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#4F46E5',
          600: '#4338ca',
          700: '#3730a3',
          800: '#312e81',
          900: '#1e1b4b',
        },
        violet: {
          500: '#7C3AED',
        },
        success: { DEFAULT: '#10B981' },
        warning: { DEFAULT: '#F59E0B' },
        neutral: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 100%)',
        'gradient-soft': 'linear-gradient(135deg, #EFF6FF 0%, #FFF7ED 100%)',
        glass: 'linear-gradient(to bottom right, rgba(255,255,255,0.7), rgba(255,255,255,0.4))',
      },
      borderRadius: {
        'soft': '14px',
        '2xl': '1rem',
      },
      boxShadow: {
        'elev-1': '0 1px 2px rgba(0,0,0,0.06), 0 1px 1px rgba(0,0,0,0.04)',
        'elev-2': '0 4px 12px rgba(0,0,0,0.08)',
        'elev-3': '0 10px 25px rgba(0,0,0,0.12)',
        'soft-inset': 'inset 4px 4px 8px rgba(0,0,0,0.06), inset -4px -4px 8px rgba(255,255,255,0.7)',
        'neuo': '8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.8)',
        'glow': '0 0 0 4px rgba(79,70,229,0.15)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.5' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'scale-in': { '0%': { transform: 'scale(0.95)', opacity: '0' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in-up': 'fade-in-up 400ms ease-out',
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        shimmer: 'shimmer 1.5s linear infinite',
        'scale-in': 'scale-in 250ms ease',
        float: 'float 3s ease-in-out infinite',
        'spin-slow': 'spin-slow 4s linear infinite',
      },
      transitionTimingFunction: {
        swift: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}

