import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
    withState,
} from '@ngrx/signals';
import {
    entityConfig,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { flatten, uniqBy } from 'es-toolkit';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { RouteDetailsDto } from '../libs/route/usecase/dtos/route-details.dto';
import { RouteService } from '../libs/route/usecase/route.service';
import { ServiceRouteDto } from '../libs/service/usecase/dtos/service-routes.dto';
import { ServiceService } from '../libs/service/usecase/service.service';
import { OperatingSystemEnds } from '../shared/inbound-direction.util';

const SERVICE_NAME = '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線';

const routeConfig = entityConfig({
    entity: type<RouteDetailsDto>(),
    selectId: (route) => route.routeId,
});

/** 系統の始点・終点（route_station_list の ID）を駅の ID に引き直す */
function buildOperatingSystemEnds(
    routes: RouteDetailsDto[],
    serviceRoutes: ServiceRouteDto[],
): Record<string, OperatingSystemEnds> {
    const stationIdByRouteStationListId = new Map(
        routes.flatMap((route) =>
            (route.routeStationLists ?? []).map(
                (rsl) => [rsl.routeStationListId, rsl.stationId] as const,
            ),
        ),
    );
    const ends: Record<string, OperatingSystemEnds> = {};
    for (const serviceRoute of serviceRoutes) {
        const startStationId = stationIdByRouteStationListId.get(
            serviceRoute.startRouteStationListId,
        );
        const endStationId = stationIdByRouteStationListId.get(
            serviceRoute.endRouteStationListId,
        );
        if (startStationId && endStationId) {
            ends[serviceRoute.routeId] = { startStationId, endStationId };
        }
    }
    return ends;
}

export const RouteStationListState = signalStore(
    { providedIn: 'root' },
    withEntities(routeConfig),
    withState<{
        /** 路線ごとの、系統の中で走る区間の始点駅・終点駅（始点側が上り）。系統に無い路線は入らない */
        operatingSystemEndsByRouteId: Record<string, OperatingSystemEnds>;
    }>({ operatingSystemEndsByRouteId: {} }),
    withComputed(({ entities }) => ({
        /** 整列済みの路線（直通の系統順） */
        routeStations: entities,
        stations: () => {
            const stations = flatten(
                entities().map((route) =>
                    route.routeStationLists.map((rsl) => rsl.station),
                ),
            );
            return uniqBy(stations, (o) => o.stationId);
        },
    })),
    withMethods((store) => {
        const routeService = inject(RouteService);
        const serviceService = inject(ServiceService);

        return {
            fetch(): Observable<void> {
                return forkJoin([
                    routeService.findMany({ serviceName: SERVICE_NAME }),
                    // 系統の路線ごとの始点・終点（前後の駅の左右・列車位置情報の図の向きに使う）
                    serviceService.findMany({ serviceName: SERVICE_NAME }).pipe(
                        switchMap((services) =>
                            services[0]
                                ? serviceService
                                      .findOneWithRoutes({
                                          serviceId: services[0].serviceId,
                                      })
                                      .pipe(
                                          map((result) => result.routes ?? []),
                                      )
                                : of([] as ServiceRouteDto[]),
                        ),
                    ),
                ]).pipe(
                    tap(([data, serviceRoutes]) => {
                        const routes: RouteDetailsDto[] = Array.from(data)
                            .map((o) => ({
                                ...o,
                                routeStationLists: Array.from(
                                    o.routeStationLists,
                                ).sort((a, b) =>
                                    desc.some((rn) => o.routeName === rn)
                                        ? b.stationSequence - a.stationSequence
                                        : a.stationSequence - b.stationSequence,
                                ),
                            }))
                            .sort(
                                (a, b) =>
                                    sort.findIndex((rn) => a.routeName === rn) -
                                    sort.findIndex((rn) => b.routeName === rn),
                            );
                        patchState(
                            store,
                            {
                                operatingSystemEndsByRouteId:
                                    buildOperatingSystemEnds(
                                        data,
                                        serviceRoutes,
                                    ),
                            },
                            setAllEntities(routes, routeConfig),
                        );
                    }),
                    map(() => undefined),
                );
            },
        };
    }),
    withAppDevtools('RouteStationListState'),
);

const sort = [
    '本線',
    'いずみ野線',
    '厚木線',
    '新横浜線',

    '東急新横浜線',
    'みなとみらい線',
    '東横線',
    '副都心線',
    '有楽町線',
    '東上本線',
    '西武有楽町線',
    '池袋線',
    '秩父線',

    '目黒線',
    '南北線',
    '埼玉高速鉄道線',
    '三田線',

    'りんかい線',
    '相鉄・JR直通線',
    '埼京線',
    '川越線',
];

const desc = [
    'みなとみらい線',
    '東横線',
    '副都心線',
    '有楽町線',
    '西武有楽町線',
    '目黒線',
    '相鉄・JR直通線',
    '埼京線',
    '川越線',
];
