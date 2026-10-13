import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';
import { CalendarDateModel } from '../models/calendar-date.model';

export const CalendarDateDtoBuilder = {
    buildFromModel: ({
        id,
        ...rest
    }: CalendarDateModel): CalendarDateDetailsDto => ({
        ...rest,
        calendarDateId: id,
    }),
    buildFromModels: (models: CalendarDateModel[]): CalendarDateDetailsDto[] =>
        models.map((model) => CalendarDateDtoBuilder.buildFromModel(model)),
} as const;
