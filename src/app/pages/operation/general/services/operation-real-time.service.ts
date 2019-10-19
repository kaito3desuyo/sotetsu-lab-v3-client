import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { BehaviorSubject, Observable, zip, timer, forkJoin } from 'rxjs';
import { map, tap, flatMap } from 'rxjs/operators';
import { find } from 'lodash';
import moment from 'moment';
import { IOperationSightingTable } from '../interfaces/operation-sighting-table';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';
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

@Injectable()
export class OperationRealTimeService extends BaseService {
  currentCalendarId: string;

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

  private operationTrips: BehaviorSubject<IOperation[]> = new BehaviorSubject<
    IOperation[]
  >([]);

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

  constructor(
    private router: Router,
    private socketService: SocketService,
    private serviceApi: ServiceApiService,
    private calendarApi: CalendarApiService,
    private tripApi: TripApiService,
    private formationApi: FormationApiService,
    private operationApi: OperationApiService,
    private stationApi: StationApiService,
    private currentParamsQuery: CurrentParamsQuery,
    private notification: NotificationService
  ) {
    super();
    this.socketService.connect('/operation/real-time');

    this.subscription = this.socketService
      .on('sightingReload')
      .subscribe(data => {
        if (data.eventType === 'receive') {
          this.notification.open('データが更新されました', 'OK');
        }

        forkJoin([this.fetchSightingsLatest()])
          .pipe(
            flatMap(() =>
              forkJoin([
                this.fetchFormationTableData(),
                this.fetchOperationTableData()
              ])
            )
          )
          .subscribe(([formation, operation]) => {
            this.setFormationTableData(formation);
            this.setOperationTableData(operation);
          });
      });

    this.subscription = this.currentParamsQuery.calendar$.subscribe(obj => {
      this.currentCalendarId = obj.id;
    });

    this.subscription = timer(0, 1000 * 60)
      .pipe(
        flatMap(() =>
          forkJoin([
            this.fetchFormationTableData(),
            this.fetchOperationTableData()
          ])
        )
      )
      .subscribe(([formation, operation]) => {
        this.setFormationTableData(formation);
        this.setOperationTableData(operation);
      });
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
            data.group_by_formations.map(data =>
              OperationSightingModel.readOperationSightingDtoImpl(data)
            )
          );
          this.setOperationSightingsLatest(
            data.group_by_operations.map(data =>
              OperationSightingModel.readOperationSightingDtoImpl(data)
            )
          );
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
        service_name: '相鉄本線・いずみ野線・厚木線・新横浜線／JR埼京線・川越線'
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
   * 運用別列車情報を返す
   */
  getOperationTrips(): Observable<IOperation[]> {
    return this.operationTrips.asObservable();
  }

  /**
   * 運用別列車情報をセットする
   * @param array
   */
  setOperationTrips(array: IOperation[]): void {
    this.operationTrips.next(array);
  }

