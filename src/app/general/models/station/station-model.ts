import { ReadStationDto } from './station-dto';
import { IStation } from '../../interfaces/station';
import { RouteToStationModel } from '../route-to-station/route-to-station-model';

export class StationModel {
  static readStationDtoImpl(station: ReadStationDto): IStation {
    const returnObj: IStation = {
      id: station.id,
      stationName: station.station_name,
      stationSubName: station.station_subname,
      stationType: station.station_type,
      stationDescription: station.station_description,
      stationLatLng: station.station_latlng,
      stationUrl: station.station_url,
      wheelchairBoarding: station.wheelchair_boarding,
      createdAt: station.created_at,
      updatedAt: station.updated_at
    };

    if (station.station_to_routes) {
      returnObj.stationToRoutes = station.station_to_routes.map(data =>
        RouteToStationModel.readRouteToStationDtoImpl(data)
      );
    }

    return returnObj;
  }
}
