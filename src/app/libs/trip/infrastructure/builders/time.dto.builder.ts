import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TimeDetailsDto } from '../../usecase/dtos/time-details.dto';
import { TimeModel } from '../models/time.model';

export const TimeDtoBuilder = {
    buildFromModel: (model: TimeModel): TimeDetailsDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(TimeDetailsDto, plainObject, classTransformerOptions);
    },
} as const;
