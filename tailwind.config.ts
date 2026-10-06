import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        vibely: {
          dark: "#090A0F",       
          surface: "#12141C",    
          border: "#1F2332",     
          primary: "#6366F1",    
          accent: "#EC4899",     
          text: "#F8FAFC",       
          muted: "#94A3B8",      
        }
      },
      boxShadow: {
        'glow': '0 0 20px rgba(99, 102, 241, 0.15)',
        'glow-accent': '0 0 20px rgba(236, 72, 153, 0.15)',
      }
    },
  },
  plugins: [],
};
export default config;
