import { isChunkLoadError } from './chunk-load-error';

describe('isChunkLoadError', () => {
    // GA の page_load_error（2026-10-22〜11-10）に出た文言と、Firefox の文言
    it.each([
        'Importing a module script failed.',
        'Failed to fetch dynamically imported module: https://v3.sotetsu-lab.com/chunk-FyUHc9SN.js',
        'error loading dynamically imported module: https://v3.sotetsu-lab.com/chunk-FyUHc9SN.js',
    ])('%p は部品の読み込みの失敗', (message) => {
        expect(isChunkLoadError(new TypeError(message))).toBe(true);
    });

    it.each([
        new TypeError('Failed to fetch'),
        new Error('壊れた'),
        'Importing a module script failed.',
        null,
    ])('%p は違う', (error) => {
        expect(isChunkLoadError(error)).toBe(false);
    });
});
