import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { OperationRealTimeService } from './operation-real-time.service';

@Injectable()
export class OperationRealTimeResolverService
    implements Resolve<Observable<void>>
{
    constructor(private operationRealTimeService: OperationRealTimeService) {}

    resolve(): Observable<void> {
        return forkJoin([
            // v2
            this.operationRealTimeService.fetchOperationsV2(),
            this.operationRealTimeService.fetchFormationsV2(),
            this.operationRealTimeService.fetchOperationSightings(),
            this.operationRealTimeService.fetchFormationSightings(),
            this.operationRealTimeService.fetchTripClassesV2(),
        ]).pipe(
            mergeMap(() => {
                return forkJoin([
                    // v2
                    this.operationRealTimeService.fetchOperationCurrentPosition(),
                ]);
            }),
            map(() => null)
        );
    }
}
