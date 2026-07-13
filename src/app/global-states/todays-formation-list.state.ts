import { inject, Injectable } from '@angular/core';
import { createStore } from '@ngneat/elf';
import {
    getAllEntities,
    selectEntities,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import dayjs from 'dayjs';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { FormationDetailsDto } from '../libs/formation/usecase/dtos/formation-details.dto';
import { FormationService } from '../libs/formation/usecase/formation.service';
import { AgencyListStateQuery } from './agency-list.state';

type State = FormationDetailsDto;

const state = createStore(
    { name: 'TodaysFormationList' },
    withEntities<State, 'formationId'>({
        initialValue: [],
        idKey: 'formationId',
    }),
);

@Injectable({ providedIn: 'root' })
export class TodaysFormationListStateStore {
    readonly #formationService = inject(FormationService);

    fetch(): Observable<void> {
        return this.#formationService
            .findManyBySpecificDate({
                date: dayjs()
                    .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((data: FormationDetailsDto[]) => {
                    state.update(setEntities(data));
                }),
                map(() => undefined),
            );
    }
}

@Injectable({ providedIn: 'root' })
export class TodaysFormationListStateQuery {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly todaysFormations$ = state.pipe(
        selectEntities(),
        map((formationsMap) =>
            Object.entries(formationsMap).map(([_, value]) => value),
        ),
    );
    readonly todaysFormationsSorted$ = this.todaysFormations$.pipe(
        map((formations) =>
            [...formations].sort((a, b) => {
                const agencies = this.#agencyListStateQuery.agencies;
                const getIndex = (agencyId: string) =>
                    agencies.findIndex((v) => v.agencyId === agencyId);
                const agencyDiff = getIndex(a.agencyId) - getIndex(b.agencyId);
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
            }),
        ),
    );

    get todaysFormations() {
        return state.query(getAllEntities());
    }
}
