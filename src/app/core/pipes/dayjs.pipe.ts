import { Pipe, PipeTransform } from '@angular/core';
import dayjs from 'dayjs';
import { isString } from 'lodash-es';
import { isMoment } from 'moment';

@Pipe({
    name: 'dayjs',
})
export class DayjsPipe implements PipeTransform {
    transform(value: unknown, args: { format: string }): string {
        if (isString(value)) {
            const instance = dayjs(value);
            return instance.isValid() ? instance.format(args.format) : '';
        }

        if (isMoment(value)) {
            const instance = dayjs(value.toDate());
            return instance.isValid() ? instance.format(args.format) : '';
        }

        return '';
    }
}
