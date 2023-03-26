import {
    ClassConstructor,
    instanceToPlain,
    plainToClass,
} from 'class-transformer';
import { classTransformerOptions } from '../configs/class-transformer';

export function classTransformer<From, To>(
    from: From,
    to: ClassConstructor<To>
): To {
    const plainObject = instanceToPlain(from, classTransformerOptions);
    return plainToClass(to, plainObject, classTransformerOptions);
}
