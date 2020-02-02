import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import {
    BehaviorSubject,
    Observable,
    zip,
    timer,
    forkJoin,
    Subscription
} from 'rxjs';
import { map, tap, flatMap, skip, take } from 'rxjs/operators';
import find from 'lodash/find';
import moment, { Moment } from 'moment';
import { IOperationSightingTable } from '../interfaces/operation-sighting-table';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { BaseService } from 'src/app/general/classes/base-service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { CalendarApiService } from 'src/app/general/api/calendar-api.service';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';
import { ITripClass } from 'src/app/general/interfaces/trip-class';
import { IService } from 'src/app/general/interfaces/service';
import { ServiceApiService } from 'src/app/general/api/service-api.service';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { OperationModel } from 'src/app/general/models/operation/operation-model';
import { CalendarModel } from 'src/app/general/models/calendar/calendar-model';
import { StationModel } from 'src/app/general/models/station/station-model';
import { TripClassModel } from 'src/app/general/models/trip-class/trip-class-model';
import { ServiceModel } from 'src/app/general/models/service/service-model';
import { ReadOperationDto } from 'src/app/general/models/operation/operation-dto';
import { Router } from '@angular/router';
import { SocketService } from 'src/app/general/services/socket.service';
import { NotificationService } from 'src/app/general/services/notification.service';
import { OperationSightingModel } from 'src/app/general/models/operation-sighting/operation-sighting-model';
import { IOperationCurrentPosition } from 'src/app/general/interfaces/operation-current-position';
import { TripOperationListModel } from 'src/app/general/models/trip-operation-list/trip-operation-list-model';
import { ParamsQuery } from 'src/app/state/params';
import { OperationSightingAddFormService } from 'src/app/shared/operation-shared/services/operation-sighting-add-form.service';
import { cloneDeep } from 'lodash';

@Injectable()
export class OperationRealTimeService extends BaseService {
    private _finalUpdateTime$: BehaviorSubject<Moment> = new BehaviorSubject<
        Moment
    >(moment());
    finalUpdateTime$: Observable<
        Moment
    > = this._finalUpdateTime$.asObservable();

    private _isAutoReloadEnabled$: BehaviorSubject<
        boolean
    > = new BehaviorSubject<boolean>(true);
    isAutoReloadEnabled$: Observable<
        boolean
    > = this._isAutoReloadEnabled$.asObservable();
    get isAutoReloadEnabled() {
        return this._isAutoReloadEnabled$.getValue();
    }
    set isAutoReloadEnabled(bool: boolean) {
        this._isAutoReloadEnabled$.next(bool);
    }

    private _isVisibleCurrentPosition$: BehaviorSubject<
        boolean
    > = new BehaviorSubject<boolean>(true);
    isVisibleCurrentPosition$: Observable<
        boolean
    > = this._isVisibleCurrentPosition$.asObservable();
    set isVisibleCurrentPosition(bool: boolean) {
        this._isVisibleCurrentPosition$.next(bool);
    }

    currentCalendarId$: Observable<string>;

    private services: BehaviorSubject<IService[]> = new BehaviorSubject<
        IService[]
    >(null);

    private calendars: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
        ICalendar[]
    >([]);

    private operations: BehaviorSubject<IOperation[]> = new BehaviorSubject<
        IOperation[]
    >([]);

    private formationNumbers: BehaviorSubject<
        { formationNumber: string }[]
    > = new BehaviorSubject<{ formationNumber: string }[]>([]);

    private operationNumbers: BehaviorSubject<
        { operationNumber: string }[]
    > = new BehaviorSubject<{ operationNumber: string }[]>([]);

    private tripClasses: BehaviorSubject<ITripClass[]> = new BehaviorSubject<
        ITripClass[]
    >([]);

    private operationsCurrentPosition: BehaviorSubject<
        IOperationCurrentPosition[]
    > = new BehaviorSubject<IOperationCurrentPosition[]>([]);

