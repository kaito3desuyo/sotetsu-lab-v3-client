import { Injectable } from '@angular/core';
import { IOperation } from 'src/app/general/interfaces/operation';
import { BehaviorSubject, Observable, pipe, of } from 'rxjs';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { map, tap, flatMap } from 'rxjs/operators';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { StationModel } from 'src/app/general/models/station/station-model';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { TripClassModel } from 'src/app/general/models/trip-class/trip-class-model';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { ReadServiceDto } from 'src/app/general/models/service/service-dto';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';

@Injectable()
export class OperationTableService {
    private _calendarId$: BehaviorSubject<string> = new BehaviorSubject<string>(
        null
    );
    set calendarId(id: string) {
        this._calendarId$.next(id);
    }

    private _calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
        ICalendar[]
    >([]);
    calendars$ = this._calendars$.asObservable();

    private _calendar$: BehaviorSubject<ICalendar> = new BehaviorSubject<
        ICalendar
    >(null);
    calendar$ = this._calendar$.asObservable();

    private _operationTrips$: BehaviorSubject<
        IOperation[]
    > = new BehaviorSubject<IOperation[]>([]);
    operationTrips$ = this._operationTrips$.asObservable();

    private _stations$: BehaviorSubject<IStation[]> = new BehaviorSubject<
        IStation[]
    >([]);
    stations$ = this._stations$.asObservable();

    private _tripClasses$: BehaviorSubject<ITripClass[]> = new BehaviorSubject<
        ITripClass[]
    >([]);
    tripClasses$ = this._tripClasses$.asObservable();

    constructor(
        private calendarApi: CalendarApiService,
        private serviceApi: ServiceApiService,
        private operationApi: OperationApiService,
        private stationApi: StationApiService,
        private tripApi: TripApiService
    ) {}

    fetchCalendars(): Observable<ICalendar> {
        return this.calendarApi.getCalendars().pipe(
            map((data) =>
                data.calendars.map((o) => CalendarModel.readCalendarDtoImpl(o))
            ),
            tap((calendars) => this._calendars$.next(calendars)),
            map(() => null)
        );
    }

    fetchCalendar(): Observable<void> {
        const id = this._calendarId$.getValue();
        if (!id) {
            return of(null).pipe(tap(() => this._calendar$.next(null)));
        }
        return this.calendarApi.getCalendarById(id).pipe(
            map((data) => CalendarModel.readCalendarDtoImpl(data.calendar)),
            tap((data) => {
                this._calendar$.next(data);
            }),
            map(() => null)
        );
    }

    fetchOperationTrips(): Observable<void> {
        const id = this._calendarId$.getValue();
        if (!id) {
            return of(null).pipe(tap(() => this._operationTrips$.next(null)));
        }
        return this.operationApi
            .getOperationsTrips({
                calendar_id: id,
            })
            .pipe(
                map((data) => {
                    return data.operations.map((result) =>
                        OperationModel.readOperationDtoImpl(result)
                    );
                }),
                tap((data) => {
                    this._operationTrips$.next(data);
                }),
                map(() => null)
            );
    }

    fetchStations(): Observable<void> {
        return this.stationApi.getStations().pipe(
            pipe(
                map((data) =>
                    data.stations.map((result) =>
                        StationModel.readStationDtoImpl(result)
                    )
                ),
                tap((data) => {
                    this._stations$.next(data);
                }),
                map(() => null)
            )
        );
    }

    fetchTripClasses(): Observable<void> {
        return this.serviceApi
            .searchServices({
                service_name:
                    '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
            })
            .pipe(
                flatMap((data: { services: ReadServiceDto[] }) =>
                    this.tripApi.getTripClasses({
                        service_id: data.services[0].id,
                    })
                ),
                map((data) =>
                    data.trip_classes.map((result) =>
                        TripClassModel.readTripClassDtoImpl(result)
                    )
                ),
                tap((data) => {
                    this._tripClasses$.next(data);
                }),
                map(() => null)
            );
    }
}
