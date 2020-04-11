import { StationModel } from '../station/station-model';
import { ReadRouteStationListDto } from './route-station-list-dto';
import { IRouteStationList } from '../../interfaces/route-station-list';

export class RouteStationListModel {
    static readRouteStationListDtoImpl(
        routeToStation: ReadRouteStationListDto
    ): IRouteStationList {
        const returnObj: IRouteStationList = {
            id: routeToStation.id,
            routeId: routeToStation.route_id,
            stationId: routeToStation.station_id,
            stationSequence: routeToStation.station_sequence,
            stationNumbering: routeToStation.station_numbering,
            createdAt: routeToStation.created_at,
            updatedAt: routeToStation.updated_at,
        };

        if (routeToStation.station) {
            returnObj.station = StationModel.readStationDtoImpl(
                routeToStation.station
            );
        }

        return returnObj;
    }
}
