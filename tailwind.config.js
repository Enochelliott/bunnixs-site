/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-clash)', 'sans-serif'],
        body: ['var(--font-syne)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      colors: {
        bunni: {
          pink: '#FF2D8A',
          hot: '#FF0066',
          purple: '#9B30FF',
          violet: '#6E00FF',
          cyan: '#00F5FF',
          lime: '#BEFF00',
          orange: '#FF6B00',
          dark: '#0A0A0F',
          card: '#12121A',
          border: '#1E1E2E',
          muted: '#3A3A5C',
          text: '#E8E8FF',
        },
      },
      backgroundImage: {
        'gradient-bunni': 'linear-gradient(135deg, #FF2D8A 0%, #9B30FF 50%, #00F5FF 100%)',
        'gradient-card': 'linear-gradient(135deg, #12121A 0%, #1A1A2E 100%)',
        'gradient-post': 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.95) 100%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 45, 138, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 45, 138, 0.8), 0 0 80px rgba(155, 48, 255, 0.4)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