    private stations: BehaviorSubject<IStation[]> = new BehaviorSubject<
        IStation[]
    >([]);

    private formationTableData: BehaviorSubject<
        IOperationSightingTable[]
    > = new BehaviorSubject<IOperationSightingTable[]>([]);
    private operationTableData: BehaviorSubject<
        IOperationSightingTable[]
    > = new BehaviorSubject<IOperationSightingTable[]>([]);

    private formationSightingsLatest: BehaviorSubject<
        IOperationSighting[]
    > = new BehaviorSubject<IOperationSighting[]>([]);
    private operationSightingsLatest: BehaviorSubject<
        IOperationSighting[]
    > = new BehaviorSubject<IOperationSighting[]>([]);

    private socketSub: Subscription;

    constructor(
        private router: Router,
        private socketService: SocketService,
        private serviceApi: ServiceApiService,
        private calendarApi: CalendarApiService,
        private tripApi: TripApiService,
        private formationApi: FormationApiService,
        private operationApi: OperationApiService,
        private stationApi: StationApiService,
        private paramsQuery: ParamsQuery,
        private notification: NotificationService,
        private operationSightingAddFormService: OperationSightingAddFormService
    ) {
        super();

        /*
        this.subscription = this.socketService.on().subscribe(data => {
            if (this.isAutoReloadEnabled) {
                this.notification.open('データが更新されました', 'OK');
                this.fetchSightingsLatest()
                    .pipe(flatMap(() => this.generateTable()))
                    .subscribe();
            }
        });
        */

        this.subscription = this.operationSightingAddFormService.sendSightingEvent$.subscribe(
            () => {
                this.fetchSightingsLatest()
                    .pipe(flatMap(() => this.generateTable()))
                    .subscribe();
            }
        );

        this.currentCalendarId$ = this.paramsQuery.calendar$;

        this.subscription = timer(0, 1000 * 60)
            .pipe(
                skip(1),
                flatMap(() => this.fetchOperationsCurrentPosition()),
                flatMap(() => this.generateTable())
            )
            .subscribe();
    }

    startSocketReceive(): void {
        console.log('開始');
        this.socketSub = this.socketService.on().subscribe(data => {
            console.log(data);
            if (this.isAutoReloadEnabled) {
                this.notification.open('データが更新されました', 'OK');
                this.fetchSightingsLatest()
                    .pipe(flatMap(() => this.generateTable()))
                    .subscribe();
            }
        });
    }

    stopSocketReceive(): void {
        console.log('終了');
        this.socketSub.unsubscribe();
    }

    /**
     * 最終目撃情報
     */
    fetchSightingsLatest(): Observable<void> {
        return this.operationApi
            .getOperationSightingsLatest({
                calendar_id: this.getCalendarsAsStatic()[0].id
            })
            .pipe(
                tap(data => {
                    this.setFormationSightingsLatest(
                        data.group_by_formations.map(o =>
                            OperationSightingModel.readOperationSightingDtoImpl(
                                o
                            )
                        )
                    );
                    this.setOperationSightingsLatest(
                        data.group_by_operations.map(o =>
                            OperationSightingModel.readOperationSightingDtoImpl(
                                o
                            )
                        )
                    );
                    this._finalUpdateTime$.next(moment());
                }),
                map(() => null)
            );
    }

    getFormationSightingsLatest(): Observable<IOperationSighting[]> {
        return this.formationSightingsLatest.asObservable();
    }

    setFormationSightingsLatest(sightings: IOperationSighting[]): void {
        this.formationSightingsLatest.next(sightings);
    }

    getOperationSightingsLatest(): Observable<IOperationSighting[]> {
        return this.operationSightingsLatest.asObservable();
    }

    setOperationSightingsLatest(sightings: IOperationSighting[]): void {
        this.operationSightingsLatest.next(sightings);
    }

    /**
     * サービス
     */
    getServices(): Observable<IService[]> {
        return this.services.asObservable();
    }

