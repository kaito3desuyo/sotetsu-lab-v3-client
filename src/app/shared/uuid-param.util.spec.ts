import { parseUuidParam } from './uuid-param.util';

describe('parseUuidParam', () => {
    it('UUID はそのまま返す', () => {
        expect(parseUuidParam('de94e6b3-6d6c-445e-9c35-c8f39bacf3fb')).toBe(
            'de94e6b3-6d6c-445e-9c35-c8f39bacf3fb',
        );
    });

    it('大文字の UUID も読む', () => {
        expect(parseUuidParam('DE94E6B3-6D6C-445E-9C35-C8F39BACF3FB')).toBe(
            'DE94E6B3-6D6C-445E-9C35-C8F39BACF3FB',
        );
    });

    // Angular は matrix の値の undefined を文字列 "undefined" として URL に書く（2026-11-07 の本番）
    it.each([null, '', 'undefined', 'null', 'abc', 'de94e6b3-6d6c-445e-9c35'])(
        '%p は null',
        (raw) => {
            expect(parseUuidParam(raw)).toBeNull();
        },
    );
});
