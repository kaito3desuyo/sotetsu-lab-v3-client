import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripBlockService } from 'src/app/libs/trip-block/usecase/trip-block.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TripService } from 'src/app/libs/trip/usecase/trip.service';
import {
    TimetableStationStateQuery,
    TimetableStationStateStore,
} from '../../timetable-station/states/timetable-station.state';

@Injectable()
export class TimetableStationService {
    readonly #calendarService = inject(CalendarService);
    readonly #stationService = inject(StationService);
    readonly #tripService = inject(TripService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #tripClassService = inject(TripClassService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);
    readonly #timetableStationStateStore = inject(TimetableStationStateStore);
    readonly #timetableStationStateQuery = inject(TimetableStationStateQuery);

    fetchCalendar(): Observable<void> {
        const calendarId = this.#timetableStationStateQuery.calendarId;

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((data: CalendarDetailsDto) => {
                this.#timetableStationStateStore.setCalendar(data);
            }),
            map(() => undefined),
        );
    }

    fetchTrips(): Observable<void> {
        const stationId = this.#timetableStationStateQuery.stationId;
        const calendarId = this.#timetableStationStateQuery.calendarId;
        const tripDirection = this.#timetableStationStateQuery.tripDirection;

        return this.#tripService
            .findManyByStationId({ stationId, calendarId, tripDirection })
            .pipe(
                tap((data: TripDetailsDto[]) => {
                    this.#timetableStationStateStore.setTrips(data);
                }),
                map(() => undefined),
            );
    }

    fetchTripBlocks(): Observable<void> {
        const tripBlockIds = [
            ...new Set(
                this.#timetableStationStateQuery.trips.map((o) => o.tripBlockId),
            ),
        ];

        if (tripBlockIds.length === 0) {
            this.#timetableStationStateStore.setTripBlocks([]);
            return of(undefined);
        }

        return forkJoin(
            tripBlockIds.map((id) => this.#tripBlockService.findOneById({ id })),
        ).pipe(
            tap((data) => {
                this.#timetableStationStateStore.setTripBlocks(data);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data: TripClassDetailsDto[]) => {
                this.#timetableStationStateStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        return this.#stationService.findMany({}).pipe(
            tap((data: StationDetailsDto[]) => {
                this.#timetableStationStateStore.setStations(data);
            }),
            map(() => undefined),
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = this.#timetableStationStateQuery.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((data) => data.filter((o) => o.operationNumber !== '100')),
            tap((data: OperationDetailsDto[]) => {
                this.#timetableStationStateStore.setOperations(data);
            }),
            map(() => undefined),
        );
    }

    fetchOperationSightingTimeCrossSections(): Observable<void> {
        const operationIds = this.#timetableStationStateQuery.operationIds;
        const operations = this.#timetableStationStateQuery.operations.filter(
            (o) => operationIds.includes(o.operationId),
        );

        if (operations.length === 0) {
            this.#timetableStationStateStore.setOperationSightingTimeCrossSections(
                [],
            );
            return of(undefined);
        }

        return forkJoin(
            operations.map(({ operationNumber }) =>
                this.#operationSightingService.findOneTimeCrossSectionByOperationNumber(
                    { operationNumber },
                ),
            ),
        ).pipe(
            tap((data) => {
                this.#timetableStationStateStore.setOperationSightingTimeCrossSections(
                    data,
                );
            }),
            map(() => undefined),
        );
    }
}
