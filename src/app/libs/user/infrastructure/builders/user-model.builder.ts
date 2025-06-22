import {
    ClassConstructor,
    instanceToPlain,
    plainToClass,
} from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { RegisterUserDto } from '../../usecase/dtos/register-user.dto';
import { UserModel } from '../models/user.model';

const transformer = <Source, Target>(
    source: Source,
    target: ClassConstructor<Target>,
) => {
    const plainObject = instanceToPlain(source, classTransformerOptions);
    return plainToClass(target, plainObject, classTransformerOptions);
};

export const UserModelBuilder = {
    fromRegisterUserDto: (dto: RegisterUserDto) => {
        return transformer(dto, UserModel);
    },
};
