import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripOperationListDetailsDto } from '../../usecase/dtos/trip-operation-list-details.dto';
import { TripOperationListModel } from '../models/trip-operation-list.model';

export function buildTripOperationListDetailsDto(
    model: TripOperationListModel,
): TripOperationListDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        TripOperationListDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}
