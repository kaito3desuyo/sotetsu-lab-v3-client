import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';

@Pipe({
    name: 'operationRealTimeTimeColor',
})
export class OperationRealTimeTimeColorPipe implements PipeTransform {
    transform(dateTime: string): { [key: string]: string } {
        const dayCount = this._calculateDayCountFromToday(dateTime);

        return {
            color:
                dayCount === 0
                    ? '#f44336'
                    : dayCount === 1
                    ? '#4caf50'
                    : 'initial',
        };
    }

    private _calculateDayCountFromToday(dateTime: string): number {
        const target = dayjs(dateTime).subtract(
            dayjs(dateTime).hour() < 4 ? 1 : 0,
            'days'
        );
        const now = dayjs().subtract(dayjs().hour() < 4 ? 1 : 0, 'days');

        return now
            .hour(0)
            .minute(0)
            .second(0)
            .millisecond(0)
            .diff(target.hour(0).minute(0).second(0).millisecond(0), 'days');
    }
}
