import { IRouteToStation } from './routeToStation';

export interface IRoute {
  id: string;
  agencyId: string;
  routeNumber: string;
  routeName: string;
  routeNickName: string;
  routeDescription: string;
  routeType: number;
  routeUrl: string;
  routeColor: string;
  routeTextColor: string;
  createdAt: string;
  updatedAt: string;
  routeToStations?: IRouteToStation[];
}
