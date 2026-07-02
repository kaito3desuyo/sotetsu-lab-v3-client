import { classTransformer } from 'src/app/core/utils/class-transformer';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceRoutesModel } from '../models/service-routes.model';

export const ServiceRoutesDtoBuilder = {
    buildFromModel: (model: ServiceRoutesModel): ServiceRoutesDto => {
        return classTransformer(model, ServiceRoutesDto);
    },
} as const;
