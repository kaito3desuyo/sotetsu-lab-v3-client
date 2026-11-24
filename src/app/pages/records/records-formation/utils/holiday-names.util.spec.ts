import { buildHolidayNames } from './holiday-names.util';

describe('buildHolidayNames', () => {
    it('祝日名を日ごとに取り出す。同じ日の複数行は最初の memo', () => {
        expect(
            buildHolidayNames([
                { calendarDateId: '1', date: '2026-11-03', memo: '文化の日' },
                { calendarDateId: '2', date: '2026-11-03', memo: '文化の日' },
                {
                    calendarDateId: '3',
                    date: '2026-11-23',
                    memo: '勤労感謝の日',
                },
            ]),
        ).toEqual({ '2026-11-03': '文化の日', '2026-11-23': '勤労感謝の日' });
    });

    it('memo が空の行と、特別ダイヤの日は祝日にしない', () => {
        expect(
            buildHolidayNames([
                { calendarDateId: '1', date: '2026-11-05', memo: null },
                { calendarDateId: '2', date: '2026-11-06', memo: '  ' },
                {
                    calendarDateId: '3',
                    date: '2026-11-07',
                    memo: '特別ダイヤ（移行メモ）',
                },
            ]),
        ).toEqual({});
    });
});
