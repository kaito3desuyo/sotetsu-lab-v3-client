import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { ServiceDetailsDto } from '../../usecase/dtos/service-details.dto';
import { ServiceModel } from '../models/service.model';

export function buildServiceDetailsDto(model: ServiceModel): ServiceDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        ServiceDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}
