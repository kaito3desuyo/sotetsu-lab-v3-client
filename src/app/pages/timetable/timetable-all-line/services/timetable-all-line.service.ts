import { Injectable } from '@angular/core';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
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
        private readonly timetableAllLineStateQuery: TimetableAllLineStateQuery
    ) {}

    // v2

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
                this.timetableAllLineStateStore.setStations(data.stations);
            }),
            map(() => null)
        );
    }

    fetchTripBlocksV2(): Observable<void> {
        const calendarId = this.timetableAllLineStateQuery.calendarId;
        const tripDirection = this.timetableAllLineStateQuery.tripDirection;
        const tripBlockId = this.timetableAllLineStateQuery.tripBlockId;

        const qb = new RequestQueryBuilder()
            .setJoin([
                { field: 'trips' },
                { field: 'trips.times' },
                { field: 'trips.tripOperationLists' },
                { field: 'trips.tripOperationLists.operation' },
                { field: 'trips.tripClass' },
            ])
            .setFilter(
                tripBlockId
                    ? [
                          {
                              field: 'id',
                              operator: CondOperator.EQUALS,
                              value: tripBlockId,
                          },
                      ]
                    : [
                          {
                              field: 'trips.calendarId',
                              operator: CondOperator.EQUALS,
                              value: calendarId,
                          },
                          {
                              field: 'trips.tripDirection',
                              operator: CondOperator.EQUALS,
                              value: tripDirection,
                          },
                      ]
            )
            .sortBy([
                { field: 'trips.times.departureDays', order: 'ASC' },
                { field: 'trips.times.departureTime', order: 'ASC' },
            ]);

        return this.tripBlockService.findMany(qb).pipe(
            tap((data: TripBlockDetailsDto[]) => {
                this.timetableAllLineStateStore.setTripBlocks(data);
                this.timetableAllLineStateStore.updatePageSettings({
                    length: data
                        .map((tripBlock) => tripBlock.trips.length)
                        .reduce((a, b) => a + b, 0),
                });
            }),
            map(() => null)
        );
    }

    addTripToTripBlockV2(params: {
        tripBlockId: string;
        tripId: string;
    }): Observable<void> {
        const qb = RequestQueryBuilder.create();

        return this.tripBlockService
            .addTripToTripBlock(qb, params.tripBlockId, {
                tripId: params.tripId,
            })
            .pipe(map(() => undefined));
    }

    deleteTripFromTripBlockV2(params: {
        tripBlockId: string;
        tripId: string;
        holdAsAnotherTripBlock?: boolean;
    }): Observable<void> {
        const qb = RequestQueryBuilder.create();

        return this.tripBlockService
            .deleteTripFromTripBlock(qb, params.tripBlockId, {
                tripId: params.tripId,
                holdAsAnotherTripBlock: params.holdAsAnotherTripBlock ?? false,
            })
            .pipe(map(() => undefined));
    }
}
