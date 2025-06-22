import {
    ClassConstructor,
    instanceToPlain,
    plainToClass,
} from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { TokenDetailsDto } from '../../usecase/dtos/token-details.dto';
import { TokenModel } from '../models/token.model';

const transformer = <Source, Target>(
    source: Source,
    target: ClassConstructor<Target>,
) => {
    const plainObject = instanceToPlain(source, classTransformerOptions);
    return plainToClass(target, plainObject, classTransformerOptions);
};

export const TokenDtoBuilder = {
    fromTokenModel: (model: TokenModel) => {
        return transformer(model, TokenDetailsDto);
    },
};
