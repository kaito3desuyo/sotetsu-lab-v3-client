import { Injectable } from '@angular/core';
import { OperationPastTimeService } from './operation-past-time.service';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import moment from 'moment';

@Injectable()
export class OperationPastTimeResolverService
    implements Resolve<Observable<void>> {
    constructor(private operationPastTimeService: OperationPastTimeService) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        console.log(route);
        this.operationPastTimeService.referenceDate = moment(
            route.paramMap.get('reference_date'),
            'YYYY-MM-DD'
        );
        this.operationPastTimeService.days = +route.paramMap.get('days');

        return forkJoin([
            this.operationPastTimeService.fetchOperationSightings()
        ]).pipe(map(() => null));
    }
}
