import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
    it.each([
        ['/operation/real-time', '/operation/real-time'],
        [
            '/timetable/station?stationId=1#a',
            '/timetable/station?stationId=1#a',
        ],
        ['/', '/'],
    ])('サイト内の相対パス %s はそのまま', (input, expected) => {
        expect(safeReturnTo(input)).toBe(expected);
    });

    it.each([
        [null],
        [undefined],
        [''],
        ['operation'],
        ['//evil.example'],
        ['/\\evil.example'],
        ['https://evil.example'],
        ['javascript:alert(1)'],
        ['%2F%2Fevil.example'],
        ['/login'],
        ['/login?return_to=/'],
        ['/register'],
    ])('%s は / に戻す', (input) => {
        expect(safeReturnTo(input)).toBe('/');
    });
});
