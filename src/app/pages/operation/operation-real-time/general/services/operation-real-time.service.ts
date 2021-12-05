import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import {
    BehaviorSubject,
    Observable,
    zip,
    timer,
    forkJoin,
    Subscription,
} from 'rxjs';
import { map, tap, flatMap, skip, take, switchMap } from 'rxjs/operators';
import { find } from 'lodash-es';
import moment, { Moment } from 'moment';
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
import { SocketService } from 'src/app/general/services/socket.service';
import { NotificationService } from 'src/app/general/services/notification.service';
import { OperationSightingModel } from 'src/app/general/models/operation-sighting/operation-sighting-model';
import { IOperationCurrentPosition } from 'src/app/general/interfaces/operation-current-position';
import { TripOperationListModel } from 'src/app/general/models/trip-operation-list/trip-operation-list-model';
import { ParamsQuery } from 'src/app/state/params';
import { OperationSightingAddFormService } from 'src/app/shared/operation-shared/services/operation-sighting-add-form.service';
import {
    IOperationSightingTableData,
    IOperationCurrentPositionTableData,
} from '../interfaces/operation-sighting-table';
import { OperationSightingService } from 'src/app/libs/operation-sighting/usecase/operation-sighting.service';
import {
    OperationRealTimeStateQuery,
    OperationRealTimeStateStore,
} from '../../states/operation-real-time.state';
import { CondOperator, RequestQueryBuilder } from '@nestjsx/crud-request';
import { OperationSightingDetailsDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-details.dto';
import { OperationService } from 'src/app/libs/operation/usecase/operation.service';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { FormationService } from 'src/app/libs/formation/usecase/formation.service';
import dayjs from 'dayjs';
import { FormationDetailsDto } from 'src/app/libs/formation/usecase/dtos/formation-details.dto';
import { StationService } from 'src/app/libs/station/usecase/station.service';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripClassService } from 'src/app/libs/trip-class/usecase/trip-class.service';
import { TripClassQuery } from 'src/app/libs/trip-class/infrastructure/queries/trip-class.query';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

@Injectable()
export class OperationRealTimeService extends BaseService {
    private _finalUpdateTime$: BehaviorSubject<Moment> =
        new BehaviorSubject<Moment>(moment());
    finalUpdateTime$: Observable<Moment> =
        this._finalUpdateTime$.asObservable();

    private _isAutoReloadEnabled$: BehaviorSubject<boolean> =
        new BehaviorSubject<boolean>(true);
    isAutoReloadEnabled$: Observable<boolean> =
        this._isAutoReloadEnabled$.asObservable();
    get isAutoReloadEnabled() {
        return this._isAutoReloadEnabled$.getValue();
    }
    set isAutoReloadEnabled(bool: boolean) {
        this._isAutoReloadEnabled$.next(bool);
    }

    private _isVisibleCurrentPosition$: BehaviorSubject<boolean> =
        new BehaviorSubject<boolean>(true);
    isVisibleCurrentPosition$: Observable<boolean> =
        this._isVisibleCurrentPosition$.asObservable();
    set isVisibleCurrentPosition(bool: boolean) {
        this._isVisibleCurrentPosition$.next(bool);
    }

    currentCalendarId$: Observable<string>;

    private _services$: BehaviorSubject<IService[]> = new BehaviorSubject<
        IService[]
    >(null);
    services$ = this._services$.asObservable();

    private _calendars$: BehaviorSubject<ICalendar[]> = new BehaviorSubject<
        ICalendar[]
    >([]);
    calendars$ = this._calendars$.asObservable();

    private _operations$: BehaviorSubject<IOperation[]> = new BehaviorSubject<
        IOperation[]
    >([]);
    operations$ = this._operations$.asObservable();

    private _formationNumbers$: BehaviorSubject<{ formationNumber: string }[]> =
        new BehaviorSubject<{ formationNumber: string }[]>([]);
    formationNumbers$ = this._formationNumbers$.asObservable();

    private _operationNumbers$: BehaviorSubject<{ operationNumber: string }[]> =
        new BehaviorSubject<{ operationNumber: string }[]>([]);
    operationNumbers$ = this._operationNumbers$.asObservable();