    getServicesAsStatic(): IService[] {
        return this.services.getValue();
    }

    setServices(data: IService[]): void {
        this.services.next(data);
    }

    fetchServices(): Observable<void> {
        return this.serviceApi
            .searchServices({
                service_name:
                    '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線'
            })
            .pipe(
                tap(data => {
                    const services = data.services.map(result =>
                        ServiceModel.readServiceDtoImpl(result)
                    );
                    this.setServices(services);
                }),
                map(() => null)
            );
    }

    /**
     * カレンダー
     */
    getCalendars(): Observable<ICalendar[]> {
        return this.calendars.asObservable();
    }

    getCalendarsAsStatic(): ICalendar[] {
        return this.calendars.getValue();
    }

    setCalendars(data: ICalendar[]): void {
        this.calendars.next(data);
    }

    fetchCalendars(): Observable<void> {
        return this.calendarApi
            .searchCalendars({
                date: moment()
                    .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD')
            })
            .pipe(
                tap(data => {
                    const calendars = data.calendars.map(result =>
                        CalendarModel.readCalendarDtoImpl(result)
                    );
                    this.setCalendars(calendars);
                }),
                map(() => null)
            );
    }

    /**
     * 運用
     */
    getOperations(): Observable<IOperation[]> {
        return this.operations.asObservable();
    }

    getOperationsAsStatic(): IOperation[] {
        return this.operations.getValue();
    }

    setOperations(array: IOperation[]): void {
        this.operations.next(array);
    }

    fetchOperations(): Observable<void> {
        return this.operationApi
            .searchOperations({
                calendar_id: this.getCalendarsAsStatic()[0].id
            })
            .pipe(
                map((data: { operations: ReadOperationDto[] }) =>
                    data.operations.map(result =>
                        OperationModel.readOperationDtoImpl(result)
                    )
                ),
                tap(operations => {
                    this.setOperations(operations);
                }),
                map(() => null)
            );
    }

    /**
     * 編成番号
     */
    getFormationNumbers(): Observable<{ formationNumber: string }[]> {
        return this.formationNumbers.asObservable();
    }

    setFormationNumbers(value: { formationNumber: string }[]): void {
        this.formationNumbers.next(value);
    }

    fetchFormationNumbers(): Observable<void> {
        return this.formationApi
            .searchFormationNumbers({
                date: moment()
                    .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD')
            })
            .pipe(
                tap(numbers => {
                    this.setFormationNumbers(numbers);
                }),
                map(() => null)
            );
    }

    /**
     * 運用番号
     */
    getOperationNumbers(): Observable<{ operationNumber: string }[]> {
        return this.operationNumbers.asObservable();
    }

    setOperationNumbers(value: { operationNumber: string }[]): void {
        this.operationNumbers.next(value);
    }

    fetchOperationNumbers(): Observable<void> {
        return this.operationApi
            .searchOperationNumbers({
                calendar_id: this.getCalendarsAsStatic()[0].id
            })
            .pipe(
                tap(numbers => {
                    this.setOperationNumbers(numbers);
                }),
                map(() => null)
            );
    }

    /**
     * 現在位置情報
     */
    getOperationsCurrentPosition(): Observable<IOperationCurrentPosition[]> {
        return this.operationsCurrentPosition.asObservable();
    }

    setOperationsCurrentPosition(position: IOperationCurrentPosition[]): void {
        this.operationsCurrentPosition.next(position);
    }

