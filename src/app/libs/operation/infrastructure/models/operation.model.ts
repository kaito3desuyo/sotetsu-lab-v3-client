import { CalendarModel } from 'src/app/libs/calendar/infrastructure/models/calendar.model';

export interface OperationModel {
    id: string;
    calendarId?: string;
    operationNumber?: string;
    createdAt?: string;
    updatedAt?: string;
    calendar?: CalendarModel;
}
