import { AgencyDtoBuilder } from 'src/app/libs/agency/infrastructure/builders/agency.dto.builder';
import { FormationDetailsDto } from '../../usecase/dtos/formation-details.dto';
import { FormationModel } from '../models/formation.model';

export const FormationDtoBuilder = {
    buildFromModel: ({
        id,
        agency,
        ...rest
    }: FormationModel): FormationDetailsDto => ({
        ...rest,
        formationId: id,
        agency: agency && AgencyDtoBuilder.buildFromModel(agency),
    }),
    buildFromModels: (models: FormationModel[]): FormationDetailsDto[] =>
        models.map((model) => FormationDtoBuilder.buildFromModel(model)),
} as const;
