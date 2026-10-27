import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';
import { CalendarListState } from './calendar-list.state';

const calendar = (calendarId: string): CalendarDetailsDto =>
    ({ calendarId, calendarName: calendarId }) as CalendarDetailsDto;

describe('CalendarListState', () => {
    let findMany: jest.Mock;
    let store: InstanceType<typeof CalendarListState>;

    beforeEach(() => {
        findMany = jest.fn();
        TestBed.configureTestingModule({
            providers: [{ provide: CalendarService, useValue: { findMany } }],
        });
        store = TestBed.inject(CalendarListState);
    });

    it('取る前は空', () => {
        expect(store.calendars()).toEqual([]);
        expect(store.entityMap()['x']).toBeUndefined();
    });

    it('fetch に渡した順のまま返る（ID の順に並べ替えない）', () => {
        findMany.mockReturnValue(
            of([calendar('c'), calendar('a'), calendar('b')]),
        );

        store.fetch().subscribe();

        expect(store.calendars().map((c) => c.calendarId)).toEqual([
            'c',
            'a',
            'b',
        ]);
    });

    it('ID で引ける', () => {
        findMany.mockReturnValue(of([calendar('a'), calendar('b')]));

        store.fetch().subscribe();

        expect(store.entityMap()['b']?.calendarId).toBe('b');
    });

    it('サービス名を付けて取る', () => {
        findMany.mockReturnValue(of([]));

        store.fetch().subscribe();

        expect(findMany).toHaveBeenCalledWith({
            serviceName:
                '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        });
    });
});
