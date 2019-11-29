import { Injectable } from '@angular/core';
import { CurrentParamsStore, CurrentParamsState } from './current-params.store';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import moment from 'moment';
import { map, tap, flatMap } from 'rxjs/operators';
import { CalendarApiService } from '../../api/calendar-api.service';
import { CurrentParamsQuery } from './current-params.query';

@Injectable({ providedIn: 'root' })
export class CurrentParamsService {
    constructor(
        private currentParamsStore: CurrentParamsStore,
        private currentParamsQuery: CurrentParamsQuery,
        private http: HttpClient,
        private calendarApi: CalendarApiService
    ) {}

    update(value: Partial<CurrentParamsState>) {
        this.currentParamsStore.update(value);
        localStorage.setItem(
            'currentParams',
            JSON.stringify(this.currentParamsQuery.getValue())
        );
    }

    /*
  fetchSpecifiedDateCalendarId(date: string): Observable<string> {
    return this.calendarApi
      .searchCalendars({
        date: date
      })
      .pipe(
        tap(data => {
          this.update({
            calendar: {
              id: data[0].id,
              lastUpdatedAt: moment()
                .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                .format('YYYY-MM-DD')
            }
          });
        }),
        map(data => data[0].id)
      );
  }
  */

    fetchIsTheSpecifiedDayWeekdayOrHoliday(
        date: moment.Moment
    ): Observable<string> {
        return this.http
            .get(
                `http://s-proj.com/utils/checkHoliday.php?kind=h&date=${date.format(
                    'YYYYMMDD'
                )}`
            )
            .pipe(
                map(result => {
                    if (result === 'else') {
                        return 'weekday';
                    } else if (result === 'holiday') {
                        return 'holiday';
                    } else {
                        return null;
                    }
                }),
                tap((day: 'weekday' | 'holiday' | null) => {
                    this.update({ day });
                }),
                flatMap((day: 'weekday' | 'holiday' | null) => {
                    return this.calendarApi.getCalendars();
                }),
                map(() => null)
            );
    }
}
