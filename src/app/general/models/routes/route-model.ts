import { IRoute } from '../../interfaces/route';
import { ReadRouteDto } from './route-dto';
import { RouteStationListModel } from '../route-station-list/route-station-list-model';

export class RouteModel {
  private initialValue: IRoute = {
    id: '',
    agencyId: '',
    routeNumber: '',
    routeName: '',
    routeNickName: '',
    routeDescription: '',
    routeType: null,
    routeUrl: '',
    routeColor: '',
    routeTextColor: '',
    createdAt: '',
    updatedAt: ''
  };

  private state = { ...this.initialValue };

  constructor(value?: Partial<IRoute>) {
    if (value) {
      this.state = { ...this.initialValue, ...value };
    }
  }

  get value() {
    return this.state;
  }

  static readRouteDtoImpl(route: ReadRouteDto): IRoute {
    const returnObj: IRoute = {
      id: route.id,
      agencyId: route.agency_id,
      routeNumber: route.route_number,
      routeName: route.route_name,
      routeNickName: route.route_nickname,
      routeDescription: route.route_description,
      routeType: route.route_type,
      routeUrl: route.route_url,
      routeColor: route.route_color,
      routeTextColor: route.route_text_color,
      createdAt: route.created_at,
      updatedAt: route.updated_at
    };

    if (route.route_station_lists) {
      returnObj.routeStationLists = route.route_station_lists.map(data =>
        RouteStationListModel.readRouteStationListDtoImpl(data)
      );
    }

    return returnObj;
  }
}
