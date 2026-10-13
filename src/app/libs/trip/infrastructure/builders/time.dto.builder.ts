import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TimeDetailsDto } from '../../usecase/dtos/time-details.dto';
import { TimeModel } from '../models/time.model';

export const TimeDtoBuilder = {
    buildFromModel: (model: TimeModel): TimeDetailsDto =>
        plainToClass(TimeDetailsDto, model, classTransformerOptions),
    buildFromModels: (models: TimeModel[]): TimeDetailsDto[] =>
        models.map((model) => TimeDtoBuilder.buildFromModel(model)),
} as const;
