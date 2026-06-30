/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dbe4ff',
          200: '#bac8ff',
          300: '#91a7ff',
          400: '#748ffc',
          500: '#5c7cfa',
          600: '#4c6ef5',
          700: '#4263eb',
          800: '#3b5bdb',
          900: '#364fc7',
        },
        // Semantic color tokens — alias to existing Tailwind palettes.
        // Use these in components instead of raw color names (emerald/rose/etc.)
        // so future color changes only need to happen here.
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.rose,
        info: colors.sky,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        // Elevation system: from flat to floating.
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        'card-hover': '0 4px 6px -1px rgb(15 23 42 / 0.08), 0 2px 4px -2px rgb(15 23 42 / 0.06)',
        elevated: '0 10px 15px -3px rgb(15 23 42 / 0.08), 0 4px 6px -4px rgb(15 23 42 / 0.05)',
        popover: '0 20px 25px -5px rgb(15 23 42 / 0.10), 0 8px 10px -6px rgb(15 23 42 / 0.06)',
        // Focus ring shadow (used together with focus-visible:ring-*)
        ring: '0 0 0 3px rgb(76 110 245 / 0.15)',
      },
      // Spacing tokens for consistent section rhythm across breakpoints.
      // Use as `py-section-sm` / `py-section-md` / `py-section-lg`.
      spacing: {
        'section-sm': '2rem',     // 32px — tight sections
        'section-md': '3rem',     // 48px — default
        'section-lg': '5rem',     // 80px — hero / featured
      },
      borderRadius: {
        // Standardize the radii actually used across the codebase.
        'card': '0.75rem',        // 12px — matches rounded-xl
      },
      transitionDuration: {
        '250': '250ms',
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            code: { backgroundColor: '#f3f4f6', padding: '0.2em 0.4em', borderRadius: '0.25rem' },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
