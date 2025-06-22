import {
    ClassConstructor,
    instanceToPlain,
    plainToClass,
} from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { LoginDto } from '../../usecase/dtos/login.dto';
import { LoginModel } from '../models/login.model';

const transformer = <Source, Target>(
    source: Source,
    target: ClassConstructor<Target>,
) => {
    const plainObject = instanceToPlain(source, classTransformerOptions);
    return plainToClass(target, plainObject, classTransformerOptions);
};

export const LoginModelBuilder = {
    fromLoginDto: (dto: LoginDto) => {
        return transformer(dto, LoginModel);
    },
};
