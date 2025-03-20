const { Sidebar } = require("lucide-react");

module.exports = {
  purge: [],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sarabun: ['Sarabun', 'sans-serif'],
        mali: ['Mali', 'sans-serif'],
        'noto-sans-thai': ['Noto Sans Thai', 'sans-serif'],
      },
      colors: {
        sidebarBG: "#015551",
        sidebarHover: "#57B4BA",
        pageBG: "#FDFBEE",
        logoutBT: "#FE4F2D",
      },
    },
  },
  variants: {},
  plugins: [],
}