import { inject } from '@angular/core';
import {
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
} from '@ngrx/signals';
import {
    entityConfig,
    setAllEntities,
    withEntities,
} from '@ngrx/signals/entities';
import { format } from 'date-fns';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { withAppDevtools } from '../core/store-features/with-app-devtools';
import { FormationDetailsDto } from '../libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from '../libs/formation/usecase/formation.service';
import { agenciesInThroughServiceOrder } from '../shared/agencies-in-through-service-order.util';
import { AgencyListState } from './agency-list.state';
import { RouteStationListState } from './route-station-list.state';

const formationConfig = entityConfig({
    entity: type<FormationDetailsDto>(),
    selectId: (formation) => formation.formationId,
});

export const TodaysFormationListState = signalStore(
    { providedIn: 'root' },
    withEntities(formationConfig),
    withComputed(({ entities }) => {
        const agencyListState = inject(AgencyListState);
        const routeStationListState = inject(RouteStationListState);

        return {
            /** 取得した順の今日の編成 */
            todaysFormations: entities,
            todaysFormationsSorted: () => {
                // 会社の順は相鉄と直通を始めた順（会社チップと同じ。agenciesInThroughServiceOrder）
                const agencies = agenciesInThroughServiceOrder(
                    agencyListState.agencies(),
                    routeStationListState.routeStations(),
                );
                const getIndex = (agencyId: string) =>
                    agencies.findIndex((v) => v.agencyId === agencyId);
                return [...entities()].sort((a, b) => {
                    const agencyDiff =
                        getIndex(a.agencyId) - getIndex(b.agencyId);
                    if (agencyDiff !== 0) {
                        return agencyDiff;
                    }
                    // 会社内は編成番号の数値順（API 返却順のままだと東急・相鉄の
                    // 一部で番号が前後するため）。
                    return (a.formationNumber ?? '').localeCompare(
                        b.formationNumber ?? '',
                        undefined,
                        { numeric: true },
                    );
                });
            },
        };
    }),
    withMethods((store) => {
        const formationService = inject(FormationService);

        return {
            fetch(): Observable<void> {
                return formationService
                    .findManyBySpecificDate({
                        date: format(getRailwayDate(new Date()), 'yyyy-MM-dd'),
                    })
                    .pipe(
                        tap((data: FormationDetailsDto[]) => {
                            patchState(
                                store,
                                setAllEntities(data, formationConfig),
                            );
                        }),
                        map(() => undefined),
                    );
            },
        };
    }),
    withAppDevtools('TodaysFormationListState'),
);
