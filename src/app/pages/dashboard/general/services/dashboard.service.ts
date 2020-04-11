import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { map, tap } from 'rxjs/operators';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import moment from 'moment';

@Injectable()
export class DashboardService {
    private calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
        ICalendar[]
    >([]);

    constructor(private calendarApi: CalendarApiService) {}

    getCalendars(): Observable<ICalendar[]> {
        return this.calendars$.asObservable();
    }

    setCalendars(array: ICalendar[]): void {
        this.calendars$.next(array);
    }

    fetchCalendars(): Observable<void> {
        return this.calendarApi.getCalendars().pipe(
            map((data) =>
                data.calendars.map((result) =>
                    CalendarModel.readCalendarDtoImpl(result)
                )
            ),
            tap((data) => {
                this.setCalendars(data);
            }),
            map(() => null)
        );
    }

    getCalendarSelectList(): Observable<{ label: string; value: string }[]> {
        return this.getCalendars().pipe(
            map((data) => {
                return data.map((calendar) => {
                    return {
                        label: `${moment(
                            calendar.startDate,
                            'YYYY-MM-DD'
                        ).format('YYYY年MM月DD日')} 改正 ${
                            calendar.calendarName
                        }`,
                        value: calendar.id,
                    };
                });
            })
        );
    }
}
