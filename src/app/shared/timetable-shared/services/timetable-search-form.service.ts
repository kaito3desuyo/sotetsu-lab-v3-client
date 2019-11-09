import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { map, tap } from 'rxjs/operators';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { ITimetableSearchForm } from '../interfaces/timetable-search-form';

@Injectable()
export class TimetableSearchFormService {
  private _params$: BehaviorSubject<ITimetableSearchForm> = new BehaviorSubject<
    ITimetableSearchForm
  >({
    calendarId: '',
    tripDirection: '0',
    isSearchStation: false,
    stationId: ''
  });

  private _calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
    ICalendar[]
  >([]);

  constructor(private calendarApi: CalendarApiService) {}

  getParams(): Observable<ITimetableSearchForm> {
    return this._params$.asObservable();
  }

  setParams(params: ITimetableSearchForm): void {
    this._params$.next(params);
  }

  updateParams(params: Partial<ITimetableSearchForm>): void {
    const current = this._params$.getValue();
    this.setParams({
      ...current,
      ...params
    });
  }

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
