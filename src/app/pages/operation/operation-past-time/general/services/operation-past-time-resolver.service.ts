import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OperationPastTimeStateStore } from '../../states/operation-past-time.state';
import { OperationPastTimeService } from './operation-past-time.service';

@Injectable()
export class OperationPastTimeResolverService
    implements Resolve<Observable<void>>
{
    constructor(
        private operationPastTimeService: OperationPastTimeService,
        private readonly operationPastTimeStateStore: OperationPastTimeStateStore
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        this.operationPastTimeStateStore.setReferenceDate(
            route.paramMap.get('reference_date')
        );
        this.operationPastTimeStateStore.setDays(+route.paramMap.get('days'));

        return forkJoin([
            this.operationPastTimeService.fetchOperationSightings(),
            this.operationPastTimeService.fetchFormationsV2(),
        ]).pipe(map(() => null));
    }
}