  /**
   * 運用別列車情報を取得する
   */
  fetchOperationTrips(): Observable<void> {
    return this.operationApi
      .getOperationsTrips({
        calendar_id: this.getCalendarsAsStatic()[0].id
      })
      .pipe(
        map(data => {
          return data.operations.map(result =>
            OperationModel.readOperationDtoImpl(result)
          );
        }),
        tap(data => {
          this.setOperationTrips(data);
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
          const tripClasses: ITripClass[] = data.trip_classes.map(result =>
            TripClassModel.readTripClassDtoImpl(result)
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
   * @param array
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
        tripNumber: string;
        prevTime: string;
        nextTime: string;
      };
    }[]
  > {
    return zip(
      this.getOperationTrips(),
      this.getStations(),
      this.getTripClasses()
    ).pipe(
      map(([operations, stations, tripClasses]) => {
        return operations.map(operation => {
          const now = moment();
          let targetTrip: {
            tripNumber: string;
            tripClassName: string;
            tripClassColor: string;
            prevTime: string;
            prevStation: string;
            nextTime: string;
            nextStation: string;
          } = {
            tripNumber: null,
            tripClassName: null,
            tripClassColor: null,
            prevTime: null,
            prevStation: null,
            nextTime: null,
            nextStation: null
          };

          if (operation.tripOperationLists.length === 0) {
            return {
              operationNumber: operation.operationNumber,
              trip: {
                tripNumber: null,
                tripClassName: null,
                tripClassColor: null,
                prevTime: null,
                prevStation: '不明',
                nextTime: null,
                nextStation: '不明'
              }
            };
          }

          // 0番目の列車の発車時刻より前の場合
          if (
            now <
            moment(
              operation.tripOperationLists[0].trip.times[0].departureTime,
              'HH:mm:ss'
            )
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(
                operation.tripOperationLists[0].trip.times[0].departureDays - 1,
                'days'
              )
          ) {
            targetTrip = {
              tripNumber: null,
              tripClassName: null,
              tripClassColor: null,
              prevTime: operation.tripOperationLists[0].trip.depotOut
                ? '〇'
                : null,
              prevStation: operation.tripOperationLists[0].trip.depotOut
                ? '出庫前'
                : null,
              nextTime:
                operation.tripOperationLists[0].trip.times[0].departureTime,
              nextStation: find(
                stations,
                station =>
                  station.id ===
                  operation.tripOperationLists[0].trip.times[0].stationId
              ).stationName
            };
          }

          // n番目の列車の到着時刻 < 現時刻 <= n + 1番目の列車の出発時刻
          const nArrToNowToNPlus1Dep = find(
            operation.tripOperationLists,
            (trip, index, array) => {
              if (!array[index + 1]) {
                return undefined;
              }
              return (
                moment(
                  array[index].trip.times[array[index].trip.times.length - 1]
                    .arrivalTime,
                  'HH:mm:ss'
                )
                  .subtract(now.hour() < 4 ? 1 : 0, 'days')
                  .add(
                    array[index].trip.times[array[index].trip.times.length - 1]
                      .arrivalDays - 1,
                    'days'
                  ) <= now &&
                now <
                  moment(
                    array[index + 1].trip.times[0].departureTime,
                    'HH:mm:ss'
                  )
                    .subtract(now.hour() < 4 ? 1 : 0, 'days')
                    .add(
                      array[index + 1].trip.times[0].departureDays - 1,
                      'days'
                    )
              );
            }
          );

          const nMinus1ToNowToNDep = find(
            operation.tripOperationLists,
            (trip, index, array) => {
              if (!array[index - 1]) {
                return undefined;
              }
              return (
                moment(
                  array[index - 1].trip.times[
                    array[index - 1].trip.times.length - 1
                  ].arrivalTime,
                  'HH:mm:ss'
                )
                  .subtract(now.hour() < 4 ? 1 : 0, 'days')
                  .add(
                    array[index - 1].trip.times[
                      array[index - 1].trip.times.length - 1
                    ].arrivalDays - 1,
                    'days'
                  ) <= now &&
                now <
                  moment(array[index].trip.times[0].departureTime, 'HH:mm:ss')
                    .subtract(now.hour() < 4 ? 1 : 0, 'days')
                    .add(array[index].trip.times[0].departureDays - 1, 'days')
              );
            }
          );

          if (nArrToNowToNPlus1Dep && nMinus1ToNowToNDep) {
            targetTrip = {
              tripNumber: null,
              tripClassName: null,
              tripClassColor: null,
              prevTime:
                nArrToNowToNPlus1Dep.trip.times[
                  nArrToNowToNPlus1Dep.trip.times.length - 1
                ].arrivalTime,
              prevStation: find(
                stations,
                station =>
                  station.id ===
                  nArrToNowToNPlus1Dep.trip.times[
                    nArrToNowToNPlus1Dep.trip.times.length - 1
                  ].stationId
              ).stationName,
              nextTime: nMinus1ToNowToNDep.trip.times[0].departureTime,
              nextStation:
                nArrToNowToNPlus1Dep.trip.depotIn &&
                nMinus1ToNowToNDep.trip.depotOut
                  ? '一時入庫'
                  : '停車中'
            };
          }

          // 現在走行中の列車
          const currentRunning = find(
            operation.tripOperationLists,
            (tripOperationList, index, array) => {
              return (
                moment(
                  tripOperationList.trip.times[0].departureTime,
                  'HH:mm:ss'
                )
                  .subtract(now.hour() < 4 ? 1 : 0, 'days')
                  .add(
                    tripOperationList.trip.times[0].departureDays - 1,
                    'days'
                  ) <= now &&
                now <
                  moment(
                    tripOperationList.trip.times[
                      tripOperationList.trip.times.length - 1
                    ].arrivalTime,
                    'HH:mm:ss'
                  )
                    .subtract(now.hour() < 4 ? 1 : 0, 'days')
                    .add(
                      tripOperationList.trip.times[
                        tripOperationList.trip.times.length - 1
                      ].arrivalDays - 1,
                      'days'
                    )
              );
            }
          );

          if (currentRunning) {
            targetTrip = {
              tripNumber: currentRunning.trip.tripNumber,
              tripClassName: find(
                tripClasses,
                tripClass => tripClass.id === currentRunning.trip.tripClassId
              ).tripClassName,
              tripClassColor: find(
                tripClasses,
                tripClass => tripClass.id === currentRunning.trip.tripClassId
              ).tripClassColor,
              prevTime: currentRunning.trip.times[0].departureTime,
              prevStation: find(
                stations,
                station => station.id === currentRunning.trip.times[0].stationId
              ).stationName,
              nextTime:
                currentRunning.trip.times[currentRunning.trip.times.length - 1]
                  .arrivalTime,
              nextStation: find(
                stations,
                station =>
                  station.id ===
                  currentRunning.trip.times[
                    currentRunning.trip.times.length - 1
                  ].stationId
              ).stationName
            };
          }

          // 最後の列車の到着時刻より現時刻が大きい場合
          if (
            moment(
              operation.tripOperationLists[
                operation.tripOperationLists.length - 1
              ].trip.times[
                operation.tripOperationLists[
                  operation.tripOperationLists.length - 1
                ].trip.times.length - 1
              ].arrivalTime,
              'HH:mm:ss'
            )
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(
                operation.tripOperationLists[
                  operation.tripOperationLists.length - 1
                ].trip.times[
                  operation.tripOperationLists[
                    operation.tripOperationLists.length - 1
                  ].trip.times.length - 1
                ].arrivalDays - 1,
                'days'
              ) <= now
          ) {
            targetTrip = {
              tripNumber: null,
              tripClassName: null,
              tripClassColor: null,
              prevTime:
                operation.tripOperationLists[
                  operation.tripOperationLists.length - 1
                ].trip.times[
                  operation.tripOperationLists[
                    operation.tripOperationLists.length - 1
                  ].trip.times.length - 1
                ].arrivalTime,
              prevStation: find(
                stations,
                station =>
                  station.id ===
                  operation.tripOperationLists[
                    operation.tripOperationLists.length - 1
                  ].trip.times[
                    operation.tripOperationLists[
                      operation.tripOperationLists.length - 1
                    ].trip.times.length - 1
                  ].stationId
              ).stationName,
              nextTime: operation.tripOperationLists[
                operation.tripOperationLists.length - 1
              ].trip.depotIn
                ? '△'
                : null,
              nextStation: operation.tripOperationLists[
                operation.tripOperationLists.length - 1
              ].trip.depotIn
                ? '入庫済'
                : null
            };
          }

          return {
            operationNumber: operation.operationNumber,
            trip: targetTrip
          };
        });
      })
    );
  }

  /**
   * 編成テーブル用データを読み込み
   */
  fetchFormationTableData(): Observable<IOperationSightingTable[]> {
    return zip(
      this.getFormationNumbers(),
      this.generateOperationTripsTableData(),
      this.getFormationSightingsLatest()
    ).pipe(
      map(([numbers, operationTrips, formationSightings]) => {
        return numbers.map(data => {
          const findSightings: IOperationSighting = find(
            formationSightings,
            (val: IOperationSighting) =>
              val.formation.formationNumber === data.formationNumber
          );

          if (!findSightings) {
            return {
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
              findSightings.circulatedOperation.operationNumber ===
                operationTrip.operationNumber
          );

          return {
            postedOperationNumber: findSightings.operation
              ? findSightings.operation.operationNumber
              : null,
            rotatedOperationNumber: findSightings.circulatedOperation
              ? findSightings.circulatedOperation.operationNumber
              : null,
            rotatedOperationId: findSightings.circulatedOperationId,
            formationNumber: findSightings.formation.formationNumber,
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
  fetchOperationTableData(): Observable<IOperationSightingTable[]> {
    return zip(
      this.getOperations(),
      this.getOperationNumbers(),
      this.generateOperationTripsTableData(),
      this.getOperationSightingsLatest()
    ).pipe(
      map(([operations, numbers, operationTrips, operationSightings]) => {
        return numbers.map(data => {
          const findSightings: IOperationSighting = find(
            operationSightings,
            (val: IOperationSighting) =>
              val.circulatedOperation &&
              val.circulatedOperation.operationNumber === data.operationNumber
          );

          if (!findSightings) {
            return {
              postedOperationNumber: null,
              rotatedOperationNumber: data.operationNumber,
              rotatedOperationId: find(
                operations,
                operation => operation.operationNumber === data.operationNumber
              ).id,
              formationNumber: null,
              sightingTime: null,
              updatedAt: null,
              trip: find(
                operationTrips,
                operationTrip =>
                  data.operationNumber === operationTrip.operationNumber
              ).trip
            };
          }

          return {
            postedOperationNumber: findSightings.operation.operationNumber,
            rotatedOperationNumber:
              findSightings.circulatedOperation.operationNumber,
            rotatedOperationId: findSightings.circulatedOperationId,
            formationNumber: findSightings.formation
              ? findSightings.formation.formationNumber
              : null,
            sightingTime: findSightings.sightingTime,
            updatedAt: findSightings.updatedAt,
            trip: find(
              operationTrips,
              operationTrip =>
                findSightings.circulatedOperation &&
                findSightings.circulatedOperation.operationNumber ===
                  operationTrip.operationNumber
            ).trip
          };
        });
      }),
      tap(data => {
        this.setOperationTableData(data);
      })
    );
  }
}
