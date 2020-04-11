import { ReadStationDto } from './station-dto';
import { IStation } from '../../interfaces/station';
import { RouteStationListModel } from '../route-station-list/route-station-list-model';
import { StopModel } from '../stop/stop-model';

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
            updatedAt: station.updated_at,
        };

        if (station.route_station_lists) {
            returnObj.routeStationLists = station.route_station_lists.map(
                (data) =>
                    RouteStationListModel.readRouteStationListDtoImpl(data)
            );
        }

        if (station.stops) {
            returnObj.stops = station.stops.map((data) =>
                StopModel.readStopDtoImpl(data)
            );
        }

        return returnObj;
    }
}
