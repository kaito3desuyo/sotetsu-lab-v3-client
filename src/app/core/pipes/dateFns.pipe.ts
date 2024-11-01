import { Pipe, PipeTransform } from '@angular/core';
import { format, parse, parseISO } from 'date-fns';
import { Dayjs, isDayjs } from 'dayjs';
import { isString } from 'es-toolkit';

@Pipe({
    standalone: true,
    name: 'dateFns',
})
export class DateFnsPipe implements PipeTransform {
    transform(
        value: string,
        args: { format: string; parseFormat?: string; parseISO?: boolean },
    ): string;
    transform(value: Dayjs, args: { format: string }): string;
    transform(
        value: string | Dayjs,
        args: { format: string; parseFormat?: string; parseISO?: boolean },
    ): string {
        const formatFn = (date: Date) => {
            const formatted = format(date, args.format);
            return formatted;
        };

        if (isString(value)) {
            if (!!args.parseISO) {
                return formatFn(parseISO(value));
            }

            return formatFn(parse(value, args.parseFormat, new Date()));
        }

        if (isDayjs(value)) {
            return formatFn(value.toDate());
        }

        return '';
    }
}
