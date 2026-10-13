import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceModel } from '../models/service.model';

export const ServiceDtoBuilder = {
    buildFromModel: ({ id, ...rest }: ServiceModel): ServiceDetailsDto => ({
        ...rest,
        serviceId: id,
    }),
    buildFromModels: (models: ServiceModel[]): ServiceDetailsDto[] =>
        models.map((model) => ServiceDtoBuilder.buildFromModel(model)),
} as const;
