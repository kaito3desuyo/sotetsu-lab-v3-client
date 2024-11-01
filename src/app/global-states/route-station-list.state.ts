import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { createStore } from '@ngneat/elf';
import {
    selectEntities,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import { flatten, uniqBy } from 'es-toolkit';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { RouteDetailsDto } from '../libs/route/usecase/dtos/route-details.dto';
import { RouteService } from '../libs/route/usecase/route.service';

type State = RouteDetailsDto;

const state = createStore(
    { name: 'RouteStationList' },
    withEntities<State, 'routeId'>({ initialValue: [], idKey: 'routeId' }),
);

@Injectable({ providedIn: 'root' })
export class RouteStationListStateStore {
    readonly #routeService = inject(RouteService);

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create()
            .setJoin([
                { field: 'routeStationLists' },
                { field: 'routeStationLists.station' },
                { field: 'operatingSystems' },
                { field: 'operatingSystems.service' },
            ])
            .setFilter([
                {
                    field: 'operatingSystems.service.serviceName',
                    operator: CondOperator.EQUALS,
                    value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                },
            ])
            .sortBy([
                { field: 'routeStationLists.stationSequence', order: 'ASC' },
            ]);

        return this.#routeService.findMany(qb).pipe(
            tap((data: RouteDetailsDto[]) => {
                state.update(
                    setEntities(
                        Array.from(data)
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
                            ),
                    ),
                );
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class RouteStationListStateQuery {
    readonly routeStations$ = state.pipe(
        selectEntities(),
        map((routesMap) =>
            Object.entries(routesMap).map(([_, value]) => value),
        ),
    );
    readonly stations$ = this.routeStations$.pipe(
        map((routes) => {
            const stations = flatten(
                routes.map((route) =>
                    route.routeStationLists.map((rsl) => rsl.station),
                ),
            );
            return uniqBy(stations, (o) => o.stationId);
        }),
    );
}

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
