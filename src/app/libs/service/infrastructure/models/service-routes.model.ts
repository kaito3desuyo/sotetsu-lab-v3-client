import { RouteModel } from 'src/app/libs/route/infrastructure/models/route.model';
import { ServiceModel } from './service.model';

export interface ServiceRoutesModel {
    service: ServiceModel;
    routes: ServiceRouteModel[];
}

export interface ServiceRouteModel extends RouteModel {
    sequence: number;
    startRouteStationListId: string;
    endRouteStationListId: string;
}
