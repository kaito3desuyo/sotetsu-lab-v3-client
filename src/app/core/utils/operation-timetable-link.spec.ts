import { operationTimetableLink } from './operation-timetable-link';

describe('operationTimetableLink', () => {
    it('日付の形', () => {
        expect(operationTimetableLink('63', { date: '2026-11-16' })).toEqual([
            '/timetable',
            'operation',
            { operation_number: '63', date: '2026-11-16' },
        ]);
    });

    it('ダイヤの形', () => {
        expect(operationTimetableLink('63', { calendarId: 'c1' })).toEqual([
            '/timetable',
            'operation',
            { operation_number: '63', calendar_id: 'c1' },
        ]);
    });

    it('今日の形は日付を付けず、ページが今日を補う（SSR の HTML に日付を焼き込まない）', () => {
        expect(operationTimetableLink('63', 'today')).toEqual([
            '/timetable',
            'operation',
            { operation_number: '63' },
        ]);
        expect(operationTimetableLink(null, 'today')).toBeUndefined();
    });

    it('番号かダイヤが無ければリンクにしない', () => {
        expect(
            operationTimetableLink(null, { date: '2026-11-16' }),
        ).toBeUndefined();
        expect(
            operationTimetableLink('63', { calendarId: null }),
        ).toBeUndefined();
        expect(operationTimetableLink('63', { date: '' })).toBeUndefined();
    });
});
