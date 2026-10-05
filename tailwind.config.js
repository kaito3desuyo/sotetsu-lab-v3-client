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
            // docs/design.md のトークンを Tailwind から引くための別名。
            // 値の実体は src/tokens.css。ここには生値を書かない。
            paper: 'var(--color-paper)',
            'paper-2': 'var(--color-paper-2)',
            'paper-3': 'var(--color-paper-3)',
            ink: 'var(--color-ink)',
            'ink-2': 'var(--color-ink-2)',
            muted: 'var(--color-muted)',
            rule: 'var(--color-rule)',
            'rule-strong': 'var(--color-rule-strong)',
            structure: 'var(--color-structure)',
            'accent-ink': 'var(--color-accent-ink)',
            'accent-deep': 'var(--color-accent-deep)',
            'recency-today': 'var(--color-recency-today)',
            'recency-yesterday': 'var(--color-recency-yesterday)',
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
            // docs/design.md の角丸トークン。値の実体は src/tokens.css。
            // カードは必ず tw-rounded-card を使う（0px / 4px / 8px の混在を防ぐ）。
            borderRadius: {
                card: 'var(--radius-card)',
                control: 'var(--radius-control)',
                chip: 'var(--radius-chip)',
            },
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
