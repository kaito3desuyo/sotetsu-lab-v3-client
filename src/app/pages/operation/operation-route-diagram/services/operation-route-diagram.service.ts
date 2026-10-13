import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { OperationRouteDiagramStore } from '../stores/operation-route-diagram.store';
import { curateRouteDiagramStationsWithAliases } from '../utils/operation-route-diagram-curate-stations.util';

@Injectable()
export class OperationRouteDiagramService {
    readonly #serviceService = inject(ServiceService);
    readonly #operationService = inject(OperationService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);

    fetchOperationTrips(): Observable<void> {
        const operationId = OperationRouteDiagramStore.operationId;

        return this.#operationService.findOneWithTrips({ operationId }).pipe(
            tap((operationTrips) => {
                OperationRouteDiagramStore.setOperationTrips(operationTrips);
            }),
            map(() => undefined),
        );
    }

    /** 運用のダイヤが分かってから呼ぶ（fetchOperationTrips のあと）。取れなければ前後の運用を出さないだけ */
    fetchItineraryLinks(): Observable<void> {
        const calendarId = OperationRouteDiagramStore.calendarId;

        if (!calendarId) {
            return of(undefined);
        }

        return this.#operationService
            .findManyItineraryLinks({ calendarId })
            .pipe(
                tap((links) => {
                    OperationRouteDiagramStore.setItineraryLinks(links);
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
}
