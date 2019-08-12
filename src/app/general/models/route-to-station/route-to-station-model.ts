import { ReadRouteToStationDto } from './route-to-station-dto';
import { IRouteToStation } from '../../interfaces/routeToStation';
import { StationModel } from '../station/station-model';

export class RouteToStationModel {
  static readRouteToStationDtoImpl(
    routeToStation: ReadRouteToStationDto
  ): IRouteToStation {
    const returnObj: IRouteToStation = {
      id: routeToStation.id,
      routeId: routeToStation.route_id,
      stationId: routeToStation.station_id,
      stationSequence: routeToStation.station_sequence,
      stationNumbering: routeToStation.station_numbering,
      createdAt: routeToStation.created_at,
      updatedAt: routeToStation.updated_at
    };

    if (routeToStation.station) {
      returnObj.station = StationModel.readStationDtoImpl(
        routeToStation.station
      );
    }

    return returnObj;
  }
}
