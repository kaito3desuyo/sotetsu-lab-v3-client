import { CalendarDateDtoBuilder } from './calendar-date.dto.builder';

describe('CalendarDateDtoBuilder', () => {
    it('id を calendarDateId にし、ほかの項目はそのまま写す', () => {
        const dto = CalendarDateDtoBuilder.buildFromModel({
            id: 'cd-1',
            date: '2026-09-23',
            exceptionType: 1,
            memo: null,
        });

        expect(dto).toEqual({
            calendarDateId: 'cd-1',
            date: '2026-09-23',
            exceptionType: 1,
            memo: null,
        });
        expect(dto).not.toHaveProperty('id');
    });
});
