import { inject, Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { createStore } from '@ngneat/elf';
import {
    getAllEntities,
    selectAllEntities,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AgencyService } from '../libs/agency/usecase/agency.service';
import { AgencyDetailsDto } from '../libs/agency/usecase/dtos/agency-details.dto';

type State = AgencyDetailsDto;

const state = createStore(
    { name: 'AgencyList' },
    withEntities<State, 'agencyId'>({ initialValue: [], idKey: 'agencyId' }),
);

@Injectable({ providedIn: 'root' })
export class AgencyListStateStore {
    readonly #agencyService = inject(AgencyService);

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create();

        return this.#agencyService.findMany(qb).pipe(
            tap((data: AgencyDetailsDto[]) => {
                state.update(setEntities(data));
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class AgencyListStateQuery {
    readonly agencies$ = state.pipe(selectAllEntities());

    get agencies(): AgencyDetailsDto[] {
        return state.query(getAllEntities());
    }
}
