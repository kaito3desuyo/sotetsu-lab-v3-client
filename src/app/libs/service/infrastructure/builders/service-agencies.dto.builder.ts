import { classTransformer } from 'src/app/core/utils/class-transformer';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto';
import { ServiceAgenciesModel } from '../models/service-agencies.model';

export const ServiceAgenciesDtoBuilder = {
    buildFromModel: (model: ServiceAgenciesModel): ServiceAgenciesDto => {
        return classTransformer(model, ServiceAgenciesDto);
    },
    buildFromModels: (models: ServiceAgenciesModel[]): ServiceAgenciesDto[] =>
        models.map((model) => ServiceAgenciesDtoBuilder.buildFromModel(model)),
} as const;
