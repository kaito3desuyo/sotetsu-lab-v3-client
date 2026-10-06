import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { OperationRouteDiagramNavigateTimetable } from '../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramStore } from '../stores/operation-route-diagram.store';
import { curateRouteDiagramStationsWithAliases } from '../utils/operation-route-diagram-curate-stations.util';

@Injectable()
export class OperationRouteDiagramService {
    readonly #serviceService = inject(ServiceService);
    readonly #operationService = inject(OperationService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);

    readonly #navigateTimetable$ =
        new Subject<OperationRouteDiagramNavigateTimetable>();

    fetchOperationTrips(): Observable<void> {
        const operationId = OperationRouteDiagramStore.operationId;

        return this.#operationService.findOneWithTrips({ operationId }).pipe(
            tap((operationTrips) => {
                OperationRouteDiagramStore.setOperationTrips(operationTrips);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;

        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                const { stations, aliases } =
                    curateRouteDiagramStationsWithAliases(data.stations);
                OperationRouteDiagramStore.setStations(stations);
                OperationRouteDiagramStore.setStationAliases(aliases);
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
