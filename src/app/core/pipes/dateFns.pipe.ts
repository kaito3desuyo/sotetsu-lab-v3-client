import { Pipe, PipeTransform } from '@angular/core';
import { format, parse, parseISO } from 'date-fns';
import { isString } from 'es-toolkit';
import { isNumber } from 'es-toolkit/compat';

@Pipe({
    name: 'dateFns',
})
export class DateFnsPipe implements PipeTransform {
    transform(
        value: string,
        args: { format: string; parseFormat?: string; parseISO?: boolean },
    ): string;
    transform(value: number, args: { format: string }): string;
    transform(
        value: string | number,
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

        if (isNumber(value)) {
            return formatFn(new Date(value * 1000));
        }

        return '';
    }
}
