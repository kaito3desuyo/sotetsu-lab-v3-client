import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { IStation } from 'src/app/general/interfaces/station';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { map, tap } from 'rxjs/operators';
import { StationModel } from 'src/app/general/models/station/station-model';
import { IOperation } from 'src/app/general/interfaces/operation';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import reject from 'lodash/reject';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { TripClassModel } from 'src/app/general/models/trip-class/trip-class-model';
import { ITimetableTripForm } from '../interfaces/timetable-trip-form';
import {
    CreateTripDto,
    UpdateTripDto
} from 'src/app/general/models/trip/trip-dto';
import moment from 'moment';
import { ITripBlock } from 'src/app/general/models/trip-block/trip-block';
import { TripBlockModel } from 'src/app/general/models/trip-block/trip-block-model';
import { UpdateTimeDto } from 'src/app/general/models/time/time-dto';

@Injectable()
export class TimetableEditorService {
    tripBlock$: BehaviorSubject<ITripBlock> = new BehaviorSubject<ITripBlock>(
        null
    );

    serviceId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    calendarId$: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    stations$: BehaviorSubject<IStation[]> = new BehaviorSubject<IStation[]>(
        []
    );
    operations$: BehaviorSubject<IOperation[]> = new BehaviorSubject<
        IOperation[]
    >([]);
    tripClasses$: BehaviorSubject<ITripClass[]> = new BehaviorSubject<
        ITripClass[]
    >([]);

    tripDirection$: BehaviorSubject<0 | 1> = new BehaviorSubject<0 | 1>(null);

    saveEvent$: Subject<ITimetableTripForm[]> = new Subject<
        ITimetableTripForm[]
    >();

    clearEvent$: Subject<void> = new Subject<void>();

    constructor(
        private serviceApi: ServiceApiService,
        private operationApi: OperationApiService,
        private tripApi: TripApiService
    ) {}

    getTripBlock(): Observable<ITripBlock> {
        return this.tripBlock$.asObservable();
    }

    getTripBlockAsStatic(): ITripBlock {
        return this.tripBlock$.getValue();
    }

    setTripBlock(tripBlock: ITripBlock): void {
        this.tripBlock$.next(tripBlock);
    }

    fetchTripBlock(id: string): Observable<void> {
        return this.tripApi.getTripBlockById(id).pipe(
            map(data => TripBlockModel.readTripBlockDtoImpl(data.trip_block)),
            tap(data => {
                this.setTripBlock(data);
            }),
            map(() => null)
        );
    }

    fetchServiceId(): Observable<string> {
        return this.serviceApi
            .searchServices({
                service_name:
                    '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線'
            })
            .pipe(
                map(data => data.services[0].id),
                tap(id => this.setServiceId(id))
            );
    }

    getServiceIdAsStatic(): string {
        return this.serviceId$.getValue();
    }

    setServiceId(id: string) {
        this.serviceId$.next(id);
    }

    getCalendarIdAsStatic(): string {
        return this.calendarId$.getValue();
    }

    setCalendarId(id: string): void {
        this.calendarId$.next(id);
    }

    getStations(): Observable<IStation[]> {
        return this.stations$.asObservable();
    }

    setStations(stations: IStation[]): void {
        this.stations$.next(stations);
    }

    fetchStations(): Observable<void> {
        return this.serviceApi
            .getServiceStationsById(this.getServiceIdAsStatic(), {
                trip_direction: String(this.getTripDirectionAsStatic()) as
                    | '0'
                    | '1'
            })
            .pipe(
                map(data =>
                    data.stations.map(station =>
                        StationModel.readStationDtoImpl(station)
                    )
                ),
                tap(data => this.setStations(data)),
                map(() => null)
            );
    }

    getOperations(): Observable<IOperation[]> {
        return this.operations$.asObservable();
    }

    setOperations(operations: IOperation[]): void {
        this.operations$.next(operations);
    }

