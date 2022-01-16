import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import { IOperationRealTimeTableData } from '../interfaces/operation-real-time-table-data.interface';

@Pipe({
    name: 'operationRealTimeFormationNumberStyle',
})
export class OperationRealTimeFormationNumberStylePipe
    implements PipeTransform
{
    transform(element: IOperationRealTimeTableData): { [key: string]: string } {
        const dayCount =
            element.operationSighting &&
            this._calculateDayCountFromToday(
                element.operationSighting.sightingTime
            );

        const color =
            !element.operationSighting ||
            !element.operationSighting.circulatedOperationId
                ? 'rgba(0, 0, 0, 0.60)'
                : 'initial';
        const fontWeight = dayCount === 0 ? '700' : '400';
        const textDecoration = dayCount === 1 ? 'underline' : 'none';

        return {
            ['color']: color,
            ['font-weight']: fontWeight,
            ['text-decoration']: textDecoration,
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
