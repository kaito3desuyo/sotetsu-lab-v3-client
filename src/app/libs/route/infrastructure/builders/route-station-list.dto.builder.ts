import { plainToClass } from 'class-transformer';
import { classTransformerOptions } from 'src/app/core/configs/class-transformer';
import { RouteStationListDetailsDto } from '../../usecase/dtos/route-station-list-details.dto';
import { RouteStationListModel } from '../models/route-station-list.model';

export const RouteStationListDtoBuilder = {
    buildFromModel: (
        model: RouteStationListModel,
    ): RouteStationListDetailsDto =>
        plainToClass(
            RouteStationListDetailsDto,
            model,
            classTransformerOptions,
        ),
    buildFromModels: (
        models: RouteStationListModel[],
    ): RouteStationListDetailsDto[] =>
        models.map((model) => RouteStationListDtoBuilder.buildFromModel(model)),
} as const;
