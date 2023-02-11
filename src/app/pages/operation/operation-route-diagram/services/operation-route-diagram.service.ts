import { Injectable } from '@angular/core';
import { RequestQueryBuilder } from '@nestjsx/crud-request';
import { Observable, of, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { OperationRouteDiagramNavigateTimetable } from '../interfaces/operation-route-diagram.interface';
import {
    OperationRouteDiagramStateQuery,
    OperationRouteDiagramStateStore,
} from '../states/operation-route-diagram.state';

@Injectable()
export class OperationRouteDiagramService {
    private _navigateTimetable$ =
        new Subject<OperationRouteDiagramNavigateTimetable>();

    constructor(
        private readonly serviceService: ServiceService,
        private readonly operationService: OperationService,
        private readonly serviceListStateQuery: ServiceListStateQuery,
        private readonly operationRouteDiagramStateStore: OperationRouteDiagramStateStore,
        private readonly operationRouteDiagramStateQuery: OperationRouteDiagramStateQuery
    ) {}

    // v2

    fetchOperationTrips(): Observable<void> {
        const operationId = this.operationRouteDiagramStateQuery.operationId;

        if (!operationId) {
            return of(undefined);
        }

        const qb = new RequestQueryBuilder().setJoin([{ field: 'calendar' }]);

        return this.operationService.findOneWithTrips(operationId, qb).pipe(
            tap((operationTrips) => {
                this.operationRouteDiagramStateStore.setOperationTrips(
                    operationTrips
                );
            }),
            map(() => undefined)
        );
    }

    fetchStationsV2(): Observable<void> {
        const serviceId = this.serviceListStateQuery.serviceId;
        const qb = new RequestQueryBuilder().setJoin([
            {
                field: 'operatingSystems.route.routeStationLists.station.routeStationLists',
            },
            {
                field: 'operatingSystems.route.routeStationLists.station.routeStationLists.route',
            },
        ]);

        return this.serviceService.findOneWithStations(serviceId, qb).pipe(
            tap((data) => {
                this.operationRouteDiagramStateStore.setStations(data.stations);
            }),
            map(() => undefined)
        );
    }

    receiveNavigateTimetableEvent(): Observable<OperationRouteDiagramNavigateTimetable> {
        return this._navigateTimetable$.asObservable();
    }

    emitNavigateTimetableEvent(ev: OperationRouteDiagramNavigateTimetable) {
        this._navigateTimetable$.next(ev);
    }
}
