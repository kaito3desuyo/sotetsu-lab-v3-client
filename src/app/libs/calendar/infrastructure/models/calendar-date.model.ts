export class CalendarDateModel {
    id: string;
    calendarId?: string;
    date?: string;
    /** 1 = 追加（その日だけ運行）/ 2 = 除外（その日だけ運休） */
    exceptionType?: 1 | 2;
    memo?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
