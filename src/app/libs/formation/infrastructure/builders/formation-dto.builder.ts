import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { classTransformer } from 'src/app/core/utils/class-transformer';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationModel } from '../models/formation.model';

export function buildFormationDetailsDto(
    model: FormationModel,
): FormationDetailsDto {
    const plainObject = classToPlain(model, classTransformerOptions);
    return plainToClass(
        FormationDetailsDto,
        plainObject,
        classTransformerOptions,
    );
}

export const FormationDtoBuilder = {
    toDetailsDto: (model: FormationModel): FormationDetailsDto => {
        return classTransformer(model, FormationDetailsDto);
    },
} as const;

export const FormationsDtoBuilder = {
    toDetailsDto: (models: FormationModel[]): FormationDetailsDto[] => {
        return models.map((model) => FormationDtoBuilder.toDetailsDto(model));
    },
} as const;
