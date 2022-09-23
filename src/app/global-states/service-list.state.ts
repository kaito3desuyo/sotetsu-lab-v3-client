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
import { ServiceDetailsDto } from '../libs/service/usecase/dtos/service-details.dto';
import { ServiceService } from '../libs/service/usecase/service.service';

interface ServiceListState extends EntityState<ServiceDetailsDto, string> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'ServiceList', idKey: 'serviceId' })
export class ServiceListStateStore extends EntityStore<ServiceListState> {
    constructor(private readonly serviceService: ServiceService) {
        super();
    }

    fetch(): Observable<void> {
        const qb = RequestQueryBuilder.create().setFilter({
            field: 'serviceName',
            operator: CondOperator.EQUALS,
            value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
        });

        return this.serviceService.findMany(qb).pipe(
            tap((data: ServiceDetailsDto[]) => {
                this.set(data);
            }),
            map(() => null)
        );
    }
}

@Injectable({ providedIn: 'root' })
export class ServiceListStateQuery extends QueryEntity<ServiceListState> {
    serviceId$ = this.selectFirst((service) => service.serviceId);

    get serviceId(): ServiceDetailsDto['serviceId'] {
        return this.getAll()[0].serviceId;
    }

    constructor(protected store: ServiceListStateStore) {
        super(store);
    }
}
