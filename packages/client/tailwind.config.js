/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          950: '#0c1210',
          900: '#121a17',
          800: '#182620',
          700: '#22352c',
          600: '#324a3d',
        },
        paper: '#f4efe4',
        gold: '#c9a24b',
        good: '#5fae6e',
        bad: '#d16257',
        redsuit: '#d1595a',
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
