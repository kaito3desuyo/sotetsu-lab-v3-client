import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { OperationRouteDiagramStore } from '../stores/operation-route-diagram.store';
import { curateRouteDiagramStationsWithAliases } from '../utils/operation-route-diagram-curate-stations.util';

@Injectable()
export class OperationRouteDiagramService {
    readonly #serviceService = inject(ServiceService);
    readonly #operationService = inject(OperationService);
    readonly #serviceListState = inject(ServiceListState);
    readonly #store = inject(OperationRouteDiagramStore);

    fetchOperationTrips(): Observable<void> {
        const operationId = this.#store.operationId();

        return this.#operationService.findOneWithTrips({ operationId }).pipe(
            tap((operationTrips) => {
                this.#store.setOperationTrips(operationTrips);
            }),
            map(() => undefined),
        );
    }

    /** 運用のダイヤが分かってから呼ぶ（fetchOperationTrips のあと）。取れなければ前後の運用を出さないだけ */
    fetchItineraryLinks(): Observable<void> {
        const calendarId = this.#store.calendarId();

        if (!calendarId) {
            return of(undefined);
        }

        return this.#operationService
            .findManyItineraryLinks({ calendarId })
            .pipe(
                tap((links) => {
                    this.#store.setItineraryLinks(links);
                }),
                map(() => undefined),
            );
    }

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListState.serviceId();

        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                const { stations, aliases } =
                    curateRouteDiagramStationsWithAliases(data.stations);
                this.#store.setStations(stations);
                this.#store.setStationAliases(aliases);
            }),
            map(() => undefined),
        );
    }
}
