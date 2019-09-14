import { Injectable } from '@angular/core';
import { CurrentParamsStore, CurrentParamsState } from './current-params.store';
import { Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import moment from 'moment';
import { map, tap, flatMap } from 'rxjs/operators';
import { CalenderApiService } from '../../api/calender-api.service';
import { CurrentParamsQuery } from './current-params.query';

@Injectable({ providedIn: 'root' })
export class CurrentParamsService {
  constructor(
    private currentParamsStore: CurrentParamsStore,
    private currentParamsQuery: CurrentParamsQuery,
    private http: HttpClient,
    private calenderApi: CalenderApiService
  ) {}

  update(value: Partial<CurrentParamsState>) {
    this.currentParamsStore.update(value);
    localStorage.setItem(
      'currentParams',
      JSON.stringify(this.currentParamsQuery.getValue())
    );
  }

  /*
  fetchSpecifiedDateCalenderId(date: string): Observable<string> {
    return this.calenderApi
      .searchCalenders({
        date: date
      })
      .pipe(
        tap(data => {
          this.update({
            calender: {
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
          this.update({ day: day });
        }),
        flatMap((day: 'weekday' | 'holiday' | null) => {
          return this.calenderApi.getCalenders();
        }),
        map(() => null)
      );
  }
}
