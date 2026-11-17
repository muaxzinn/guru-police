import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        bg2: 'rgb(var(--bg2) / <alpha-value>)',
        panel: 'rgb(var(--panel) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        brand: 'rgb(var(--brand) / <alpha-value>)',
        'brand-dark': 'rgb(var(--brand-dark) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-dark': 'rgb(var(--accent-dark) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',
        'gold-ink': 'rgb(var(--gold-ink) / <alpha-value>)',
        teal: 'rgb(var(--teal) / <alpha-value>)',
        'teal-ink': 'rgb(var(--teal-ink) / <alpha-value>)',
        violet: 'rgb(var(--violet) / <alpha-value>)',
        pink: 'rgb(var(--pink) / <alpha-value>)',
        blue: 'rgb(var(--blue) / <alpha-value>)',
      },
      borderRadius: {
        card: '14px',
        btn: '10px',
      },
      fontFamily: {
        sans: ['var(--font-sarabun)', 'Sarabun', 'Prompt', 'system-ui', 'sans-serif'],
        display: ['var(--font-prompt)', 'Prompt', 'Sarabun', 'system-ui', 'sans-serif'],
        exam: ['var(--font-sarabun)', 'Sarabun', 'Prompt', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgb(var(--ink) / 0.05), 0 1px 2px rgb(var(--ink) / 0.03)',
      },
    },
  },
  plugins: [],
};

export default config;

