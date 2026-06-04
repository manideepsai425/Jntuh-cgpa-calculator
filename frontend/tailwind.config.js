/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy:   "#050812",
        cyan:   "#00E5FF",
        violet: "#B345F1",
        amber:  "#FF9500",
        emerald:"#00FF88",
        rose:   "#FF3B30",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        jet:  ["JetBrains Mono", "monospace"],
        dm:   ["DM Sans", "sans-serif"],
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse_glow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(0,229,255,0.25)" },
          "50%":      { boxShadow: "0 0 40px rgba(0,229,255,0.55)" },
        },
      },
      animation: {
        "fade-up":   "fade-up 0.45s ease both",
        pulse_glow:  "pulse_glow 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
