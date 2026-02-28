import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteStationsModel } from '../models/route-stations.model';
import { RouteModel } from '../models/route.model';

export function buildRouteDetailsDto(model: RouteModel): RouteDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(RouteDetailsDto, plainObject, classTransformerOptions);
}

export const RouteDtoBuilder = {
    toStationsDto: (model: RouteStationsModel): RouteStationsDto => {
        return classTransformer(model, RouteStationsDto);
    },
} as const;
