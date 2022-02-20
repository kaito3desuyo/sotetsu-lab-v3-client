import { Injectable } from '@angular/core';
import { OperationPastTimeService } from './operation-past-time.service';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import moment from 'moment';
import { OperationPastTimeStateStore } from '../../states/operation-past-time.state';

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
            this.operationPastTimeService.fetchCalendars(),
            this.operationPastTimeService.fetchFormations(),
            this.operationPastTimeService.fetchOperationSightings(),
        ]).pipe(map(() => null));
    }
}
