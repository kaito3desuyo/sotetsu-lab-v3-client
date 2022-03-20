import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { CalendarDetailsDto } from '../../usecase/dtos/calendar-details.dto';
import { CalendarModel } from '../models/calendar.model';

export function buildCalendarDetailsDto(
    model: CalendarModel
): CalendarDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        CalendarDetailsDto,
        plainObject,
        classTransformerOptions
    );
}
