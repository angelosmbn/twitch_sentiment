module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
      extend: {
        colors: {
          'twitch-dark': '#18181b',
          'twitch-purple': '#9146FF',
          'twitch-hover': '#a970ff',
        },        
        fontFamily: {
          // Adding a custom font family, similar to Twitch's clean and modern look
          sans: ['Helvetica Neue', 'Arial', 'sans-serif'],
        },
        spacing: {
          // Adding custom spacing values for layout adjustments
          '128': '32rem', // Example: custom large space
          '144': '36rem', // Example: custom large space
        },
        boxShadow: {
          // Custom shadow for buttons and cards
          'twitch-card': '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    plugins: [],
  }
  