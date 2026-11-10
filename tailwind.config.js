/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B0E14',
        card: '#161B22',
        raised: '#1E2530',
        line: '#262E3A',
        well: '#0F131A',
        cyan: '#00F0FF',
        violet: '#7000FF',
        win: '#00FF87',
        loss: '#FF3B5C',
        muted: '#8B95A5',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(0,240,255,0.35)',
        'glow-win': '0 0 24px rgba(0,255,135,0.35)',
      },
    },
  },
  plugins: [],
};
