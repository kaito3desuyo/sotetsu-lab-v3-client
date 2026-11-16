import { CalendarModel } from '../models/calendar.model';
import { CalendarDtoBuilder } from './calendar.dto.builder';

describe('CalendarDtoBuilder', () => {
    it('id を calendarId にし、ほかの項目はそのまま写す', () => {
        const dto = CalendarDtoBuilder.buildFromModel({
            id: 'c-1',
            calendarName: '平日ダイヤ',
            endDate: null,
        } as CalendarModel);

        expect(dto).toEqual({
            calendarId: 'c-1',
            calendarName: '平日ダイヤ',
            endDate: null,
        });
        expect(dto).not.toHaveProperty('id');
    });
});
