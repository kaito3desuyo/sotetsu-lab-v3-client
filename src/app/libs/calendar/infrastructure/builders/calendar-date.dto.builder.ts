import { classTransformer } from 'src/app/core/utils/class-transformer';
import { CalendarDateDetailsDto } from '../../usecase/dtos/calendar-date-details.dto';
import { CalendarDateModel } from '../models/calendar-date.model';

export const CalendarDateDtoBuilder = {
    buildFromModel: (model: CalendarDateModel): CalendarDateDetailsDto => {
        return classTransformer(model, CalendarDateDetailsDto);
    },
    buildFromModels: (models: CalendarDateModel[]): CalendarDateDetailsDto[] =>
        models.map((model) => CalendarDateDtoBuilder.buildFromModel(model)),
} as const;
