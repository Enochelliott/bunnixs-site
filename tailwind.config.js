/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
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
        hf: {
          red: '#CC2400',
          'red-bright': '#FF2D00',
          orange: '#FF6B00',
          'orange-light': '#FF8C00',
          fire: '#FF4500',
          dark: '#0A0A0F',
          card: '#12120F',
          border: '#2A1A0E',
          muted: '#5C3A1E',
          text: '#FFF5EE',
          'light-bg': '#FFF5EE',
          'light-card': '#FFFFFF',
          'light-border': '#FFD4B8',
          'light-muted': '#9B6B4A',
          'light-text': '#1A0A00',
        },
      },
      backgroundImage: {
        'gradient-hf': 'linear-gradient(135deg, #CC2400 0%, #FF6B00 100%)',
        'gradient-fire': 'linear-gradient(135deg, #FF4500 0%, #FF6B00 50%, #FFB347 100%)',
        'gradient-card': 'linear-gradient(135deg, #12120F 0%, #1A120A 100%)',
        'gradient-post': 'linear-gradient(180deg, transparent 0%, rgba(10,10,15,0.95) 100%)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'blink-orange': 'blink-orange 1.5s ease-in-out infinite',
        'notification-slide': 'notification-slide 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(204, 36, 0, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(204, 36, 0, 0.8), 0 0 80px rgba(255, 107, 0, 0.4)' },
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
        'blink-orange': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'notification-slide': {
          from: { opacity: '0', transform: 'translateY(-100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
