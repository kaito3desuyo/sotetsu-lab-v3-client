import { StationModel } from 'src/app/libs/station/infrastructure/models/station.model';
import { ServiceModel } from './service.model';

export interface ServiceStationsModel {
    service: ServiceModel;
    stations: StationModel[];
}
