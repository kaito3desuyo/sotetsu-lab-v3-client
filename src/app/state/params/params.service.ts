import { Injectable } from '@angular/core';
import { ParamsStore } from './params.store';
import { HttpClient } from '@angular/common/http';
import { tap, map } from 'rxjs/operators';
import { Observable, forkJoin } from 'rxjs';
import { CalenderApiService } from 'src/app/general/api/calender-api.service';
import moment from 'moment';
import { CalenderModel } from 'src/app/general/models/calender/calender-model';

@Injectable({ providedIn: 'root' })
export class ParamsService {
  constructor(
    private paramsStore: ParamsStore,
    private calenderApi: CalenderApiService
  ) {}

  fetch(): Observable<void> {
    return forkJoin([
      this.calenderApi
        .searchCalenders({
          date: moment()
            .subtract(moment().hour() < 4 ? 1 : 0, 'days')
            .format('YYYY-MM-DD')
        })
        .pipe(
          map(data =>
            data.calenders.map(result =>
              CalenderModel.readCalenderDtoImpl(result)
            )
          )
        )
    ]).pipe(
      tap(([calenders]) => {
        this.paramsStore.update({ calenderId: calenders[0].id });
      }),
      map(() => null)
    );
  }
}
