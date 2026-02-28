import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceRoutesDto } from '../../usecase/dtos/service-routes.dto';
import { ServiceRoutesModel } from '../models/service-routes.model';
import { ServiceModel } from '../models/service.model';

export function buildServiceDetailsDto(model: ServiceModel): ServiceDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        ServiceDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}

export const ServiceDtoBuilder = {
    toRoutesDto: (model: ServiceRoutesModel): ServiceRoutesDto => {
        return classTransformer(model, ServiceRoutesDto);
    },
} as const;
