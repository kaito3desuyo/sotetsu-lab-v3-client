import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { map, tap } from 'rxjs/operators';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

@Injectable()
export class TimetableAddService {
  calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<ICalendar>(null);
  tripDirection$: BehaviorSubject<'0' | '1'> = new BehaviorSubject<'0' | '1'>(
    null
  );

  constructor(private calendarApi: CalendarApiService) {}

  getCalendar(): Observable<ICalendar> {
    return this.calendar$.asObservable();
  }

  setCalendar(calendar: ICalendar): void {
    this.calendar$.next(calendar);
  }

  fetchCalendar(id: string): Observable<void> {
    return this.calendarApi.getCalendarById(id).pipe(
      map(data => CalendarModel.readCalendarDtoImpl(data.calendar)),
      tap(data => {
        this.setCalendar(data);
      }),
      map(() => null)
    );
  }

  getTripDirection(): Observable<'0' | '1'> {
    return this.tripDirection$.asObservable();
  }

  setTripDirection(direction: '0' | '1'): void {
    this.tripDirection$.next(direction);
  }
}
