import { Pipe, PipeTransform } from '@angular/core';
import dayjs, { Dayjs, isDayjs } from 'dayjs';
import { isString } from 'lodash-es';
import { isMoment, Moment } from 'moment';

@Pipe({
    name: 'dayjs',
})
export class DayjsPipe implements PipeTransform {
    transform(
        value: string,
        args: { format: string; parseFormat?: string },
    ): string;
    transform(value: Moment, args: { format: string }): string;
    transform(value: Dayjs, args: { format: string }): string;
    transform(
        value: string | Moment | Dayjs,
        args: { format: string; parseFormat?: string },
    ): string {
        if (isString(value)) {
            const instance = dayjs(value, args.parseFormat);
            return instance.isValid() ? instance.format(args.format) : '';
        }

        if (isMoment(value)) {
            const instance = dayjs(value.toDate());
            return instance.isValid() ? instance.format(args.format) : '';
        }

        if (isDayjs(value)) {
            const instance = value;
            return instance.isValid() ? instance.format(args.format) : '';
        }

        return '';
    }
}
