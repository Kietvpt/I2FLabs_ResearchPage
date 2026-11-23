import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        canvas: 'var(--bg-canvas)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        border: 'var(--border-subtle)',
        foreground: 'var(--text-primary)',
        muted: 'var(--text-secondary)',
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-primary-hover)',
          soft: 'var(--accent-primary-soft)',
        },
        ai: {
          DEFAULT: 'var(--accent-ai)',
          soft: 'var(--accent-ai-soft)',
          border: 'var(--accent-ai-border)',
        },
      },
      maxWidth: {
        prose: '72ch',
      },
    },
  },
  plugins: [typography],
};
