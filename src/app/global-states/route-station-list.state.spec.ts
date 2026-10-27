import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RouteDetailsDto } from '../libs/route/usecase/dtos/route-details.dto';
import { RouteService } from '../libs/route/usecase/route.service';
import { ServiceService } from '../libs/service/usecase/service.service';
import { RouteStationListState } from './route-station-list.state';

function route(
    routeId: string,
    routeName: string,
    stationIds: string[],
): RouteDetailsDto {
    return {
        routeId,
        routeName,
        routeStationLists: stationIds.map((stationId, i) => ({
            routeStationListId: `${routeId}-${stationId}`,
            stationId,
            stationSequence: i + 1,
            station: { stationId, stationName: stationId },
        })),
    } as unknown as RouteDetailsDto;
}

describe('RouteStationListState', () => {
    let routeFindMany: jest.Mock;
    let serviceFindMany: jest.Mock;
    let findOneWithRoutes: jest.Mock;
    let store: InstanceType<typeof RouteStationListState>;

    beforeEach(() => {
        routeFindMany = jest.fn();
        serviceFindMany = jest.fn().mockReturnValue(of([]));
        findOneWithRoutes = jest.fn();
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: RouteService,
                    useValue: { findMany: routeFindMany },
                },
                {
                    provide: ServiceService,
                    useValue: {
                        findMany: serviceFindMany,
                        findOneWithRoutes,
                    },
                },
            ],
        });
        store = TestBed.inject(RouteStationListState);
    });

    it('取る前は空', () => {
        expect(store.routeStations()).toEqual([]);
        expect(store.stations()).toEqual([]);
        expect(store.operatingSystemEndsByRouteId()).toEqual({});
    });

    it('路線は系統順に並べ、ID の順にはしない', () => {
        routeFindMany.mockReturnValue(
            of([
                route('r-1', '東横線', ['t1', 't2']),
                route('r-3', 'いずみ野線', ['i1', 'i2']),
                route('r-2', '本線', ['h1', 'h2']),
            ]),
        );

        store.fetch().subscribe();

        expect(store.routeStations().map((r) => r.routeId)).toEqual([
            'r-2',
            'r-3',
            'r-1',
        ]);
    });

    it('下りの向きに並べる路線は駅の順を逆にする', () => {
        routeFindMany.mockReturnValue(
            of([
                route('r-1', '東横線', ['t1', 't2', 't3']),
                route('r-2', '本線', ['h1', 'h2', 'h3']),
            ]),
        );

        store.fetch().subscribe();

        const stationIdsOf = (routeId: string) =>
            store
                .routeStations()
                .find((r) => r.routeId === routeId)
                .routeStationLists.map((rsl) => rsl.stationId);
        expect(stationIdsOf('r-2')).toEqual(['h1', 'h2', 'h3']);
        expect(stationIdsOf('r-1')).toEqual(['t3', 't2', 't1']);
    });

    it('stations は路線をまたぐ駅を 1 回だけ数える', () => {
        routeFindMany.mockReturnValue(
            of([
                route('r-2', '本線', ['h1', 'x']),
                route('r-3', 'いずみ野線', ['x', 'i1']),
            ]),
        );

        store.fetch().subscribe();

        expect(store.stations().map((s) => s.stationId)).toEqual([
            'h1',
            'x',
            'i1',
        ]);
    });

    it('系統の始点・終点を路線ごとに駅の ID へ引き直す', () => {
        routeFindMany.mockReturnValue(
            of([route('r-2', '本線', ['h1', 'h2', 'h3'])]),
        );
        serviceFindMany.mockReturnValue(of([{ serviceId: 's-1' }]));
        findOneWithRoutes.mockReturnValue(
            of({
                routes: [
                    {
                        routeId: 'r-2',
                        startRouteStationListId: 'r-2-h1',
                        endRouteStationListId: 'r-2-h3',
                    },
                ],
            }),
        );

        store.fetch().subscribe();

        expect(store.operatingSystemEndsByRouteId()).toEqual({
            'r-2': { startStationId: 'h1', endStationId: 'h3' },
        });
    });
});
