import { Injectable } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { OperationRealTimeService } from './operation-real-time.service';

@Injectable()
export class OperationRealTimeResolverService {
    constructor(private operationRealTimeService: OperationRealTimeService) {}

    resolve(): Observable<void> {
        return forkJoin([
            // v2
            this.operationRealTimeService.fetchOperationSightingTimeCrossSections(),
            this.operationRealTimeService.fetchFormationSightingTimeCrossSections(),
            this.operationRealTimeService.fetchOperationSightingHistories(),
            this.operationRealTimeService.fetchFormationSightingHistories(),
            this.operationRealTimeService.fetchOperationCurrentPosition(),
            this.operationRealTimeService.fetchTripClassesV2(),
        ]).pipe(map(() => undefined));
    }
}
