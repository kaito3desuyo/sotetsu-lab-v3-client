import { classToPlain, plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationModel } from '../models/formation.model';

export const FormationDtoBuilder = {
    buildFromModel: (model: FormationModel): FormationDetailsDto => {
        const plainObject = classToPlain(model, classTransformerOptions);
        return plainToClass(
            FormationDetailsDto,
            plainObject,
            classTransformerOptions,
        );
    },
} as const;

export const FormationsDtoBuilder = {
    buildFromModels: (models: FormationModel[]): FormationDetailsDto[] => {
        return models.map((model) => FormationDtoBuilder.buildFromModel(model));
    },
} as const;
