import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { StationDetailsDto } from '../../usecase/dtos/station-details.dto';
import { StationModel } from '../models/station.model';

export function buildStationDetailsDto(model: StationModel): StationDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        StationDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}
