import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { OperationRealTimeService } from './operation-real-time.service';

@Injectable()
export class OperationRealTimeResolverService {
    constructor(private operationRealTimeService: OperationRealTimeService) {}

    resolve(): Observable<void> {
        return forkJoin([
            // v2
            // this.operationRealTimeService.fetchOperationsV2(),
            this.operationRealTimeService.fetchFormationsV2(),
            this.operationRealTimeService.fetchTripClassesV2(),
        ]).pipe(
            mergeMap(() => {
                return forkJoin([
                    // v2
                    this.operationRealTimeService.fetchOperationSightingTimeCrossSections(),
                    this.operationRealTimeService.fetchFormationSightingTimeCrossSections(),
                    this.operationRealTimeService.fetchOperationCurrentPosition(),
                ]);
            }),
            map(() => null)
        );
    }
}
