import {
    ClassConstructor,
    instanceToPlain,
    plainToClass,
} from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserModel } from '../models/user.model';

const transformer = <Source, Target>(
    instance: Source,
    dto: ClassConstructor<Target>,
) => {
    const plainObject = instanceToPlain(instance, classTransformerOptions);
    return plainToClass(dto, plainObject, classTransformerOptions);
};

export const UserDtoBuilder = {
    buildFromModel: (model: UserModel): UserDetailsDto => {
        return transformer(model, UserDetailsDto);
    },
    buildFromModels: (models: UserModel[]): UserDetailsDto[] =>
        models.map((model) => UserDtoBuilder.buildFromModel(model)),
} as const;
