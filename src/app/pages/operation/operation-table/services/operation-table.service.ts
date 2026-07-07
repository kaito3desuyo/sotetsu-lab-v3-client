import { inject, Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { OperationGroupDto } from 'src/app/libs/operation/usecase/dtos/operation-group.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { OperationTableStore } from '../stores/operation-table.store';

@Injectable()
export class OperationTableService {
    readonly #calendarService = inject(CalendarService);
    readonly #operationService = inject(OperationService);
    readonly #stationService = inject(StationService);
    readonly #tripClassService = inject(TripClassService);

    fetchCalendar(): Observable<void> {
        const calendarId = OperationTableStore.calendarId;

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((calendar: CalendarDetailsDto) => {
                OperationTableStore.setCalendar(calendar);
            }),
            map(() => undefined),
        );
    }

    fetchOperationTrips(): Observable<void> {
        const calendarId = OperationTableStore.calendarId;

        return this.#operationService.findManyByCalendarId({ calendarId }).pipe(
            map((operations) =>
                operations.filter((o) => o.operationNumber !== '100'),
            ),
            switchMap((operations: OperationDetailsDto[]) => {
                if (!operations.length) {
                    return of([]);
                }
                return forkJoin(
                    operations.map((operation) =>
                        this.#operationService.findOneWithTrips({
                            operationId: operation.operationId,
                        }),
                    ),
                );
            }),
            tap((operationTrips) => {
                OperationTableStore.setOperationTrips(operationTrips);
            }),
            map(() => undefined),
        );
    }

    fetchStations(): Observable<void> {
        return this.#stationService.findMany({}).pipe(
            tap((stations: StationDetailsDto[]) => {
                OperationTableStore.setStations(stations);
            }),
            map(() => undefined),
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.#tripClassService.findMany({}).pipe(
            tap((tripClasses: TripClassDetailsDto[]) => {
                OperationTableStore.setTripClasses(tripClasses);
            }),
            map(() => undefined),
        );
    }

    fetchOperationGroups(): Observable<void> {
        return this.#operationService.findManyGroups().pipe(
            tap((operationGroups: OperationGroupDto[]) => {
                OperationTableStore.setOperationGroups(operationGroups);
            }),
            map(() => undefined),
        );
    }
}
