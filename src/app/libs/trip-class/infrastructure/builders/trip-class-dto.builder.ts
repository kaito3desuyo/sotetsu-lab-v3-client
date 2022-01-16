import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripClassDetailsDto } from '../../usecase/dtos/trip-class-details.dto';
import { TripClassModel } from '../models/trip-class.model';

export function buildTripClassDetailsDto(
    model: TripClassModel
): TripClassDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        TripClassDetailsDto,
        plainObject,
        classTransformerOptions
    );
}
