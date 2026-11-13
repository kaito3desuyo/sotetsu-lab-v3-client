import { Pipe, PipeTransform } from '@angular/core';
import { format, parse, parseISO } from 'date-fns';
import { isString } from 'es-toolkit';
import { isNumber } from 'es-toolkit/compat';
import { formatJst } from 'src/app/core/utils/railway-day';

/** 時刻部分と明示のオフセット（Z・±HH:MM・±HHMM）を両方持つ ISO 文字列か */
const INSTANT_ISO = /T\d{2}:\d{2}.*(?:Z|[+-]\d{2}(?::?\d{2})?)$/i;

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
                // 時点（オフセット付き）は日本時間で、日付だけ・オフセット無しの壁時計は端末のまま書く
                return INSTANT_ISO.test(value)
                    ? formatJst(parseISO(value), args.format)
                    : formatFn(parseISO(value));
            }

            return formatFn(parse(value, args.parseFormat, new Date()));
        }

        if (isNumber(value)) {
            // UNIX 秒は時点なので日本時間で書く
            return formatJst(new Date(value * 1000), args.format);
        }

        return '';
    }
}
