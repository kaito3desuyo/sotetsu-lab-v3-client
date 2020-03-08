import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { OperationRouteDiagramService } from './operation-route-diagram.service';
import { map } from 'rxjs/operators';

@Injectable()
export class OperationRouteDiagramResolverService
    implements Resolve<Observable<void>> {
    constructor(
        private operationRouteDiagramService: OperationRouteDiagramService
    ) {}

    resolve(route: ActivatedRouteSnapshot): Observable<void> {
        const operationId: string = route.paramMap.get('operation_id');
        this.operationRouteDiagramService.operationId = operationId;
        return forkJoin([
            this.operationRouteDiagramService.fetchCalendars(),
            this.operationRouteDiagramService.fetchOperationAndCalender(),
            this.operationRouteDiagramService.fetchTripOperationLists(),
            this.operationRouteDiagramService.fetchStations()
        ]).pipe(map(() => null));
    }
}
