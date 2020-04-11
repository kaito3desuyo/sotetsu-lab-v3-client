import { Injectable } from '@angular/core';
import { OperationRealTimeService } from './operation-real-time.service';
import { Observable, of, forkJoin } from 'rxjs';
import { Resolve } from '@angular/router';
import { flatMap, map, tap } from 'rxjs/operators';

@Injectable()
export class OperationRealTimeResolverService
    implements Resolve<Observable<void>> {
    constructor(private operationRealTimeService: OperationRealTimeService) {}

    resolve(): Observable<void> {
        return forkJoin([
            this.operationRealTimeService.fetchServices(),
            this.operationRealTimeService.fetchCalendars(),
            this.operationRealTimeService.fetchStations(),
        ]).pipe(
            flatMap(() => {
                return forkJoin([
                    this.operationRealTimeService.fetchFormationNumbers(),
                    this.operationRealTimeService.fetchOperationNumbers(),
                    // this.operationRealTimeService.fetchOperationTrips(),
                    this.operationRealTimeService.fetchOperationsCurrentPosition(),
                    this.operationRealTimeService.fetchTripClasses(),
                    this.operationRealTimeService.fetchOperations(),
                    this.operationRealTimeService.fetchSightingsLatest(),
                ]);
            }),
            flatMap(() => {
                return forkJoin([
                    this.operationRealTimeService.generateTable(),
                ]);
            }),
            map(() => null)
        );
    }
}
