// tailwind.config.js
const {heroui} = require("@heroui/theme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./node_modules/@heroui/theme/dist/components/(number-input|button|ripple|spinner|form).js",
  ],
  theme: {
    extend: {
      colors: {
        grade: {
          1: "#D97D55",
          2: "#A8FBD3",
          3: "#F97A00",
          4: "#1B3C53"
        },
        "redish": "#BF092F"
      }
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};