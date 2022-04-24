import { Pipe, PipeTransform } from '@angular/core';
import { calculateDayCountFromToday } from 'src/app/core/utils/calculate-day-count-from-today';
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
            calculateDayCountFromToday(element.operationSighting.sightingTime);

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
}
