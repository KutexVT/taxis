import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#ffffff',
          raised: '#ffffff',
          overlay: '#f3f3f3',
          border: '#dedede',
        },
        brand: {
          DEFAULT: '#000000',
          soft: '#282828',
          dark: '#000000',
        },
        accent: {
          green: '#166534',
          blue: '#1d4ed8',
          red: '#b91c1c',
          amber: '#92400e',
        },
        ink: '#000000',
        body: '#333333',
        muted: '#5e5e5e',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: { xs: ['0.875rem', '1.25rem'], sm: ['1rem', '1.5rem'] },
      boxShadow: {
        card: '0 4px 16px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '70%': { transform: 'scale(1.6)', opacity: '0' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.6s cubic-bezier(0.4,0,0.6,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