    private _tripClasses$: BehaviorSubject<ITripClass[]> = new BehaviorSubject<
        ITripClass[]
    >([]);
    tripClasses$ = this._tripClasses$.asObservable();

    private _operationsCurrentPosition$: BehaviorSubject<
        IOperationCurrentPosition[]
    > = new BehaviorSubject<IOperationCurrentPosition[]>([]);
    operationsCurrentPosition$ =
        this._operationsCurrentPosition$.asObservable();

    private _stations$: BehaviorSubject<IStation[]> = new BehaviorSubject<
        IStation[]
    >([]);
    stations$ = this._stations$.asObservable();

    private _formationSightingsLatest$: BehaviorSubject<IOperationSighting[]> =
        new BehaviorSubject<IOperationSighting[]>([]);
    formationSightingsLatest$ = this._formationSightingsLatest$.asObservable();

    private _operationSightingsLatest$: BehaviorSubject<IOperationSighting[]> =
        new BehaviorSubject<IOperationSighting[]>([]);
    operationSightingsLatest$ = this._operationSightingsLatest$.asObservable();

    private _formationTableData$: BehaviorSubject<
        IOperationSightingTableData[]
    > = new BehaviorSubject<IOperationSightingTableData[]>([]);
    formationTableData$ = this._formationTableData$.asObservable();

    private _operationTableData$: BehaviorSubject<
        IOperationSightingTableData[]
    > = new BehaviorSubject<IOperationSightingTableData[]>([]);
    operationTableData$ = this._operationTableData$.asObservable();

    private socketSub: Subscription;

