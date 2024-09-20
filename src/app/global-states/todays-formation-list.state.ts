import { inject, Injectable } from '@angular/core';
import { FormationDetailsDto } from '../libs/formation/usecase/dtos/formation-details.dto';
import {
    EntityState,
    EntityStore,
    QueryEntity,
    StoreConfig,
} from '@datorama/akita';
import { Observable } from 'rxjs';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { FormationService } from '../libs/formation/usecase/formation.service';
import dayjs from 'dayjs';
import { map, tap } from 'rxjs/operators';
import { AgencyListStateQuery } from './agency-list.state';

type State = EntityState<FormationDetailsDto, string>;

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'TodaysFormationList', idKey: 'formationId' })
export class TodaysFormationListStateStore extends EntityStore<State> {
    readonly #formationService = inject(FormationService);

    constructor() {
        super();
    }

    fetch(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.#formationService
            .findManyBySpeficicDate(qb, {
                date: dayjs()
                    .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((formations: FormationDetailsDto[]) => {
                    this.set(formations);
                }),
                map(() => undefined),
            );
    }
}

@Injectable({ providedIn: 'root' })
export class TodaysFormationListStateQuery extends QueryEntity<State> {
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly todaysFormations$ = this.selectAll();
    readonly todaysFormationsSorted$ = this.selectAll().pipe(
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
        return this.getAll();
    }

    constructor(protected store: TodaysFormationListStateStore) {
        super(store);
    }
}
