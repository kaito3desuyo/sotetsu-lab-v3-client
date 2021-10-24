module.exports = {
    purge: {
        enabled: process.env.TAILWIND_MODE === 'build',
        content: ['./src/**/*.{html,scss,ts}'],
    },
    darkMode: false, // or 'media' or 'class'
    theme: {
        extend: {},
    },
    variants: {
        extend: {},
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
};
