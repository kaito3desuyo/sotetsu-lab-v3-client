/** @type {import('tailwindcss').Config} */
const colors = require('material-ui-colors');

module.exports = {
    prefix: 'tw-',
    content: ['./src/**/*.{html,ts,scss}'],
    theme: {
        colors: {
            ...colors,
            white: colors.common.white,
            black: colors.common.black,
        },
        extend: {},
    },
    plugins: [],
};
