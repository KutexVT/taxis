import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'rgb(var(--surface) / <alpha-value>)',
          raised: 'rgb(var(--surface-raised) / <alpha-value>)',
          overlay: 'rgb(var(--surface-overlay) / <alpha-value>)',
          border: 'rgb(var(--surface-border) / <alpha-value>)',
          hover: 'rgb(var(--surface-hover) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--brand-soft) / <alpha-value>)',
          dark: 'rgb(var(--ink) / <alpha-value>)',
        },
        accent: {
          green: '#166534',
          blue: '#1d4ed8',
          red: '#b91c1c',
          amber: '#92400e',
        },
        status: {
          green: 'rgb(var(--status-green) / <alpha-value>)',
          blue: 'rgb(var(--status-blue) / <alpha-value>)',
          red: 'rgb(var(--status-red) / <alpha-value>)',
          amber: 'rgb(var(--status-amber) / <alpha-value>)',
        },
        ink: 'rgb(var(--ink) / <alpha-value>)',
        body: 'rgb(var(--body) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
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
    },
  },
  plugins: [],
};

export default config;