    constructor(
        private socketService: SocketService,
        private serviceApi: ServiceApiService,
        private calendarApi: CalendarApiService,
        private tripApi: TripApiService,
        private formationApi: FormationApiService,
        private operationApi: OperationApiService,
        private stationApi: StationApiService,
        private paramsQuery: ParamsQuery,
        private notification: NotificationService,
        private operationSightingAddFormService: OperationSightingAddFormService,
        private readonly todaysCalendarListStateQuery: TodaysCalendarListStateQuery,
        private readonly operationRealTimeStateStore: OperationRealTimeStateStore,
        private readonly operationRealTimeStateQuery: OperationRealTimeStateQuery,
        private readonly operationService: OperationService,
        private readonly formationService: FormationService,
        private readonly operationSightingService: OperationSightingService,
        private readonly tripClassService: TripClassService
    ) {
        super();

        this.subscription =
            this.operationSightingAddFormService.sendSightingEvent$.subscribe(
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
        this.socketSub = this.socketService.on().subscribe((data) => {
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
                calendar_id: this._calendars$.getValue()[0].id,
            })
            .pipe(
                tap((data) => {
                    this._formationSightingsLatest$.next(
                        data.group_by_formations.map((o) =>
                            OperationSightingModel.readOperationSightingDtoImpl(
                                o
                            )
                        )
                    );

                    this._operationSightingsLatest$.next(
                        data.group_by_operations.map((o) =>
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

    /**
     * サービス
     */
    fetchServices(): Observable<void> {
        return this.serviceApi
            .searchServices({
                service_name:
                    '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
            })
            .pipe(
                tap((data) => {
                    const services = data.services.map((result) =>
                        ServiceModel.readServiceDtoImpl(result)
                    );
                    this._services$.next(services);
                }),
                map(() => null)
            );
    }

    /**
     * カレンダー
     */
    fetchCalendars(): Observable<void> {
        return this.calendarApi
            .searchCalendars({
                date: moment()
                    .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((data) => {
                    const calendars = data.calendars.map((result) =>
                        CalendarModel.readCalendarDtoImpl(result)
                    );
                    this._calendars$.next(calendars);
                }),
                map(() => null)
            );
    }

    /**
     * 運用
     */
    fetchOperations(): Observable<void> {
        return this.operationApi
            .searchOperations({
                calendar_id: this._calendars$.getValue()[0].id,
            })
            .pipe(
                map((data: { operations: ReadOperationDto[] }) =>
                    data.operations.map((result) =>
                        OperationModel.readOperationDtoImpl(result)
                    )
                ),
                tap((operations) => {
                    this._operations$.next(operations);
                }),
                map(() => null)
            );
    }

    /**
     * 編成番号
     */
    fetchFormationNumbers(): Observable<void> {
        return this.formationApi
            .searchFormationNumbers({
                date: moment()
                    .subtract(moment().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((numbers) => {
                    this._formationNumbers$.next(numbers);
                }),
                map(() => null)
            );
    }

    /**
     * 運用番号
     */
    fetchOperationNumbers(): Observable<void> {
        return this.operationApi
            .searchOperationNumbers({
                calendar_id: this._calendars$.getValue()[0].id,
            })
            .pipe(
                tap((numbers) => {
                    this._operationNumbers$.next(numbers);
                }),
                map(() => null)
            );
    }

    /**
     * 現在位置情報
     */
    fetchOperationsCurrentPosition(): Observable<void> {
        return this.operationApi
            .searchOperationsCurrentPosition({
                calendar_id: this._calendars$.getValue()[0].id,
            })
            .pipe(
                map((data) => {
                    return data.operations.map((result) => {
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
                                    ),
                            },
                        };
                    });
                }),
                tap((data) => {
                    this._operationsCurrentPosition$.next(data);
                }),
                map(() => null)
            );
    }

    /**
     * 列車種別
     */
    fetchTripClasses(): Observable<void> {
        return this.tripApi
            .getTripClasses({
                service_id: this._services$.getValue()[0].id,
            })
            .pipe(
                tap((data) => {
                    const tripClasses: ITripClass[] = data.trip_classes.map(
                        (result) => TripClassModel.readTripClassDtoImpl(result)
                    );
                    this._tripClasses$.next(tripClasses);
                }),
                map(() => null)
            );
    }

    /**
     * 駅情報を取得する
     */
    fetchStations(): Observable<void> {
        return this.stationApi.getStations().pipe(
            tap((data) => {
                const stations = data.stations.map((result) =>
                    StationModel.readStationDtoImpl(result)
                );
                this._stations$.next(stations);
            }),
            map(() => null)
        );
    }

    generateCurrentPositionTableData(
        position: IOperationCurrentPosition
    ): IOperationCurrentPositionTableData {
        const stations = this._stations$.getValue();
        const tripClasses = this._tripClasses$.getValue();

        if (
            !position.currentPosition.prev &&
            !position.currentPosition.current &&
            position.currentPosition.next
        ) {
            return {
                tripId: null,
                tripBlockId: null,
                tripDirection: null,
                tripNumber: null,
                tripClassName: null,
                tripClassColor: null,
                prevTime: position.currentPosition.next.trip.depotOut
                    ? '〇'
                    : null,
                prevStation: position.currentPosition.next.trip.depotOut
                    ? '出庫前'
                    : null,
                nextTime: position.currentPosition.next.startTime.departureTime,
                nextStation: find(
                    stations,
                    (station) =>
                        station.id ===
                        position.currentPosition.next.startTime.stationId
                ).stationName,
            };
        }

        if (
            position.currentPosition.prev &&
            !position.currentPosition.current &&
            position.currentPosition.next
        ) {
            return {
                tripId: null,
                tripBlockId: null,
                tripDirection: null,
                tripNumber: null,
                tripClassName: null,
                tripClassColor: null,
                prevTime: position.currentPosition.prev.endTime.arrivalTime,
                prevStation: find(
                    stations,
                    (station) =>
                        station.id ===
                        position.currentPosition.prev.endTime.stationId
                ).stationName,
                nextTime: position.currentPosition.next.startTime.departureTime,
                nextStation:
                    position.currentPosition.prev.trip.depotIn &&
                    position.currentPosition.next.trip.depotOut
                        ? '一時入庫'
                        : '停車中',
            };
        }

        if (
            !position.currentPosition.prev &&
            position.currentPosition.current &&
            !position.currentPosition.next
        ) {
            const tripClass = find(
                tripClasses,
                (o) =>
                    o.id === position.currentPosition.current.trip.tripClassId
            );
            return {
                tripId: position.currentPosition.current.tripId,
                tripBlockId: position.currentPosition.current.trip.tripBlockId,
                tripDirection: position.currentPosition.current.trip
                    .tripDirection as 0 | 1,
                tripNumber: position.currentPosition.current.trip.tripNumber,
                tripClassName: tripClass.tripClassName,
                tripClassColor: tripClass.tripClassColor,
                prevTime:
                    position.currentPosition.current.startTime.departureTime,
                prevStation: find(
                    stations,
                    (station) =>
                        station.id ===
                        position.currentPosition.current.startTime.stationId
                ).stationName,
                nextTime: position.currentPosition.current.endTime.arrivalTime,
                nextStation: find(
                    stations,
                    (station) =>
                        station.id ===
                        position.currentPosition.current.endTime.stationId
                ).stationName,
            };
        }

        if (
            position.currentPosition.prev &&
            !position.currentPosition.current &&
            !position.currentPosition.next
        ) {
            return {
                tripId: null,
                tripBlockId: null,
                tripDirection: null,
                tripNumber: null,
                tripClassName: null,
                tripClassColor: null,
                prevTime: position.currentPosition.prev.endTime.arrivalTime,
                prevStation: find(
                    stations,
                    (station) =>
                        station.id ===
                        position.currentPosition.prev.endTime.stationId
                ).stationName,
                nextTime: position.currentPosition.prev.trip.depotIn
                    ? '△'
                    : null,
                nextStation: position.currentPosition.prev.trip.depotIn
                    ? '入庫済'
                    : null,
            };
        }
        return {
            tripId: null,
            tripBlockId: null,
            tripDirection: null,
            tripNumber: null,
            tripClassName: null,
            tripClassColor: null,
            prevTime: null,
            prevStation: '不明',
            nextTime: null,
            nextStation: '不明',
        };
    }

    /**
     * 編成テーブル用データを読み込み
     */
    generateFormationTableData(): Observable<IOperationSightingTableData[]> {
        return zip(
            this.formationNumbers$,
            this.formationSightingsLatest$,
            this.operationsCurrentPosition$
        ).pipe(
            take(1),
            map(([numbers, formationSightings, currentPositions]) => {
                return numbers.map((data) => {
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
                            trip: null,
                        };
                    }

                    const targetPosition = find(
                        currentPositions,
                        (position) =>
                            findSightings.circulatedOperation &&
                            findSightings.circulatedOperation
                                .operationNumber === position.operationNumber
                    );

                    return {
                        id: findSightings.id,
                        postedOperationNumber: findSightings.operation
                            ? findSightings.operation.operationNumber
                            : null,
                        rotatedOperationNumber:
                            findSightings.circulatedOperation
                                ? findSightings.circulatedOperation
                                      .operationNumber
                                : null,
                        rotatedOperationId: findSightings.circulatedOperationId,
                        formationNumber:
                            findSightings.formation.formationNumber,

                        sightingTime: findSightings.sightingTime,
                        updatedAt: findSightings.updatedAt,
                        trip: targetPosition
                            ? this.generateCurrentPositionTableData(
                                  targetPosition
                              )
                            : null,
                    };
                });
            }),
            tap((data) => {
                this._formationTableData$.next(data);
            })
        );
    }

    /**
     * 運用テーブル用データを読み込み
     */
    generateOperationTableData(): Observable<IOperationSightingTableData[]> {
        return zip(
            this.operations$,
            this.operationNumbers$,
            this.operationSightingsLatest$,
            this.operationsCurrentPosition$
        ).pipe(
            take(1),
            map(
                ([
                    operations,
                    numbers,
                    operationSightings,
                    currentPositions,
                ]) => {
                    return numbers.map((data) => {
                        const findSightings: IOperationSighting = find(
                            operationSightings,
                            (val: IOperationSighting) =>
                                val.circulatedOperation &&
                                val.circulatedOperation.operationNumber ===
                                    data.operationNumber
                        );

                        if (!findSightings) {
                            const targetPosition1 = find(
                                currentPositions,
                                (position) =>
                                    data.operationNumber ===
                                    position.operationNumber
                            );

                            return {
                                id: null,
                                postedOperationNumber: null,
                                rotatedOperationNumber: data.operationNumber,
                                rotatedOperationId: find(
                                    operations,
                                    (operation) =>
                                        operation.operationNumber ===
                                        data.operationNumber
                                ).id,
                                formationNumber: null,
                                sightingTime: null,
                                updatedAt: null,
                                trip: targetPosition1
                                    ? this.generateCurrentPositionTableData(
                                          targetPosition1
                                      )
                                    : null,
                            };
                        }

                        const targetPosition2 = find(
                            currentPositions,
                            (position) =>
                                findSightings.circulatedOperation &&
                                findSightings.circulatedOperation
                                    .operationNumber ===
                                    position.operationNumber
                        );

                        return {
                            id: findSightings.id,
                            postedOperationNumber:
                                findSightings.operation.operationNumber,
                            rotatedOperationNumber:
                                findSightings.circulatedOperation
                                    .operationNumber,
                            rotatedOperationId:
                                findSightings.circulatedOperationId,
                            formationNumber: findSightings.formation
                                ? findSightings.formation.formationNumber
                                : null,
                            sightingTime: findSightings.sightingTime,
                            updatedAt: findSightings.updatedAt,
                            trip: targetPosition2
                                ? this.generateCurrentPositionTableData(
                                      targetPosition2
                                  )
                                : null,
                        };
                    });
                }
            ),
            tap((data) => {
                this._operationTableData$.next(data);
            })
        );
    }

    /**
     * テーブルを生成する
     */
    generateTable(): Observable<void> {
        return forkJoin([
            this.generateFormationTableData(),
            this.generateOperationTableData(),
        ]).pipe(map(() => null));
    }

    // v2

    fetchOperationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder()
            .setFilter([
                {
                    field: 'calendarId',
                    operator: CondOperator.EQUALS,
                    value: this.todaysCalendarListStateQuery.todaysCalendarId,
                },
            ])
            .sortBy([{ field: 'operationNumber', order: 'ASC' }]);

        return this.operationService.findMany(qb).pipe(
            tap((data: OperationDetailsDto[]) => {
                this.operationRealTimeStateStore.setOperations(data);
            }),
            map(() => undefined)
        );
    }

    fetchFormationsV2(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.formationService
            .findManyBySpeficicDate(qb, {
                date: dayjs()
                    .subtract(dayjs().hour() < 4 ? 1 : 0, 'days')
                    .format('YYYY-MM-DD'),
            })
            .pipe(
                tap((data: FormationDetailsDto[]) => {
                    this.operationRealTimeStateStore.setFormations(data);
                }),
                map(() => undefined)
            );
    }

    fetchOperationSightings(): Observable<void> {
        const qb = new RequestQueryBuilder().setJoin([
            { field: 'operation' },
            { field: 'formation' },
        ]);

        return this.operationSightingService
            .findManyLatestGroupByOperation(qb)
            .pipe(
                tap((data: OperationSightingDetailsDto[]) =>
                    this.operationRealTimeStateStore.setOperationSightings(data)
                ),
                map(() => undefined)
            );
    }

    fetchFormationSightings(): Observable<void> {
        const qb = new RequestQueryBuilder().setJoin([
            { field: 'operation' },
            { field: 'formation' },
        ]);

        return this.operationSightingService
            .findManyLatestGroupByFormation(qb)
            .pipe(
                tap((data: OperationSightingDetailsDto[]) =>
                    this.operationRealTimeStateStore.setFormationSightings(data)
                ),
                map(() => undefined)
            );
    }

    fetchOperationCurrentPosition(): Observable<void> {
        const qb = new RequestQueryBuilder();

        return this.operationRealTimeStateQuery.operations$.pipe(
            take(1),
            switchMap((operations) =>
                forkJoin(
                    operations.map((op) =>
                        this.operationService.findOneWithCurrentPosition(
                            op.operationId,
                            qb
                        )
                    )
                )
            ),
            tap((data) => {
                this.operationRealTimeStateStore.setCurrentPositions(data);
            }),
            map(() => undefined)
        );
    }

    fetchTripClassesV2(): Observable<void> {
        const qb = new RequestQueryBuilder()
            .setJoin([{ field: 'service' }])
            .setFilter([
                {
                    field: 'service.serviceName',
                    operator: CondOperator.EQUALS,
                    value: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線',
                },
            ]);

        return this.tripClassService.findMany(qb).pipe(
            tap((data: TripClassDetailsDto[]) => {
                this.operationRealTimeStateStore.setTripClasses(data);
            }),
            map(() => undefined)
        );
    }
}
