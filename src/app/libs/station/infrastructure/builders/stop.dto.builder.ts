import { StopDetailsDto } from '../../usecase/dtos/stop-details.dto';
import { StopModel } from '../models/stop.model';

export const StopDtoBuilder = {
    buildFromModel: ({ id, ...rest }: StopModel): StopDetailsDto => ({
        ...rest,
        stopId: id,
    }),
    buildFromModels: (models: StopModel[]): StopDetailsDto[] =>
        models.map((model) => StopDtoBuilder.buildFromModel(model)),
} as const;
