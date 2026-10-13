import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { ServiceAgenciesDto } from '../../usecase/dtos/service-agencies.dto';
import { ServiceAgenciesModel } from '../models/service-agencies.model';
import { ServiceDtoBuilder } from './service.dto.builder';

export const ServiceAgenciesDtoBuilder = {
    buildFromModel: ({
        service,
        agencies,
        ...rest
    }: ServiceAgenciesModel): ServiceAgenciesDto => ({
        ...rest,
        service: service && ServiceDtoBuilder.buildFromModel(service),
        agencies: agencies && AgencyDtoBuilder.buildFromModels(agencies),
    }),
    buildFromModels: (models: ServiceAgenciesModel[]): ServiceAgenciesDto[] =>
        models.map((model) => ServiceAgenciesDtoBuilder.buildFromModel(model)),
} as const;