    fetchOperationsCurrentPosition(): Observable<void> {
        return this.operationApi
            .searchOperationsCurrentPosition({
                calendar_id: this.getCalendarsAsStatic()[0].id
            })
            .pipe(
                map(data => {
                    return data.operations.map(result => {
                        return {
                            id: result.id,
                            operationNumber: result.operation_number,
                            currentPosition: {
                                prev:
                                    result.current_position.prev &&
                                    TripOperationListModel.readTripOperationListDtoImpl(
                                        result.current_position.prev
                                    ),
                                current:
                                    result.current_position.current &&
                                    TripOperationListModel.readTripOperationListDtoImpl(
                                        result.current_position.current
                                    ),
                                next:
                                    result.current_position.next &&
                                    TripOperationListModel.readTripOperationListDtoImpl(
                                        result.current_position.next
                                    )
                            }
                        };
                    });
                }),
                tap(data => {
                    this.setOperationsCurrentPosition(data);
                }),
                map(() => null)
            );
    }

    /**
     * 列車種別
     */
    getTripClasses(): Observable<ITripClass[]> {
        return this.tripClasses.asObservable();
    }

    setTripClasses(array: ITripClass[]): void {
        return this.tripClasses.next(array);
    }

    fetchTripClasses(): Observable<void> {
        return this.tripApi
            .getTripClasses({
                service_id: this.getServicesAsStatic()[0].id
            })
            .pipe(
                tap(data => {
                    const tripClasses: ITripClass[] = data.trip_classes.map(
                        result => TripClassModel.readTripClassDtoImpl(result)
                    );
                    this.setTripClasses(tripClasses);
                }),
                map(() => null)
            );
    }

    /**
     * 駅情報を返す
     */
    getStations(): Observable<IStation[]> {
        return this.stations.asObservable();
    }

    /**
     * 駅情報をセットする
     * @param array IStation
     */
    setStations(array: IStation[]): void {
        this.stations.next(array);
    }

    /**
     * 駅情報を取得する
     */
    fetchStations(): Observable<void> {
        return this.stationApi.getStations().pipe(
            tap(data => {
                const stations = data.stations.map(result =>
                    StationModel.readStationDtoImpl(result)
                );
                this.setStations(stations);
            }),
            map(() => null)
        );
    }

    getFormationTableData(): Observable<IOperationSightingTable[]> {
        return this.formationTableData.asObservable();
    }

    setFormationTableData(array: IOperationSightingTable[]): void {
        this.formationTableData.next(array);
    }

    getOperationTableData(): Observable<IOperationSightingTable[]> {
        return this.operationTableData.asObservable();
    }

    setOperationTableData(array: IOperationSightingTable[]): void {
        this.operationTableData.next(array);
    }

