import { OperationGroupDto } from '../../usecase/dtos/operation-group.dto';
import { OperationGroupModel } from '../models/operation-group.model';

export const OperationGroupDtoBuilder = {
    /** 運用群は id を持たないので、そのまま写す */
    buildFromModel: (model: OperationGroupModel): OperationGroupDto => ({
        ...model,
    }),
    buildFromModels: (models: OperationGroupModel[]): OperationGroupDto[] =>
        models.map((model) => OperationGroupDtoBuilder.buildFromModel(model)),
} as const;
