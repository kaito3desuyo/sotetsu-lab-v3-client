import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import { TripBlockModel } from '../models/trip-block.model';

export function buildTripBlockDetailsDto(
    model: TripBlockModel
): TripBlockDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        TripBlockDetailsDto,
        plainObject,
        classTransformerOptions
    );
}
