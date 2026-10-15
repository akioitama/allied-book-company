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
        mist: "#F4F8FF",
        navy: {
          DEFAULT: "#0F172A",
          soft: "#1E293B",
        },
        parchment: {
          DEFAULT: "#FFFFFF",
          deep: "#EFF6FF",
        },
        ink: {
          DEFAULT: "#0F172A",
          soft: "#334155",
        },
        forest: "#1E3A8A",
        oxblood: "#2563EB",
        brass: {
          DEFAULT: "#93C5FD",
          light: "#BFDBFE",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "Georgia", "serif"],
        label: ["var(--font-label)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        ambient: "0 16px 40px rgba(37, 99, 235, 0.12)",
        seal: "0 10px 30px rgba(37, 99, 235, 0.4)",
        lift: "0 28px 60px rgba(30, 58, 138, 0.18)",
      },
      backgroundImage: {
        "map-grid":
          "linear-gradient(rgba(147,197,253,0.45) 1px, transparent 1px), linear-gradient(90deg, rgba(147,197,253,0.45) 1px, transparent 1px)",
        "ocean-hero":
          "radial-gradient(ellipse at 75% 15%, rgba(59,130,246,0.55), transparent 45%), radial-gradient(ellipse at 15% 85%, rgba(37,99,235,0.7), transparent 50%), linear-gradient(150deg, #0F172A 0%, #1E3A8A 42%, #2563EB 100%)",
      },
      backgroundSize: {
        "map-grid": "48px 48px",
      },
      keyframes: {
        "needle-settle": {
          "0%": { transform: "rotate(var(--needle-from, 0deg))" },
          "60%": { transform: "rotate(calc(var(--needle-to, 0deg) + 8deg))" },
          "100%": { transform: "rotate(var(--needle-to, 0deg))" },
        },
        "route-dash": {
          to: { strokeDashoffset: "-24" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "seal-press": {
          "0%": { transform: "scale(1.35) rotate(-10deg)", opacity: "0" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "ink-bloom": {
          "0%": { transform: "scale(0.4)", opacity: "0.45" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        "meridian-drift": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-48px)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.9)", opacity: "0.5" },
          "100%": { transform: "scale(1.4)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "van-drive": {
          "0%, 100%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(6px)" },
        },
        "van-wheel": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "promo-shimmer": {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        "promo-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(96,165,250,0.45)" },
          "50%": { boxShadow: "0 0 0 6px rgba(96,165,250,0)" },
        },
      },
      animation: {
        "needle-settle": "needle-settle 0.7s ease-out forwards",
        "route-dash": "route-dash 1.2s linear infinite",
        "fade-up": "fade-up 0.8s cubic-bezier(0.22,1,0.36,1) both",
        "seal-press": "seal-press 0.55s ease-out both",
        "ink-bloom": "ink-bloom 0.9s ease-out forwards",
        "meridian-drift": "meridian-drift 24s linear infinite",
        "pulse-ring": "pulse-ring 2.6s ease-out infinite",
        float: "float 6s ease-in-out infinite",
        "van-drive": "van-drive 1.8s ease-in-out infinite",
        "van-wheel": "van-wheel 0.9s linear infinite",
        "promo-shimmer": "promo-shimmer 2.8s linear infinite",
        "promo-pulse": "promo-pulse 2.2s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
