import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';

export function buildTripDetailsDto(model: TripModel): TripDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(TripDetailsDto, plainObject, classTransformerOptions);
}
