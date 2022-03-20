import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { RouteDetailsDto } from '../../usecase/dtos/route-details.dto';
import { RouteModel } from '../models/route.model';

export function buildRouteDetailsDto(model: RouteModel): RouteDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(RouteDetailsDto, plainObject, classTransformerOptions);
}