    generateOperationTripsTableData(): Observable<
        {
            operationNumber: string;
            trip: {
                tripId: string;
                tripBlockId: string;
                tripDirection: 0 | 1;
                tripNumber: string;
                tripClassName: string;
                tripClassColor: string;
                prevTime: string;
                prevStation: string;
                nextTime: string;
                nextStation: string;
            };
        }[]
    > {
        return zip(
            this.getOperationsCurrentPosition(),
            this.getStations(),
            this.getTripClasses()
        ).pipe(
            map(([positions, stations, tripClasses]) => {
                return positions.map(position => {
                    if (
                        !position.currentPosition.prev &&
                        !position.currentPosition.current &&
                        position.currentPosition.next
                    ) {
                        return {
                            operationNumber: position.operationNumber,
                            trip: {
                                tripId: null,
                                tripBlockId: null,
                                tripDirection: null,
                                tripNumber: null,
                                tripClassName: null,
                                tripClassColor: null,
                                prevTime: position.currentPosition.next.trip
                                    .depotOut
                                    ? '〇'
                                    : null,
                                prevStation: position.currentPosition.next.trip
                                    .depotOut
                                    ? '出庫前'
                                    : null,
                                nextTime:
                                    position.currentPosition.next.startTime
                                        .departureTime,
                                nextStation: find(
                                    stations,
                                    station =>
                                        station.id ===
                                        position.currentPosition.next.startTime
                                            .stationId
                                ).stationName
                            }
                        };
                    }

                    if (
                        position.currentPosition.prev &&
                        !position.currentPosition.current &&
                        position.currentPosition.next
                    ) {
                        return {
                            operationNumber: position.operationNumber,
                            trip: {
                                tripId: null,
                                tripBlockId: null,
                                tripDirection: null,
                                tripNumber: null,
                                tripClassName: null,
                                tripClassColor: null,
                                prevTime:
                                    position.currentPosition.prev.endTime
                                        .arrivalTime,
                                prevStation: find(
                                    stations,
                                    station =>
                                        station.id ===
                                        position.currentPosition.prev.endTime
                                            .stationId
                                ).stationName,
                                nextTime:
                                    position.currentPosition.next.startTime
                                        .departureTime,
                                nextStation:
                                    position.currentPosition.prev.trip
                                        .depotIn &&
                                    position.currentPosition.next.trip.depotOut
                                        ? '一時入庫'
                                        : '停車中'
                            }
                        };
                    }

                    if (
                        !position.currentPosition.prev &&
                        position.currentPosition.current &&
                        !position.currentPosition.next
                    ) {
                        const tripClass = find(
                            tripClasses,
                            o =>
                                o.id ===
                                position.currentPosition.current.trip
                                    .tripClassId
                        );
                        return {
                            operationNumber: position.operationNumber,
                            trip: {
                                tripId: position.currentPosition.current.tripId,
                                tripBlockId:
                                    position.currentPosition.current.trip
                                        .tripBlockId,
                                tripDirection: position.currentPosition.current
                                    .trip.tripDirection as 0 | 1,
                                tripNumber:
                                    position.currentPosition.current.trip
                                        .tripNumber,
                                tripClassName: tripClass.tripClassName,
                                tripClassColor: tripClass.tripClassColor,
                                prevTime:
                                    position.currentPosition.current.startTime
                                        .departureTime,
                                prevStation: find(
                                    stations,
                                    station =>
                                        station.id ===
                                        position.currentPosition.current
                                            .startTime.stationId
                                ).stationName,
                                nextTime:
                                    position.currentPosition.current.endTime
                                        .arrivalTime,
                                nextStation: find(
                                    stations,
                                    station =>
                                        station.id ===
                                        position.currentPosition.current.endTime
                                            .stationId
                                ).stationName
                            }
                        };
                    }

                    if (
                        position.currentPosition.prev &&
                        !position.currentPosition.current &&
                        !position.currentPosition.next
                    ) {
                        return {
                            operationNumber: position.operationNumber,
                            trip: {
                                tripId: null,
                                tripBlockId: null,
                                tripDirection: null,
                                tripNumber: null,
                                tripClassName: null,
                                tripClassColor: null,
                                prevTime:
                                    position.currentPosition.prev.endTime
                                        .arrivalTime,
                                prevStation: find(
                                    stations,
                                    station =>
                                        station.id ===
                                        position.currentPosition.prev.endTime
                                            .stationId
                                ).stationName,
                                nextTime: position.currentPosition.prev.trip
                                    .depotIn
                                    ? '△'
                                    : null,
                                nextStation: position.currentPosition.prev.trip
                                    .depotIn
                                    ? '入庫済'
                                    : null
                            }
                        };
                    }
                    return {
                        operationNumber: position.operationNumber,
                        trip: {
                            tripId: null,
                            tripBlockId: null,
                            tripDirection: null,
                            tripNumber: null,
                            tripClassName: null,
                            tripClassColor: null,
                            prevTime: null,
                            prevStation: '不明',
                            nextTime: null,
                            nextStation: '不明'
                        }
                    };
                });
            })
        );
    }

