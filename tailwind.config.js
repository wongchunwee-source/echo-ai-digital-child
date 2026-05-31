/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 22px 80px rgba(255, 144, 92, 0.24)',
        soft: '0 18px 50px rgba(80, 67, 55, 0.12)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        born: 'born 1.8s ease-out both',
        pulseSoft: 'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        born: {
          '0%': { opacity: '0', transform: 'scale(0.7) translateY(24px)', filter: 'blur(18px)' },
          '60%': { opacity: '1', transform: 'scale(1.04) translateY(0)', filter: 'blur(0)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)', filter: 'blur(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.55', transform: 'scale(0.96)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
