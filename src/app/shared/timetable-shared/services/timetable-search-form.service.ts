import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { map, tap } from 'rxjs/operators';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

@Injectable()
export class TimetableSearchFormService {
  private _calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
    ICalendar[]
  >([]);

  constructor(private calendarApi: CalendarApiService) {}

  getCalendars(): Observable<ICalendar[]> {
    return this._calendars$.asObservable();
  }

  setCalendars(calendars: ICalendar[]): void {
    this._calendars$.next(calendars);
  }

  fetchCalendars(): Observable<void> {
    return this.calendarApi.getCalendars().pipe(
      map(data =>
        data.calendars.map(o => CalendarModel.readCalendarDtoImpl(o))
      ),
      tap(data => {
        this.setCalendars(data);
      }),
      map(() => null)
    );
  }
}
