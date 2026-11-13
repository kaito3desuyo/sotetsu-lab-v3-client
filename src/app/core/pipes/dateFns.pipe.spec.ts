import { DateFnsPipe } from './dateFns.pipe';

describe('DateFnsPipe', () => {
    const pipe = new DateFnsPipe();

    it('オフセット Z の時点は日本時間で書く', () => {
        expect(
            pipe.transform('2026-11-13T01:30:00Z', {
                format: 'HH:mm',
                parseISO: true,
            }),
        ).toBe('10:30');
    });

    it('オフセット +00:00 の時点は日本時間で書く', () => {
        expect(
            pipe.transform('2026-11-13T01:30:00+00:00', {
                format: 'HH:mm',
                parseISO: true,
            }),
        ).toBe('10:30');
    });

    it('オフセット +0000（コロン無し）の時点も日本時間で書く', () => {
        expect(
            pipe.transform('2026-11-13T01:30:00+0000', {
                format: 'HH:mm',
                parseISO: true,
            }),
        ).toBe('10:30');
    });

    it('UNIX 秒（数値）は日本時間で書く', () => {
        expect(
            pipe.transform(Date.parse('2026-11-13T01:30:00Z') / 1000, {
                format: 'HH:mm',
            }),
        ).toBe('10:30');
    });

    it('日付だけの文字列はそのままの日付で書く', () => {
        expect(
            pipe.transform('2026-11-13', { format: 'M/d', parseISO: true }),
        ).toBe('11/13');
    });

    it('オフセットの無い日時は壁時計のまま書く', () => {
        expect(
            pipe.transform('2026-11-13T10:30:00', {
                format: 'HH:mm',
                parseISO: true,
            }),
        ).toBe('10:30');
    });

    it('parseFormat で読んだ壁時計の時刻はそのまま書く', () => {
        expect(
            pipe.transform('10:05:00', {
                format: 'HH:mm',
                parseFormat: 'HH:mm:ss',
            }),
        ).toBe('10:05');
    });
});
