import { Injectable } from '@angular/core';
import { ICalender } from 'src/app/general/interfaces/calender';
import moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  constructor() {}

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
