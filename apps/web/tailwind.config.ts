import type { Config } from 'tailwindcss';

/**
 * Tema oscuro premium inspirado en centros de monitoreo (Uber Fleet / Tesla).
 * Paleta de acento ambar (taxi) sobre superficies grafito.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0b0f14',
          raised: '#111721',
          overlay: '#1a2230',
          border: '#222c3a',
        },
        brand: {
          DEFAULT: '#f5b301',
          soft: '#ffd34d',
          dark: '#c98f00',
        },
        accent: {
          green: '#22c55e',
          blue: '#3b82f6',
          red: '#ef4444',
          amber: '#f59e0b',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 30px rgba(0,0,0,0.35)',
        glow: '0 0 20px rgba(245,179,1,0.25)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
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
