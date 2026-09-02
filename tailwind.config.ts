import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gov: {
          blue: "#0c3b6d",
          dark: "#072444",
          light: "#1e5b9c",
          gold: "#d49b28",
          goldLight: "#f4c462",
          red: "#b91c1c",
          emerald: "#047857",
        }
      },
    },
  },
  plugins: [],
};
export default config;