    fetchOperations(): Observable<void> {
        return this.operationApi
            .searchOperations({ calendar_id: this.getCalendarIdAsStatic() })
            .pipe(
                map(data =>
                    data.operations.map(operation =>
                        OperationModel.readOperationDtoImpl(operation)
                    )
                ),
                tap(data => {
                    this.setOperations(
                        reject(data, o => o.operationNumber === '100')
                    );
                }),
                map(() => null)
            );
    }

    getTripClasses(): Observable<ITripClass[]> {
        return this.tripClasses$.asObservable();
    }

    setTripClasses(tripClasses: ITripClass[]): void {
        this.tripClasses$.next(tripClasses);
    }

    fetchTripClasses(): Observable<void> {
        return this.tripApi
            .getTripClasses({ service_id: this.getServiceIdAsStatic() })
            .pipe(
                map(data =>
                    data.trip_classes.map(tripClass =>
                        TripClassModel.readTripClassDtoImpl(tripClass)
                    )
                ),
                tap(data => {
                    this.setTripClasses(data);
                }),
                map(() => null)
            );
    }

    getTripDirectionAsStatic(): 0 | 1 {
        return this.tripDirection$.getValue();
    }

    setTripDirection(direction: 0 | 1) {
        return this.tripDirection$.next(direction);
    }

    receiveSaveEvent(): Observable<ITimetableTripForm[]> {
        return this.saveEvent$.asObservable();
    }

    emitSaveEvent(data: ITimetableTripForm[]): void {
        this.saveEvent$.next(data);
    }

    receiveClearEvent(): Observable<void> {
        return this.clearEvent$.asObservable();
    }

    emitClearEvent(): void {
        this.clearEvent$.next();
    }

    convertFormValueToSaveData(
        value: ITimetableTripForm
    ): CreateTripDto | UpdateTripDto {
        const times = value.times.filter(time => time.stopType !== 'noVia');

        const tripObj = {
            service_id: this.getServiceIdAsStatic(),
            calendar_id: this.getCalendarIdAsStatic(),
            extra_calendar_id: null,
            trip_number: value.tripNumber,
            trip_name: null,
            trip_class_id: value.tripClassId,
            trip_direction: this.getTripDirectionAsStatic(),
            depot_in: value.depotIn,
            depot_out: value.depotOut,
            trip_operation_lists: [],
            times: times.map((time, index, array) => {
                const timeObj = {
                    station_id: time.stationId,
                    stop_id: time.stopId || null,
                    stop_sequence: index + 1,
                    pickup_type:
                        time.stopType === 'stop' && index !== array.length - 1
                            ? 0
                            : time.stopType === 'passing'
                            ? 1
                            : 1,
                    dropoff_type:
                        time.stopType === 'stop' && index !== 0
                            ? 0
                            : time.stopType === 'passing'
                            ? 1
                            : 1,
                    arrival_days:
                        time.arrivalTime && index !== 0
                            ? moment(time.arrivalTime, 'HH:mm').hour() < 4
                                ? 2
                                : 1
                            : null,
                    arrival_time:
                        time.arrivalTime && index !== 0
                            ? moment(time.arrivalTime, 'HH:mm').format(
                                  'HH:mm:00'
                              )
                            : null,
                    departure_days:
                        time.departureTime && index !== array.length - 1
                            ? moment(time.departureTime, 'HH:mm').hour() < 4
                                ? 2
                                : 1
                            : null,
                    departure_time:
                        time.departureTime && index !== array.length - 1
                            ? moment(time.departureTime, 'HH:mm').format(
                                  'HH:mm:00'
                              )
                            : null
                };

                if (time.id) {
                    (timeObj as UpdateTimeDto).id = time.id;
                }

                return timeObj;
            })
        };

        if (value.id) {
            (tripObj as UpdateTripDto).id = value.id;
        }

        if (value.tripOperationListId) {
            (tripObj as UpdateTripDto).trip_operation_lists[0].id =
                value.tripOperationListId;
        }

        if (value.operationId) {
            tripObj.trip_operation_lists.push({
                operation_id: value.operationId,
                start_station_id: times[0].stationId,
                end_station_id: times[times.length - 1].stationId
            });
        }

        return tripObj;
    }
}
