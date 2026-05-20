import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FDF8F2",
        terracotta: {
          DEFAULT: "#C94B2A",
          light: "#E8604A",
          dark: "#A33820",
        },
        dark: {
          DEFAULT: "#1C1008",
          muted: "#3D2A1A",
        },
        sand: "#E8D5B7",
        sage: "#7A9E7E",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        sans: ["system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "9999px",
        card: "16px",
      },
    },
  },
  plugins: [],
};

export default config;
