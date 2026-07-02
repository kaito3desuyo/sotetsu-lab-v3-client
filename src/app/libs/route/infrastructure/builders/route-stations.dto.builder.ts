import { classTransformer } from 'src/app/core/utils/class-transformer';
import { RouteStationsDto } from '../../usecase/dtos/route-stations.dto';
import { RouteStationsModel } from '../models/route-stations.model';

export const RouteStationsDtoBuilder = {
    buildFromModel: (model: RouteStationsModel): RouteStationsDto => {
        return classTransformer(model, RouteStationsDto);
    },
} as const;
