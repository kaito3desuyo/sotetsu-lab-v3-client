import { Pipe, PipeTransform } from '@angular/core';
import { calculateDayCountFromToday } from '../utils/calculate-day-count-from-today';

@Pipe({
    name: 'calculateDayCountFromToday',
    standalone: false
})
export class CalculateDayCountFromTodayPipe implements PipeTransform {
    transform(dateTime: string): number {
        return calculateDayCountFromToday(dateTime);
    }
}
