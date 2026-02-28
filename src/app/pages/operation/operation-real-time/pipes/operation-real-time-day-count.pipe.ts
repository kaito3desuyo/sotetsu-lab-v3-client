import { Pipe, type PipeTransform } from '@angular/core';
import { calculateDayCountFromToday } from 'src/app/core/utils/calculate-day-count-from-today';

@Pipe({
    name: 'operationRealTimeDayCount',
})
export class OperationRealTimeDayCountPipe implements PipeTransform {
    transform(dateTime: string): number {
        const dayCount = calculateDayCountFromToday(dateTime);
        return dayCount;
    }
}
