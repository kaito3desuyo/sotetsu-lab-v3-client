import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'myDate'
})
export class MyDatePipe implements PipeTransform {
  transform(value: any, args?: any): any {
    moment.locale('ja');
    return moment(value).format(args);
  }
}
