import {
    parseBooleanFlag,
    parseDateKey,
    parseIntInRange,
    parseUuid,
    readUrlParam,
} from './url-param';

describe('readUrlParam', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000';

    it('null は missing', () => {
        expect(readUrlParam(null, parseUuid)).toEqual({ kind: 'missing' });
    });

    it('parse が null を返したら invalid', () => {
        expect(readUrlParam('abc', parseUuid)).toEqual({ kind: 'invalid' });
    });

    it('正しい値は ok', () => {
        expect(readUrlParam(uuid, parseUuid)).toEqual({
            kind: 'ok',
            value: uuid,
        });
    });

    it('値が falsy でも ok', () => {
        expect(readUrlParam('false', parseBooleanFlag)).toEqual({
            kind: 'ok',
            value: false,
        });
    });
});

describe('parseDateKey', () => {
    it.each(['2026-11-14', '2028-02-29'])('%s は通す', (raw) => {
        expect(parseDateKey(raw)).toBe(raw);
    });
    it.each(['2026-02-30', '2027-02-29', '20261114', '2026-11-14T00:00', ''])(
        '%s は null',
        (raw) => {
            expect(parseDateKey(raw)).toBeNull();
        },
    );
});

describe('parseIntInRange', () => {
    const parse = parseIntInRange(1, 30);
    it.each(['1', '30', '7'])('%s は通す', (raw) => {
        expect(parse(raw)).toBe(Number(raw));
    });
    it.each([
        '0',
        '31',
        '-3',
        'abc',
        '7.5',
        '',
        ' 7',
        '1e1',
        '07x',
        '07',
        '+7',
    ])('%j は null', (raw) => {
        expect(parse(raw)).toBeNull();
    });
});

describe('parseBooleanFlag', () => {
    it('true / false を通す', () => {
        expect(parseBooleanFlag('true')).toBe(true);
        expect(parseBooleanFlag('false')).toBe(false);
    });
    it.each(['TRUE', '1', ''])('%j は null', (raw) => {
        expect(parseBooleanFlag(raw)).toBeNull();
    });
});
