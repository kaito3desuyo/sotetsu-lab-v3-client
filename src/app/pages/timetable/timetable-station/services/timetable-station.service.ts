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
import { TimetableStationStore } from '../stores/timetable-station.store';

@Injectable()
export class TimetableStationService {
    readonly #calendarService = inject(CalendarService);
    readonly #stationService = inject(StationService);
    readonly #tripService = inject(TripService);
    readonly #tripBlockService = inject(TripBlockService);
    readonly #tripClassService = inject(TripClassService);
    readonly #operationService = inject(OperationService);
    readonly #operationSightingService = inject(OperationSightingService);

    fetchCalendar(): Observable<void> {
        const calendarId = TimetableStationStore.calendarId;

        // calendar 未選択（初期状態など）では /v3/calendars/null を叩かない。
        if (!calendarId) {
            return of(undefined);
        }

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((data: CalendarDetailsDto) => {
                TimetableStationStore.setCalendar(data);
            }),
            map(() => undefined),
        );
    }

    fetchTrips(): Observable<void> {
        const stationId = TimetableStationStore.stationId;
        const calendarId = TimetableStationStore.calendarId;
        const tripDirection = TimetableStationStore.tripDirection;

        // 駅・ダイヤ未選択（初期状態）では /v3/trips/station/null を叩かない。
        if (!stationId || !calendarId) {
            return of(undefined);
        }

        return this.#tripService
            .findManyByStationId({ stationId, calendarId, tripDirection })
            .pipe(
                tap((data: TripDetailsDto[]) => {
                    TimetableStationStore.setTrips(data);
                }),
                map(() => undefined),
            );
    }

    fetchTripBlocks(): Observable<void> {
        const tripBlockIds = [
            ...new Set(
                TimetableStationStore.trips
                    .map((o) => o.tripBlockId)
                    .filter((id): id is string => id !== undefined && id !== null),
            ),
        ];

        if (tripBlockIds.length === 0) {
            TimetableStationStore.setTripBlocks([]);
            return of(undefined);
        }

        return forkJoin(
            tripBlockIds.map((id) => this.#tripBlockService.findOneById({ id })),
        ).pipe(
            tap((data) => {
                TimetableStationStore.setTripBlocks(data);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((data: TripClassDetailsDto[]) => {
                TimetableStationStore.setTripClasses(data);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        return this.#stationService.findMany({}).pipe(
            tap((data: StationDetailsDto[]) => {
                TimetableStationStore.setStations(data);
            }),
            map(() => undefined),
        );
    }

    fetchOperations(): Observable<void> {
        const calendarId = TimetableStationStore.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((data) => data.filter((o) => o.operationNumber !== '100')),
            tap((data: OperationDetailsDto[]) => {
                TimetableStationStore.setOperations(data);
            }),
            map(() => undefined),
        );
    }

    /**
     * B7: 過去ダイヤ表示時は呼び出し側（コンポーネント）がこのメソッド自体を呼ばず、
     * ストアへ空配列を設定する。ここでは「今日有効なダイヤ」表示時のフェッチのみを担う。
     */
    fetchOperationSightingTimeCrossSections(): Observable<void> {
        const operationIds = TimetableStationStore.operationIds;
        const operations = TimetableStationStore.operations.filter((o) =>
            operationIds.includes(o.operationId),
        );

        if (operations.length === 0) {
            TimetableStationStore.setOperationSightingTimeCrossSections([]);
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
                TimetableStationStore.setOperationSightingTimeCrossSections(
                    data,
                );
            }),
            map(() => undefined),
        );
    }
}
