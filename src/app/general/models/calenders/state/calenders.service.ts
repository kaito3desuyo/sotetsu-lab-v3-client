import { Injectable } from '@angular/core';
import { ID } from '@datorama/akita';
import { CalendersStore } from './calenders.store';
import { tap, throttleTime, flatMap } from 'rxjs/operators';
import { CalenderApiService } from 'src/app/general/api/calender-api.service';
import { CurrentParamsStore } from '../../current-params/current-params.store';
import { ICalender } from 'src/app/general/interfaces/calender';
import moment from 'moment';
import { BehaviorSubject, of, Observable } from 'rxjs';
import { BaseService } from 'src/app/general/classes/base-service';
import { CalendersQuery } from './calenders.query';
import { CurrentParamsQuery } from '../../current-params/current-params.query';
import { HttpClient } from '@angular/common/http';
import { CurrentParamsService } from '../../current-params/current-params.service';

@Injectable({ providedIn: 'root' })
export class CalendersService extends BaseService {
  private fetch: BehaviorSubject<void> = new BehaviorSubject<void>(null);

  constructor(
    private http: HttpClient,
    private calendersQuery: CalendersQuery,
    private calendersStore: CalendersStore,
    private currentParamsQuery: CurrentParamsQuery,
    private currentParamsService: CurrentParamsService,
    private calenderApiService: CalenderApiService
  ) {
    super();
    this.subscription = this.fetch.pipe(throttleTime(1000)).subscribe(() => {
      this.calenderApiService
        .getCalenders()
        .pipe(
          tap(entities => {
            this.calendersStore.set(entities);
            this.setTodaysCalenderId();
          })
        )
        .subscribe();
    });
  }

  get() {
    this.fetch.next();
    return of('success');
  }

  add(calender: ICalender) {
    this.calendersStore.add(calender);
  }

  update(id, calender: Partial<ICalender>) {
    this.calendersStore.update(id, calender);
  }

  remove(id: ID) {
    this.calendersStore.remove(id);
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

  setTodaysCalenderId() {
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
          return this.calendersQuery.selectEntity((e: ICalender) => {
            return (
              moment(e.startDate, 'YYYY-MM-DD') <= moment() &&
              e.endDate === null &&
              e[dayOfWeek] === true
            );
          });
        })
      )
      .subscribe(result => {
        this.currentParamsService.update({ calenderId: result.id });
      });
  }

  generateCalenderSelectList(
    calenders: ICalender[]
  ): { label: string; value: string }[] {
    return calenders.map(calender => {
      return {
        label:
          moment(calender.startDate).format('YYYY年MM月DD日改正') +
          ' ' +
          calender.calenderName,
        value: calender.id
      };
    });
  }
}
