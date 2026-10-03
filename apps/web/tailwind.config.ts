import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {
    colors: { aternos: { blue: '#2F80ED', darkBlue: '#1B5EBE', deepNavy: '#0E3A75', ice: '#EBF3FE', border: '#D1D5DB', darkBorder: '#1B5EBE', surface: '#FFFFFF', canvas: '#F3F6FA' } },
    boxShadow: { blocky: '0 4px 0 #1B5EBE', 'blocky-sm': '0 2px 0 #1B5EBE', 'blocky-red': '0 4px 0 #991B1B', 'blocky-green': '0 4px 0 #166534', 'blocky-card': '0 4px 0 #CBD5E1' },
    borderRadius: { blocky: '3px' }
  } },
  plugins: []
};
export default config;
