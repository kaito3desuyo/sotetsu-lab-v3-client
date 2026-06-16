import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { ServiceService } from 'src/app/libs/service/usecase/service.service';
import { TripBlockDetailsDto } from 'src/app/libs/trip-block/usecase/dtos/trip-block-details.dto';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import {
    TimetableAllLineStateQuery,
    TimetableAllLineStateStore,
} from '../../timetable-all-line/states/timetable-all-line.state';

@Injectable()
export class TimetableAllLineService {
    constructor(
        private readonly serviceService: ServiceService,
        private readonly tripBlockService: TripBlockService,
        private readonly serviceListStateQuery: ServiceListStateQuery,
        private readonly timetableAllLineStateStore: TimetableAllLineStateStore,
        private readonly timetableAllLineStateQuery: TimetableAllLineStateQuery,
    ) {}

    fetchStationsV2(): Observable<void> {
        const serviceId = this.serviceListStateQuery.serviceId;
        return this.serviceService.findOneWithStations_V3({ serviceId }).pipe(
            tap((data) => {
                this.timetableAllLineStateStore.setStations(data.stations);
            }),
            map(() => undefined),
        );
    }

    fetchTripBlocksV2(): Observable<void> {
        const calendarId = this.timetableAllLineStateQuery.calendarId;
        const tripDirection = this.timetableAllLineStateQuery.tripDirection;
        const tripBlockId = this.timetableAllLineStateQuery.tripBlockId;

        const tripBlocks$ = tripBlockId
            ? this.tripBlockService.findOneById_V3({ id: tripBlockId }).pipe(map((tb) => [tb]))
            : this.tripBlockService.findManyByFilter_V3({ calendarId, tripDirection });

        return tripBlocks$.pipe(
            tap((data: TripBlockDetailsDto[]) => {
                this.timetableAllLineStateStore.setTripBlocks(data);
                this.timetableAllLineStateStore.updatePageSettings({
                    length: data
                        .map((tripBlock) => tripBlock.trips.length)
                        .reduce((a, b) => a + b, 0),
                });
            }),
            map(() => undefined),
        );
    }

    addTripToTripBlockV2(params: {
        tripBlockId: string;
        tripId: string;
    }): Observable<void> {
        return this.tripBlockService
            .addTripToTripBlock_V3(params.tripBlockId, { tripId: params.tripId })
            .pipe(map(() => undefined));
    }

    deleteTripFromTripBlockV2(params: {
        tripBlockId: string;
        tripId: string;
        holdAsAnotherTripBlock?: boolean;
    }): Observable<void> {
        return this.tripBlockService
            .deleteTripFromTripBlock_V3(params.tripBlockId, {
                tripId: params.tripId,
                holdAsAnotherTripBlock: params.holdAsAnotherTripBlock ?? false,
            })
            .pipe(map(() => undefined));
    }
}
