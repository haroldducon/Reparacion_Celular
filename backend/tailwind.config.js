/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        grafito: '#1C2321',
        superficie: '#F2F1EC',
        cobre: '#C2793B',
        'cobre-oscuro': '#A5622C',
        circuito: '#3E7C59',
        oxido: '#B84C3C',
        borde: '#DAD7CC',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
