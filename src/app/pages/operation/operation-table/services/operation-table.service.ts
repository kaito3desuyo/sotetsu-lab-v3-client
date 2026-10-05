import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { CalendarService } from 'src/app/libs/calendar/usecase/calendar.service';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
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

        // calendar 未選択（初期状態など）では /v3/calendars/null を叩かない。
        if (!calendarId) {
            return of(undefined);
        }

        return this.#calendarService.findOne({ calendarId }).pipe(
            tap((calendar: CalendarDetailsDto) => {
                OperationTableStore.setCalendar(calendar);
            }),
            map(() => undefined),
        );
    }

    fetchOperationTrips(): Observable<void> {
        const calendarId = OperationTableStore.calendarId;

        // calendar 未選択では /v3/operations/calendar/null/trips を叩かない。
        if (!calendarId) {
            return of(undefined);
        }

        // ダイヤ内の全運用を列車つきで 1 回で取る。以前は運用の一覧を取ってから
        // 運用ごとに /operations/:id/trips を呼び、1 画面で 104 本のリクエストが飛んでいた
        return this.#operationService.findManyWithTrips({ calendarId }).pipe(
            map((operationTrips) =>
                operationTrips.filter(
                    ({ operation }) => operation.operationNumber !== '100',
                ),
            ),
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
}