    /**
     * 編成テーブル用データを読み込み
     */
    generateFormationTableData(): Observable<IOperationSightingTable[]> {
        return zip(
            this.getFormationNumbers(),
            this.generateOperationTripsTableData(),
            this.getFormationSightingsLatest()
        ).pipe(
            take(1),
            map(([numbers, operationTrips, formationSightings]) => {
                return numbers.map(data => {
                    const findSightings: IOperationSighting = find(
                        formationSightings,
                        (val: IOperationSighting) =>
                            val.formation.formationNumber ===
                            data.formationNumber
                    );

                    if (!findSightings) {
                        return {
                            id: null,
                            postedOperationNumber: null,
                            rotatedOperationNumber: null,
                            rotatedOperationId: null,
                            formationNumber: data.formationNumber,
                            sightingTime: null,
                            updatedAt: null,
                            trip: null
                        };
                    }

                    const targetTrip = find(
                        operationTrips,
                        operationTrip =>
                            findSightings.circulatedOperation &&
                            findSightings.circulatedOperation
                                .operationNumber ===
                                operationTrip.operationNumber
                    );

                    return {
                        id: findSightings.id,
                        postedOperationNumber: findSightings.operation
                            ? findSightings.operation.operationNumber
                            : null,
                        rotatedOperationNumber: findSightings.circulatedOperation
                            ? findSightings.circulatedOperation.operationNumber
                            : null,
                        rotatedOperationId: findSightings.circulatedOperationId,
                        formationNumber:
                            findSightings.formation.formationNumber,

                        sightingTime: findSightings.sightingTime,
                        updatedAt: findSightings.updatedAt,
                        trip: targetTrip ? targetTrip.trip : null
                    };
                });
            }),
            tap(data => {
                this.setFormationTableData(data);
            })
        );
    }

    /**
     * 運用テーブル用データを読み込み
     */
    generateOperationTableData(): Observable<IOperationSightingTable[]> {
        return zip(
            this.getOperations(),
            this.getOperationNumbers(),
            this.generateOperationTripsTableData(),
            this.getOperationSightingsLatest()
        ).pipe(
            take(1),
            map(([operations, numbers, operationTrips, operationSightings]) => {
                return numbers.map(data => {
                    const findSightings: IOperationSighting = find(
                        operationSightings,
                        (val: IOperationSighting) =>
                            val.circulatedOperation &&
                            val.circulatedOperation.operationNumber ===
                                data.operationNumber
                    );

                    if (!findSightings) {
                        const targetTrip1 = find(
                            operationTrips,
                            operationTrip =>
                                data.operationNumber ===
                                operationTrip.operationNumber
                        );

                        return {
                            id: null,
                            postedOperationNumber: null,
                            rotatedOperationNumber: data.operationNumber,
                            rotatedOperationId: find(
                                operations,
                                operation =>
                                    operation.operationNumber ===
                                    data.operationNumber
                            ).id,
                            formationNumber: null,
                            sightingTime: null,
                            updatedAt: null,
                            trip: targetTrip1 ? targetTrip1.trip : null
                        };
                    }

                    const targetTrip2 = find(
                        operationTrips,
                        operationTrip =>
                            findSightings.circulatedOperation &&
                            findSightings.circulatedOperation
                                .operationNumber ===
                                operationTrip.operationNumber
                    );

                    return {
                        id: findSightings.id,
                        postedOperationNumber:
                            findSightings.operation.operationNumber,
                        rotatedOperationNumber:
                            findSightings.circulatedOperation.operationNumber,
                        rotatedOperationId: findSightings.circulatedOperationId,
                        formationNumber: findSightings.formation
                            ? findSightings.formation.formationNumber
                            : null,
                        sightingTime: findSightings.sightingTime,
                        updatedAt: findSightings.updatedAt,
                        trip: targetTrip2 ? targetTrip2.trip : null
                    };
                });
            }),
            tap(data => {
                this.setOperationTableData(data);
            })
        );
    }

    /**
     * テーブルを生成する
     */
    generateTable(): Observable<void> {
        return forkJoin([
            this.generateFormationTableData(),
            this.generateOperationTableData()
        ]).pipe(
            tap(([formation, operation]) => {
                this.setFormationTableData(formation);
                this.setOperationTableData(operation);
            }),
            map(() => null)
        );
    }
}
