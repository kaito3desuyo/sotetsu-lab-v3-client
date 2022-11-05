import { Injectable } from '@angular/core';
import {
    EntityState,
    EntityStore,
    QueryEntity,
    StoreConfig,
} from '@datorama/akita';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AgencyService } from '../libs/agency/usecase/agency.service';
import { AgencyDetailsDto } from '../libs/agency/usecase/dtos/agency-details.dto';

interface AgencyListState extends EntityState<AgencyDetailsDto, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'AgencyList', idKey: 'agencyId' })
export class AgencyListStateStore extends EntityStore<AgencyListState> {
    constructor(private readonly agencyService: AgencyService) {
        super();
    }

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create();

        return this.agencyService.findMany(qb).pipe(
            tap((data: AgencyDetailsDto[]) => {
                this.set(data);
            }),
            map(() => null)
        );
    }
}

@Injectable({ providedIn: 'root' })
export class AgencyListStateQuery extends QueryEntity<AgencyListState> {
    agencies$ = this.selectAll();

    get agencies(): AgencyDetailsDto[] {
        return this.getAll();
    }

    constructor(protected store: AgencyListStateStore) {
        super(store);
    }
}
