/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', "system-ui", "sans-serif"],
        sans: ['"Figtree"', "system-ui", "sans-serif"],
      },
      colors: {
        surface: {
          DEFAULT: "var(--color-surface)",
          raised: "var(--color-surface-raised)",
          overlay: "var(--color-surface-overlay)",
        },
        accent: {
          DEFAULT: "#ff6b4a",
          hover: "#ff8266",
          muted: "rgba(255, 107, 74, 0.15)",
          glow: "rgba(255, 107, 74, 0.35)",
        },
        ink: {
          DEFAULT: "var(--color-ink)",
          muted: "var(--color-ink-muted)",
          faint: "var(--color-ink-faint)",
        },
        theme: {
          border: "var(--color-border)",
          hover: "var(--color-hover)",
          elevated: "var(--color-elevated)",
        },
      },
      boxShadow: {
        glow: "0 0 40px -8px var(--color-accent-glow)",
        card: "0 4px 24px -4px var(--shadow-card)",
        "card-hover": "0 12px 40px -8px var(--shadow-card-hover)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out forwards",
        "fade-in": "fadeIn 0.4s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      aspectRatio: {
        "16/9": "16 / 9",
        "4/3": "4 / 3",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/aspect-ratio"),
  ],
};
