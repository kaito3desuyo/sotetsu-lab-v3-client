import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { StopDetailsDto } from '../../usecase/dtos/stop-details.dto';
import { StopModel } from '../models/stop.model';

export const StopDtoBuilder = {
    buildFromModel: (model: StopModel): StopDetailsDto =>
        plainToClass(StopDetailsDto, model, classTransformerOptions),
    buildFromModels: (models: StopModel[]): StopDetailsDto[] =>
        models.map((model) => StopDtoBuilder.buildFromModel(model)),
} as const;
