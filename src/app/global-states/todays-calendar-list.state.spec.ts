import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CalendarService } from '../libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from '../libs/calendar/usecase/dtos/calendar-details.dto';
import { setTodaysCalendars } from './testing/set-todays-calendars';
import { TodaysCalendarListState } from './todays-calendar-list.state';

const calendar = (calendarId: string): CalendarDetailsDto =>
    ({ calendarId, calendarName: calendarId }) as CalendarDetailsDto;

describe('TodaysCalendarListState', () => {
    let findOneBySpecificDate: jest.Mock;
    let store: InstanceType<typeof TodaysCalendarListState>;

    beforeEach(() => {
        findOneBySpecificDate = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: CalendarService,
                    useValue: { findOneBySpecificDate },
                },
            ],
        });
        store = TestBed.inject(TodaysCalendarListState);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('取る前は今日のダイヤが無い', () => {
        expect(store.todaysCalendarId()).toBeUndefined();
        expect(store.todaysCalendarIds()).toEqual([]);
    });

    it('取ると今日のダイヤの ID が読める', () => {
        findOneBySpecificDate.mockReturnValue(of(calendar('today')));

        store.fetch().subscribe();

        expect(store.todaysCalendarId()).toBe('today');
        expect(store.todaysCalendarIds()).toEqual(['today']);
    });

    it('取り直すと置き換わる', () => {
        findOneBySpecificDate.mockReturnValue(of(calendar('a')));
        store.fetch().subscribe();
        findOneBySpecificDate.mockReturnValue(of(calendar('b')));

        store.fetch().subscribe();

        expect(store.todaysCalendarIds()).toEqual(['b']);
    });

    it('複数あれば先頭を今日のダイヤとし、ID は渡した順のまま返す', () => {
        setTodaysCalendars(['c', 'a', 'b']);

        expect(store.todaysCalendarId()).toBe('c');
        expect(store.todaysCalendarIds()).toEqual(['c', 'a', 'b']);
    });

    it('鉄道日で今日の日付を渡す（4 時前は前日）。取るたびに今の時刻で決める', () => {
        findOneBySpecificDate.mockReturnValue(of(calendar('today')));
        jest.useFakeTimers({ now: new Date(2026, 9, 27, 2, 0) });

        store.fetch().subscribe();
        jest.setSystemTime(new Date(2026, 9, 27, 5, 0));
        store.fetch().subscribe();

        expect(findOneBySpecificDate.mock.calls).toEqual([
            [{ date: '2026-10-26' }],
            [{ date: '2026-10-27' }],
        ]);
    });
});
