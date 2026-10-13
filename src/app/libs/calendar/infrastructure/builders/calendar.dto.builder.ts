import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export const CalendarDtoBuilder = {
    buildFromModel: ({ id, ...rest }: CalendarModel): CalendarDetailsDto => ({
        ...rest,
        calendarId: id,
    }),
    buildFromModels: (models: CalendarModel[]): CalendarDetailsDto[] =>
        models.map((model) => CalendarDtoBuilder.buildFromModel(model)),
} as const;
