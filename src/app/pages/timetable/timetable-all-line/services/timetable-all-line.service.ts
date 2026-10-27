import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockFields } from 'src/app/libs/trip-block/usecase/trip-block-fields';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TimetableAllLineStore } from '../stores/timetable-all-line.store';

/**
 * 全線時刻表が読む項目の組。表（時刻・着発・種別・運用番号・始発/終着）と並べ替え、
 * 編集・コピーの遷移（calendarId・tripBlockId）に要るものだけを取る。
 */
const TIMETABLE_ALL_LINE_FIELDS: TripBlockFields = {
    trip: [
        'tripNumber',
        'tripDirection',
        'tripBlockId',
        'tripClassId',
        'calendarId',
    ],
    time: [
        'stationId',
        'stopSequence',
        'arrivalDays',
        'arrivalTime',
        'departureDays',
        'departureTime',
        'pickupType',
        'dropoffType',
    ],
    tripOperationList: ['operationId'],
    operation: ['operationNumber'],
    tripClass: ['tripClassName', 'tripClassColor'],
};

@Injectable()
export class TimetableAllLineService {
    readonly #serviceService = inject(ServiceService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #serviceListState = inject(ServiceListState);
    readonly #store = inject(TimetableAllLineStore);

    fetchStations(): Observable<void> {
        const serviceId = this.#serviceListState.serviceId();
        return this.#serviceService.findOneWithStations({ serviceId }).pipe(
            tap((data) => {
                this.#store.setStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    fetchTripBlocks(): Observable<void> {
        const calendarId = this.#store.calendarId();
        const tripDirection = this.#store.tripDirection();
        const tripBlockId = this.#store.tripBlockId();

        const tripBlocks$ = tripBlockId
            ? this.#tripBlockService
                  .findOneById({ id: tripBlockId })
                  .pipe(map((tb) => [tb]))
            : this.#tripBlockService.findManyByFilter({
                  calendarId,
                  tripDirection,
                  fields: TIMETABLE_ALL_LINE_FIELDS,
              });

        return tripBlocks$.pipe(
            tap((data: TripBlockDetailsDto[]) => {
                this.#store.setTripBlocks(data);
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
