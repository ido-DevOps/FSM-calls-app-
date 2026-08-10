/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0f172a",
        accent: "#f59e0b",
      },
      fontFamily: {
        // Tailwind's default `font-mono` stack is a CSS font-family list —
        // React Native's Text needs a single real platform font name, or it
        // warns and silently falls back. "monospace" is Android's built-in
        // generic alias (used throughout for serials/call numbers).
        mono: "monospace",
      },
    },
  },
  plugins: [],
};
