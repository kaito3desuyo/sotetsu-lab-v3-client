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
