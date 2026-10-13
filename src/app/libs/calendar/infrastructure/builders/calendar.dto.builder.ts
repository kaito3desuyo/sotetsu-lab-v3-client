import { classTransformer } from 'src/app/core/utils/class-transformer';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export const CalendarDtoBuilder = {
    buildFromModel: (model: CalendarModel): CalendarDetailsDto => {
        return classTransformer(model, CalendarDetailsDto);
    },
    buildFromModels: (models: CalendarModel[]): CalendarDetailsDto[] =>
        models.map((model) => CalendarDtoBuilder.buildFromModel(model)),
} as const;
