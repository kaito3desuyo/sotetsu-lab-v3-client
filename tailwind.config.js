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
            primary: {
                50: '#e0e3eb',
                100: '#b3b9cc',
                200: '#808aab',
                300: '#4d5b89',
                400: '#26386f',
                500: '#001556',
                600: '#00124f',
                700: '#000f45',
                800: '#000c3c',
                900: '#00062b',
                A100: '#656bff',
                A200: '#323aff',
                A400: '#000afe',
                A700: '#0009e5',
            },
            accent: {
                50: '#fdefe7',
                100: '#fad7c2',
                200: '#f7bd9a',
                300: '#f3a372',
                400: '#f18f53',
                500: '#ee7b35',
                600: '#ec7330',
                700: '#e96828',
                800: '#e75e22',
                900: '#e24b16',
                A100: '#ffffff',
                A200: '#ffe7e0',
                A400: '#ffbfad',
                A700: '#ffac93',
            },
        },
        extend: {
            gridTemplateAreas: {
                'dashboard-full': [
                    'description description description',
                    'operation-search-card operation-post-card library-list-card',
                    'adsense adsense library-list-card',
                    'timetable-search-card timetable-post-card library-list-card',
                ],
                'dashboard-medium': [
                    'description description',
                    'operation-search-card operation-post-card',
                    'adsense adsense',
                    'timetable-search-card timetable-post-card',
                    'library-list-card library-list-card',
                ],
                'dashboard-slim': [
                    'description',
                    'operation-search-card',
                    'operation-post-card',
                    'adsense',
                    'timetable-search-card',
                    'timetable-post-card',
                    'library-list-card',
                ],
            },
        },
    },
    plugins: [require('@savvywombat/tailwindcss-grid-areas')],
    corePlugins: {
        preflight: false,
    },
};
