import { Injectable } from '@angular/core';
import { ID } from '@datorama/akita';
import { CalendarsStore } from './calendars.store';
import { tap, throttleTime, flatMap } from 'rxjs/operators';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import moment from 'moment';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { BaseService } from 'src/app/general/classes/base-service';
import { CalendarsQuery } from './calendars.query';
import { CurrentParamsQuery } from '../../current-params/current-params.query';
import { HttpClient } from '@angular/common/http';
import { CurrentParamsService } from '../../current-params/current-params.service';
import { Resolve } from '@angular/router';
import { CalendarModel } from '../../calendar/calendar-model';

@Injectable({ providedIn: 'root' })
export class CalendarsService extends BaseService {
  private fetch: BehaviorSubject<void> = new BehaviorSubject<void>(null);

  constructor(
    private http: HttpClient,
    private calendarsQuery: CalendarsQuery,
    private calendarsStore: CalendarsStore,
    private currentParamsQuery: CurrentParamsQuery,
    private currentParamsService: CurrentParamsService,
    private calendarApiService: CalendarApiService
  ) {
    super();
    this.subscription = this.fetch.pipe(throttleTime(1000)).subscribe(() => {
      this.calendarApiService
        .getCalendars()
        .pipe(
          tap(entities => {
            const calendars = entities.calendars.map(data =>
              CalendarModel.readCalendarDtoImpl(data)
            );
            this.calendarsStore.set(calendars);
            this.setTodaysCalendarId();
          })
        )
        .subscribe();
    });
  }

  get() {
    this.fetch.next();
    return of('success');
  }

  add(calendar: ICalendar) {
    this.calendarsStore.add(calendar);
  }

  update(id, calendar: Partial<ICalendar>) {
    this.calendarsStore.update(id, calendar);
  }

  remove(id: ID) {
    this.calendarsStore.remove(id);
  }

  checkHoliday(date: moment.Moment): Observable<any> {
    return this.http.get(
      `http://s-proj.com/utils/checkHoliday.php?kind=h&date=${date.format(
        'YYYYMMDD'
      )}`
    );
  }

  setWeekdayOrHoliday(day: 'weekday' | 'holiday') {
    this.currentParamsService.update({ day });
  }

  setTodaysCalendarId() {
    /*
    this.subscription = this.currentParamsQuery.day$
      .pipe(
        flatMap(day => {
          const dayOfWeek =
            day === 'holiday'
              ? 'sunday'
              : moment()
                  .subtract(moment().hour() < 4 ? 1 : 0)
                  .format('dddd')
                  .toLowerCase();
          return this.calendarsQuery.selectEntity((e: ICalendar) => {
            return (
              moment(e.startDate, 'YYYY-MM-DD') <= moment() &&
              e.endDate === null &&
              e[dayOfWeek] === true
            );
          });
        })
      )
      .subscribe(result => {
        this.currentParamsService.update({ calendarId: result.id });
      });
      */
  }

  generateCalendarSelectList(
    calendars: ICalendar[]
  ): { label: string; value: string }[] {
    return calendars.map(calendar => {
      return {
        label:
          moment(calendar.startDate).format('YYYY年MM月DD日改正') +
          ' ' +
          calendar.calendarName,
        value: calendar.id
      };
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class CalendarTodaysCalendarIdResolverService
  implements Resolve<Observable<void>> {
  constructor(private calendarService: CalendarsService) {}

  resolve() {
    return of(null);
  }
}
