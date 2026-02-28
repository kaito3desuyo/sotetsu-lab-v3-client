import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export function buildCalendarDetailsDto(
    model: CalendarModel,
): CalendarDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        CalendarDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}

export const CalendarDtoBuilder = {
    toDetailsDto: (model: CalendarModel): CalendarDetailsDto => {
        return classTransformer(model, CalendarDetailsDto);
    },
} as const;
