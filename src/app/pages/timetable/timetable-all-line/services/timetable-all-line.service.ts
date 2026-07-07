import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TimetableAllLineStore } from '../stores/timetable-all-line.store';

@Injectable()
export class TimetableAllLineService {
    readonly #serviceService = inject(ServiceService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #serviceListStateQuery = inject(ServiceListStateQuery);

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListStateQuery.serviceId;
        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                TimetableAllLineStore.setStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    fetchTripBlocks(): Observable<void> {
        const calendarId = TimetableAllLineStore.calendarId;
        const tripDirection = TimetableAllLineStore.tripDirection;
        const tripBlockId = TimetableAllLineStore.tripBlockId;

        const tripBlocks$ = tripBlockId
            ? this.#tripBlockService
                  .findOneById({ id: tripBlockId })
                  .pipe(map((tb) => [tb]))
            : this.#tripBlockService.findManyByFilter({
                  calendarId,
                  tripDirection,
              });

        return tripBlocks$.pipe(
            tap((data: TripBlockDetailsDto[]) => {
                TimetableAllLineStore.setTripBlocks(data);
            }),
            map(() => undefined),
        );
    }

    addTripToTripBlock(params: {
        tripBlockId: string;
        tripId: string;
    }): Observable<void> {
        return this.#tripBlockService
            .addTripToTripBlock(params.tripBlockId, { tripId: params.tripId })
            .pipe(map(() => undefined));
    }

    deleteTripFromTripBlock(params: {
        tripBlockId: string;
        tripId: string;
        holdAsAnotherTripBlock?: boolean;
    }): Observable<void> {
        return this.#tripBlockService
            .deleteTripFromTripBlock(params.tripBlockId, {
                tripId: params.tripId,
                holdAsAnotherTripBlock: params.holdAsAnotherTripBlock ?? false,
            })
            .pipe(map(() => undefined));
    }
}
