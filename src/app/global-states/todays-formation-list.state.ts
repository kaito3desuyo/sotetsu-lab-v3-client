import { inject, Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
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
        const qb = new RequestQueryBuilder();

        return this.#formationService
            .findManyBySpeficicDate(qb, {
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
                return getIndex(a.agencyId) - getIndex(b.agencyId);
            }),
        ),
    );

    get todaysFormations() {
        return state.query(getAllEntities());
    }
}
