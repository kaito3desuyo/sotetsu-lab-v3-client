import { AgencyDetailsDto } from '../../usecase/dtos/agency-details.dto';
import { AgencyModel } from '../models/agency.model';

export const AgencyDtoBuilder = {
    buildFromModel: ({ id, ...rest }: AgencyModel): AgencyDetailsDto => ({
        ...rest,
        agencyId: id,
    }),
    buildFromModels: (models: AgencyModel[]): AgencyDetailsDto[] =>
        models.map((model) => AgencyDtoBuilder.buildFromModel(model)),
} as const;
