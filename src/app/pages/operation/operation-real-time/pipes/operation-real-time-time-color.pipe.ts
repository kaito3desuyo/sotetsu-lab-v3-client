import { Pipe, PipeTransform } from '@angular/core';
import { calculateDayCountFromToday } from 'src/app/core/utils/calculate-day-count-from-today';

@Pipe({
    name: 'operationRealTimeTimeColor',
})
export class OperationRealTimeTimeColorPipe implements PipeTransform {
    transform(dateTime: string): { [key: string]: string } {
        const dayCount = calculateDayCountFromToday(dateTime);

        return {
            color:
                dayCount === 0
                    ? '#f44336'
                    : dayCount === 1
                      ? '#4caf50'
                      : 'initial',
        };
    }
}
