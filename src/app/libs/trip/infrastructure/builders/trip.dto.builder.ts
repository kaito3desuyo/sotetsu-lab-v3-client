import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TripDetailsDto } from '../../usecase/dtos/trip-details.dto';
import { TripModel } from '../models/trip.model';

export const TripDtoBuilder = {
    /** model は HTTP の応答（素の JSON）。TripBlockDtoBuilder と同じく複製を挟まずに変換する。 */
    buildFromModel: (model: TripModel): TripDetailsDto => {
        return plainToClass(TripDetailsDto, model, classTransformerOptions);
    },
} as const;
