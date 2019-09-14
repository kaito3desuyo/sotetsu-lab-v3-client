import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { CalenderApiService } from 'src/app/general/api/calender-api.service';
import { ICalender } from 'src/app/general/interfaces/calender';
import { map, tap } from 'rxjs/operators';
import { CalenderModel } from 'src/app/general/models/calender/calender-model';
import moment from 'moment';

@Injectable()
export class DashboardService {
  private calenders$: BehaviorSubject<ICalender[]> = new BehaviorSubject<
    ICalender[]
  >([]);

  constructor(private calenderApi: CalenderApiService) {}

  getCalenders(): Observable<ICalender[]> {
    return this.calenders$.asObservable();
  }

  setCalenders(array: ICalender[]): void {
    this.calenders$.next(array);
  }

  fetchCalenders(): Observable<void> {
    return this.calenderApi.getCalenders().pipe(
      map(data =>
        data.calenders.map(result => CalenderModel.readCalenderDtoImpl(result))
      ),
      tap(data => {
        this.setCalenders(data);
      }),
      map(() => null)
    );
  }

  getCalenderSelectList(): Observable<{ label: string; value: string }[]> {
    return this.getCalenders().pipe(
      map(data => {
        return data.map(calender => {
          return {
            label: `${moment(calender.startDate, 'YYYY-MM-DD').format(
              'YYYY年MM月DD日'
            )} 改正 ${calender.calenderName}`,
            value: calender.id
          };
        });
      })
    );
  }
}
