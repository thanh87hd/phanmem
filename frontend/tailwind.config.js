/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#ea9105', // LPBank Deep Gold
        'earth-brown': '#593116', // LPBank Earth Brown
        'warm-yellow': '#f2a93b', // LPBank Warm Yellow
        'cream': '#fdf9f2',
      }
    },
  },
  plugins: [],
}
