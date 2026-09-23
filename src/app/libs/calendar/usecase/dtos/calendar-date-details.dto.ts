import { Expose } from 'class-transformer';

/** 運行日例外（calendar_dates）。祝日・年末年始・特別ダイヤの日に、そのダイヤを足す/抜く。 */
export class CalendarDateDetailsDto {
    @Expose({ name: 'id' })
    calendarDateId: string;

    @Expose()
    calendarId?: string;

    @Expose()
    date?: string;

    /** 1 = 追加（その日だけ運行）/ 2 = 除外（その日だけ運休） */
    @Expose()
    exceptionType?: 1 | 2;

    /** 祝日のシードは祝日名（例: 秋分の日）を入れる */
    @Expose()
    memo?: string | null;

    @Expose()
    createdAt?: string;

    @Expose()
    updatedAt?: string;
}
