/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // A moldura do cartaz de Procurado é escolhida em tempo de execução
  // (`wanted-poster--${moldura.chave}`), então o nome completo nunca aparece no
  // código e o Tailwind descartaria as regras de src/index.css. A lista acompanha
  // ESCADA_MOLDURAS em src/pages/Ficha/utils/retrato.ts; um teste confere.
  safelist: [
    {
      pattern: /^wanted-poster--(bronze|prata|ouro|esmeralda|safira|rubi|ametista|obsidiana|aurora|celestial|solar|lenda|mitico|cosmico|eterno|absoluto)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0a12',
        surface: 'rgba(255, 255, 255, 0.05)',
        primary: '#c4a052', // golden touch
        'primary-light': '#d8bd75',
        'primary-dark': '#7f6835',
      }
    },
  },
  plugins: [],
}