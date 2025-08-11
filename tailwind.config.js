/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: "#00B4D8",
        dark: "#112f46",
        accent: "#00ffea", // ✅ este color es necesario para los botones
      },
    },
  },
  plugins: [],
};
