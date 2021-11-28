export class CalendarModel {
    id: string;
    serviceId?: string;
    calendarName?: string;
    sunday?: boolean;
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    startDate?: string;
    endDate?: string | null;
    createdAt?: string;
    updatedAt?: string;
}
