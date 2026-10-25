/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: "#102D26",
        teal: { DEFAULT: "#173C35", deep: "#0F332C" },
        ink: "#0B211C",
        lime: "#C7F464",
        coral: "#FF795E",
        sky: "#71C7D8",
        gold: "#FFC857",
        ivory: "#F5F2E9",
        sage: "#A8BDB3",
        line: "#34564B",
        danger: "#FF6B6B",
      },
      fontFamily: {
        sans: ["Manrope", "Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
