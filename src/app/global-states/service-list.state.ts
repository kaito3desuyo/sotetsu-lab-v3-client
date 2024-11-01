import { inject, Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { createStore, select } from '@ngneat/elf';
import {
    getAllEntities,
    selectFirst,
    setEntities,
    withEntities,
} from '@ngneat/elf-entities';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceDetailsDto } from '../libs/service/usecase/dtos/service-details.dto';
import { ServiceService } from '../libs/service/usecase/service.service';

type State = ServiceDetailsDto;

const state = createStore(
    { name: 'ServiceList' },
    withEntities<State, 'serviceId'>({ initialValue: [], idKey: 'serviceId' }),
);

@Injectable({ providedIn: 'root' })
export class ServiceListStateStore {
    readonly #serviceService = inject(ServiceService);

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create().setFilter({
            field: 'serviceName',
            operator: CondOperator.EQUALS,
            value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        });

        return this.#serviceService.findMany(qb).pipe(
            tap((data: ServiceDetailsDto[]) => {
                state.update(setEntities(data));
            }),
            map(() => undefined),
        );
    }
}

@Injectable({ providedIn: 'root' })
export class ServiceListStateQuery {
    readonly serviceId$ = state.pipe(
        selectFirst(),
        select((state) => state.serviceId),
    );

    get serviceId(): ServiceDetailsDto['serviceId'] {
        return state.query(getAllEntities()).at(0).serviceId;
    }
}
