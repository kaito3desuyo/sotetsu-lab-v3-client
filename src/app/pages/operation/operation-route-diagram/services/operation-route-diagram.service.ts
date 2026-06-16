import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
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
    readonly #serviceService = inject(ServiceService);
    readonly #operationService = inject(OperationService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);
    readonly #operationRouteDiagramStateStore = inject(
        OperationRouteDiagramStateStore,
    );
    readonly #operationRouteDiagramStateQuery = inject(
        OperationRouteDiagramStateQuery,
    );

    readonly #navigateTimetable$ =
        new Subject<OperationRouteDiagramNavigateTimetable>();

    fetchOperationTrips(): Observable<void> {
        const operationId = this.#operationRouteDiagramStateQuery.operationId;

        return this.#operationService.findOneWithTrips_V3({ operationId }).pipe(
            tap((operationTrips) => {
                this.#operationRouteDiagramStateStore.setOperationTrips(
                    operationTrips,
                );
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;

        return this.#serviceService.findOneWithStations_V3({ serviceId }).pipe(
            tap((data) => {
                this.#operationRouteDiagramStateStore.setStations(
                    data.stations,
                );
            }),
            map(() => undefined),
        );
    }

    receiveNavigateTimetableEvent(): Observable<OperationRouteDiagramNavigateTimetable> {
        return this.#navigateTimetable$.asObservable();
    }

    emitNavigateTimetableEvent(ev: OperationRouteDiagramNavigateTimetable) {
        this.#navigateTimetable$.next(ev);
    }
}
