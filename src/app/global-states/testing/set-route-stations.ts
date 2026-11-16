import { TestBed } from '@angular/core/testing';
import { patchState } from '@ngrx/signals';
import { setAllEntities } from '@ngrx/signals/entities';
import { unprotected } from '@ngrx/signals/testing';
import { RouteDetailsDto } from '../../libs/route/usecase/dtos/route-details.dto';
import { StationDetailsDto } from '../../libs/station/usecase/dtos/station-details.dto';
import { RouteStationListState } from '../route-station-list.state';

/** spec 用: 本物の RouteStationListState に路線（routeStations）を入れる */
export function setRouteStations(routes: RouteDetailsDto[]): void {
    patchState(
        unprotected(TestBed.inject(RouteStationListState)),
        setAllEntities(routes, {
            selectId: (route: RouteDetailsDto) => route.routeId,
        }),
    );
}

/** spec 用: 本物の RouteStationListState の stations に渡した駅が並ぶよう、1 路線に載せて入れる */
export function setStationList(stations: StationDetailsDto[]): void {
    setRouteStations([
        {
            routeId: 'spec-route',
            routeStationLists: stations.map((station, index) => ({
                routeStationListId: `spec-rsl-${index}`,
                stationId: station.stationId,
                stationSequence: index,
                station,
            })),
        } as unknown as RouteDetailsDto,
    ]);
}
