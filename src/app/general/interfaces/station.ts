import { IRouteToStation } from './routeToStation';

export interface IStation {
  id: string;
  stationName: string;
  stationSubName: string;
  stationType: number;
  stationDescription: string;
  stationLatLng: any;
  stationUrl: string;
  wheelchairBoarding: boolean;
  createdAt: string;
  updatedAt: string;
  stationToRoutes?: IRouteToStation[];
}
