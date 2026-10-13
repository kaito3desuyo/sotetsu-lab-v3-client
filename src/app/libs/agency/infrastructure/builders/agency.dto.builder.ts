import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyModel } from '../models/agency.model';

export const AgencyDtoBuilder = {
    buildFromModel: (model: AgencyModel): AgencyDetailsDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(
            AgencyDetailsDto,
            plainObject,
            classTransformerOptions,
        );
    },
    buildFromModels: (models: AgencyModel[]): AgencyDetailsDto[] =>
        models.map((model) => AgencyDtoBuilder.buildFromModel(model)),
} as const;
