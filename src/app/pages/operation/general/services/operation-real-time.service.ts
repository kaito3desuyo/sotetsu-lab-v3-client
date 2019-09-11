import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { BehaviorSubject, Observable, zip, interval, timer, of } from 'rxjs';
import { map, tap, flatMap } from 'rxjs/operators';
import {
  find,
  some,
  groupBy,
  uniqBy,
  sortBy,
  reverse,
  map as lodashMap
} from 'lodash';
import moment from 'moment';
import { IOperationSightingTable } from '../interfaces/operation-sighting-table';
import { ITrip } from 'src/app/general/interfaces/trip';
import { TripApiService } from 'src/app/general/api/trip-api.service';
import { CurrentParamsQuery } from 'src/app/general/models/current-params/current-params.query';
import { BaseService } from 'src/app/general/classes/base-service';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { CalenderApiService } from 'src/app/general/api/calender-api.service';
import { IStation } from 'src/app/general/interfaces/station';
import { StationApiService } from 'src/app/general/api/station-api.service';

@Injectable()
export class OperationRealTimeService extends BaseService {
  currentCalenderId: string;

  private formationNumbers: BehaviorSubject<
    { formationNumber: string }[]
  > = new BehaviorSubject<{ formationNumber: string }[]>([]);

  private formationSightings: BehaviorSubject<
    IOperationSighting[]
  > = new BehaviorSubject<IOperationSighting[]>([]);

  private operationNumbers: BehaviorSubject<
    { operationNumber: string }[]
  > = new BehaviorSubject<{ operationNumber: string }[]>([]);

  private operationSightings: BehaviorSubject<
    IOperationSighting[]
  > = new BehaviorSubject<IOperationSighting[]>([]);

  private trips: BehaviorSubject<ITrip[]> = new BehaviorSubject<ITrip[]>([]);

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

  constructor(
    private tripApi: TripApiService,
    private calenderApi: CalenderApiService,
    private formationApi: FormationApiService,
    private operationApi: OperationApiService,
    private stationApi: StationApiService,
    private currentParamsQuery: CurrentParamsQuery
  ) {
    super();
    this.subscription = this.currentParamsQuery.calender$.subscribe(obj => {
      this.currentCalenderId = obj.id;
    });

    this.subscription = timer(0, 1000 * 60)
      .pipe(
        flatMap(() => zip(this.formationNumbers, this.formationSightings)),
        flatMap(() => this.fetchFormationTableData())
      )
      .subscribe(data => {
        this.setFormationTableData(data);
      });

    this.subscription = timer(0, 1000 * 60)
      .pipe(
        flatMap(() => zip(this.operationNumbers, this.operationSightings)),
        flatMap(() => this.fetchOperationTableData())
      )
      .subscribe(data => {
        this.setOperationTableData(data);
      });
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

  getFormationSightings(): Observable<IOperationSighting[]> {
    return this.formationSightings.asObservable();
  }

  setFormationSightings(value: IOperationSighting[]): void {
    this.formationSightings.next(value);
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
        calender_id: this.currentCalenderId
      })
      .pipe(
        tap(numbers => {
          this.setOperationNumbers(numbers);
        }),
        map(() => null)
      );
  }

  getOperationSightings(): Observable<IOperationSighting[]> {
    return this.operationSightings.asObservable();
  }

  setOperationSightings(value: IOperationSighting[]): void {
    this.operationSightings.next(value);
  }

  getTrips(): Observable<ITrip[]> {
    return this.trips.asObservable();
  }

  setTrips(array: ITrip[]): void {
    this.trips.next(array);
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
    const today = moment()
      .subtract(moment().hour() < 4 ? 1 : 0)
      .format('YYYY-MM-DD');
    return this.calenderApi.searchSpecifiedDateCalenderId({ date: today }).pipe(
      flatMap(data => {
        return this.operationApi.getOperationsAllTrips({
          calender_id: data.calender_id
        });
      }),
      tap(data => {
        this.setOperationTrips(data);
      }),
      map(() => null)
    );
  }

  fetchTrips(): Observable<void> {
    return this.tripApi
      .searchTrips({
        calender_id: this.currentCalenderId
      })
      .pipe(
        tap(trips => {
          this.setTrips(trips);
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
      tap(stations => {
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

  /**
   * 目撃情報から中間データを作成
   */
  generateIntermidiateData(): Observable<{
    operation: {
      id: string;
      formationNumber: string;
      operationNumber: string;
      sightingTime: string;
      updatedAt: string;
    }[];
    formation: {
      id: string;
      formationNumber: string;
      operationNumber: string;
      sightingTime: string;
      updatedAt: string;
    }[];
  }> {
    return zip(this.getFormationSightings(), this.getOperationSightings()).pipe(
      map(([formationSightings, operationSightings]) => {
        const formationArray = formationSightings.map(data => ({
          id: data.id,
          formationNumber: data.formation.formationNumber,
          operationNumber: data.operation.operationNumber,
          sightingTime: data.sightingTime,
          updatedAt: data.updatedAt
        }));
        const operationArray = operationSightings.map(data => ({
          id: data.id,
          formationNumber: data.formation.formationNumber,
          operationNumber: data.operation.operationNumber,
          sightingTime: data.sightingTime,
          updatedAt: data.updatedAt
        }));

        const merged = [].concat(formationArray, operationArray);
        const uniq = uniqBy(merged, data => data.id);
        const sorted = sortBy(uniq, data => data.sightingTime);
        const reversed = reverse(sorted);

        const operationGrouped = groupBy(
          reversed,
          data => data.operationNumber
        );
        const formationGrouped = groupBy(
          reversed,
          data => data.formationNumber
        );

        const operationDuplicateChecked = lodashMap(
          operationGrouped,
          (value, key) => {
            return value[0];
          }
        );
        const formationDuplicateChecked = lodashMap(
          formationGrouped,
          (value, key) => {
            return value[0];
          }
        );

        return {
          operation: operationDuplicateChecked,
          formation: formationDuplicateChecked
        };
      })
    );
  }

  /**
   * 中間データから運用テーブル用のデータを作成
   */
  generateOperationTableData(): Observable<any> {
    return this.generateIntermidiateData().pipe(
      map(
        (sightings: {
          formation: {
            id: string;
            formationNumber: string;
            operationNumber: string;
            sightingTime: string;
            updatedAt: string;
          }[];
          operation: {
            id: string;
            formationNumber: string;
            operationNumber: string;
            sightingTime: string;
            updatedAt: string;
          }[];
        }) => {
          const newestSightings = sightings.operation.map(target => {
            const checker = this.isExistNewerSighting(
              target,
              sightings.formation,
              'formationNumber'
            );
            const checker2 = this.isExistNewerSighting(
              target,
              sightings.operation,
              'formationNumber'
            );

            return {
              ...target,
              formationNumber:
                checker || checker2 ? null : target.formationNumber
            };
          });

          return newestSightings;
        }
      ),
      map(
        (
          sightings: {
            id: string;
            formationNumber: string;
            operationNumber: string;
            sightingTime: string;
            updatedAt: string;
          }[]
        ) => {
          const rotatedSightings = sightings.map(formationSighting => {
            return {
              postedOperationNumber: formationSighting.operationNumber,
              rotatedOperationNumber:
                formationSighting.operationNumber !== '100' &&
                formationSighting.operationNumber !== null
                  ? this.rotateOperationNumber(
                      formationSighting.operationNumber,
                      this.calcDaySabun(formationSighting.sightingTime)
                    )
                  : formationSighting.operationNumber,
              formationNumber: formationSighting.formationNumber,
              sightingTime: formationSighting.sightingTime,
              updatedAt: formationSighting.updatedAt
            };
          });
          return rotatedSightings;
        }
      ),
      map(data => {
        return data.map((target, index, array) => {
          return {
            ...target,
            rotatedOperationNumber: this.isExistNewerSighting(
              target,
              array,
              'rotatedOperationNumber'
            )
              ? null
              : target.rotatedOperationNumber
          };
        });
      })
    );
  }

  /**
   * 中間テーブルから編成テーブル用のデータを作成
   */
  generateFormationTableData(): Observable<IOperationSightingTable[]> {
    return this.generateIntermidiateData().pipe(
      map(
        (sightings: {
          formation: {
            id: string;
            formationNumber: string;
            operationNumber: string;
            sightingTime: string;
            updatedAt: string;
          }[];
          operation: {
            id: string;
            formationNumber: string;
            operationNumber: string;
            sightingTime: string;
            updatedAt: string;
          }[];
        }) => {
          const newestSightings = sightings.formation.map(target => {
            const checker = this.isExistNewerSighting(
              target,
              sightings.formation,
              'operationNumber'
            );
            const checker2 = this.isExistNewerSighting(
              target,
              sightings.operation,
              'operationNumber'
            );
            return {
              ...target,
              operationNumber:
                checker || checker2 ? null : target.operationNumber
            };
          });

          return newestSightings;
        }
      ),
      map(
        (
          sightings: {
            id: string;
            formationNumber: string;
            operationNumber: string;
            sightingTime: string;
            updatedAt: string;
          }[]
        ) => {
          const rotatedSightings = sightings.map(formationSighting => {
            return {
              postedOperationNumber: formationSighting.operationNumber,
              rotatedOperationNumber:
                formationSighting.operationNumber !== '100' &&
                formationSighting.operationNumber !== null
                  ? this.rotateOperationNumber(
                      formationSighting.operationNumber,
                      this.calcDaySabun(formationSighting.sightingTime)
                    )
                  : formationSighting.operationNumber,
              formationNumber: formationSighting.formationNumber,
              sightingTime: formationSighting.sightingTime,
              updatedAt: formationSighting.updatedAt
            };
          });

          return rotatedSightings;
        }
      ),
      map((sightings: IOperationSightingTable[]) => {
        return sightings.map((target, index, array) => {
          return {
            ...target,
            rotatedOperationNumber: this.isExistNewerSighting(
              target,
              array,
              'rotatedOperationNumber'
            )
              ? null
              : target.rotatedOperationNumber
          };
        });
      })
    );
  }

  calcDaySabun(timestamp: string) {
    return (
      moment()
        .subtract(moment().hour() < 4 ? 1 : 0)
        .day() -
      moment(timestamp)
        .subtract(moment(timestamp).hour() < 4 ? 1 : 0, 'days')
        .day()
    );
  }

  rotateOperationNumber(operationNumber: string, days: number) {
    const posted = Number(operationNumber);
    let added = posted;
    for (let i = 1; i <= days; i++) {
      added = added + 1;
      if (String(added).slice(-1) === '0') {
        added = added - 9;
      }
    }
    return String(added);
  }

  isExistNewerSighting(target: any, allData: any[], propName: string) {
    return some(allData, (data: IOperationSightingTable) => {
      return (
        target[propName] === data[propName] &&
        moment(target.sightingTime) < moment(data.sightingTime)
      );
    });
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
    return zip(this.getOperationTrips(), this.getStations()).pipe(
      map(([operations, stations]) => {
        return operations.map(operation => {
          const now = moment();
          let targetTrip: {
            tripNumber: string;
            prevTime: string;
            prevStation: string;
            nextTime: string;
            nextStation: string;
          } = {
            tripNumber: null,
            prevTime: null,
            prevStation: null,
            nextTime: null,
            nextStation: null
          };

          // 0番目の列車の発車時刻より前の場合
          if (
            now <
            moment(operation.trips[0].times[0].departureTime, 'HH:mm:ss')
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(operation.trips[0].times[0].departureDays - 1, 'days')
          ) {
            targetTrip = {
              tripNumber: null,
              prevTime: operation.trips[0].depotOut ? '〇' : null,
              prevStation: operation.trips[0].depotOut ? '出庫前' : null,
              nextTime: operation.trips[0].times[0].departureTime,
              nextStation: find(
                stations,
                station => station.id === operation.trips[0].times[0].stationId
              ).stationName
            };
          }

          // n番目の列車の到着時刻 < 現時刻 <= n + 1番目の列車の出発時刻
          const nArrToNowToNPlus1Dep = find(
            operation.trips,
            (trip, index, array) => {
              if (!array[index + 1]) {
                return undefined;
              }
              return (
                moment(
                  array[index].times[array[index].times.length - 1].arrivalTime,
                  'HH:mm:ss'
                )
                  .subtract(now.hour() < 4 ? 1 : 0, 'days')
                  .add(
                    array[index].times[array[index].times.length - 1]
                      .arrivalDays - 1,
                    'days'
                  ) <= now &&
                now <
                  moment(array[index + 1].times[0].departureTime, 'HH:mm:ss')
                    .subtract(now.hour() < 4 ? 1 : 0, 'days')
                    .add(array[index + 1].times[0].departureDays - 1, 'days')
              );
            }
          );

          const nMinus1ToNowToNDep = find(
            operation.trips,
            (trip, index, array) => {
              if (!array[index - 1]) {
                return undefined;
              }
              return (
                moment(
                  array[index - 1].times[array[index - 1].times.length - 1]
                    .arrivalTime,
                  'HH:mm:ss'
                )
                  .subtract(now.hour() < 4 ? 1 : 0, 'days')
                  .add(
                    array[index - 1].times[array[index - 1].times.length - 1]
                      .arrivalDays - 1,
                    'days'
                  ) <= now &&
                now <
                  moment(array[index].times[0].departureTime, 'HH:mm:ss')
                    .subtract(now.hour() < 4 ? 1 : 0, 'days')
                    .add(array[index].times[0].departureDays - 1, 'days')
              );
            }
          );

          if (nArrToNowToNPlus1Dep && nMinus1ToNowToNDep) {
            targetTrip = {
              tripNumber: null,
              prevTime:
                nArrToNowToNPlus1Dep.times[
                  nArrToNowToNPlus1Dep.times.length - 1
                ].arrivalTime,
              prevStation: find(
                stations,
                station =>
                  station.id ===
                  nArrToNowToNPlus1Dep.times[
                    nArrToNowToNPlus1Dep.times.length - 1
                  ].stationId
              ).stationName,
              nextTime: nMinus1ToNowToNDep.times[0].departureTime,
              nextStation:
                nArrToNowToNPlus1Dep.depotIn && nMinus1ToNowToNDep.depotOut
                  ? '一時入庫'
                  : '停車中'
            };
          }

          // 現在走行中の列車
          const currentRunning = find(operation.trips, (trip, index, array) => {
            return (
              moment(trip.times[0].departureTime, 'HH:mm:ss')
                .subtract(now.hour() < 4 ? 1 : 0, 'days')
                .add(trip.times[0].departureDays - 1, 'days') <= now &&
              now <
                moment(
                  trip.times[trip.times.length - 1].arrivalTime,
                  'HH:mm:ss'
                )
                  .subtract(now.hour() < 4 ? 1 : 0, 'days')
                  .add(
                    trip.times[trip.times.length - 1].arrivalDays - 1,
                    'days'
                  )
            );
          });

          if (currentRunning) {
            targetTrip = {
              tripNumber: currentRunning.tripNumber,
              prevTime: currentRunning.times[0].departureTime,
              prevStation: find(
                stations,
                station => station.id === currentRunning.times[0].stationId
              ).stationName,
              nextTime:
                currentRunning.times[currentRunning.times.length - 1]
                  .arrivalTime,
              nextStation: find(
                stations,
                station =>
                  station.id ===
                  currentRunning.times[currentRunning.times.length - 1]
                    .stationId
              ).stationName
            };
          }

          // 最後の列車の到着時刻より現時刻が大きい場合
          if (
            moment(
              operation.trips[operation.trips.length - 1].times[
                operation.trips[operation.trips.length - 1].times.length - 1
              ].arrivalTime,
              'HH:mm:ss'
            )
              .subtract(now.hour() < 4 ? 1 : 0, 'days')
              .add(
                operation.trips[operation.trips.length - 1].times[
                  operation.trips[operation.trips.length - 1].times.length - 1
                ].arrivalDays - 1,
                'days'
              ) <= now
          ) {
            targetTrip = {
              tripNumber: null,
              prevTime:
                operation.trips[operation.trips.length - 1].times[
                  operation.trips[operation.trips.length - 1].times.length - 1
                ].arrivalTime,
              prevStation: find(
                stations,
                station =>
                  station.id ===
                  operation.trips[operation.trips.length - 1].times[
                    operation.trips[operation.trips.length - 1].times.length - 1
                  ].stationId
              ).stationName,
              nextTime: operation.trips[operation.trips.length - 1].depotIn
                ? '△'
                : null,
              nextStation: operation.trips[operation.trips.length - 1].depotIn
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
      this.generateFormationTableData(),
      this.generateOperationTripsTableData()
    ).pipe(
      map(([numbers, sightings, operationTrips]) => {
        return numbers.map(data => {
          const findSightings: IOperationSightingTable = find(
            sightings,
            (val: IOperationSightingTable) =>
              val.formationNumber === data.formationNumber
          );

          if (!findSightings) {
            return {
              postedOperationNumber: null,
              rotatedOperationNumber: null,
              formationNumber: data.formationNumber,
              sightingTime: null,
              updatedAt: null,
              trip: null
            };
          }

          const targetTrip = find(
            operationTrips,
            operationTrip =>
              findSightings.rotatedOperationNumber ===
              operationTrip.operationNumber
          );

          return {
            postedOperationNumber: findSightings.postedOperationNumber,
            rotatedOperationNumber: findSightings.rotatedOperationNumber,
            formationNumber: findSightings.formationNumber,
            sightingTime: findSightings.sightingTime,
            updatedAt: findSightings.updatedAt,
            trip: targetTrip ? targetTrip.trip : null
          };
        });
      })
    );
  }

  /**
   * 運用テーブル用データを読み込み
   */
  fetchOperationTableData(): Observable<IOperationSightingTable[]> {
    return zip(
      this.getOperationNumbers(),
      this.generateOperationTableData(),
      this.generateOperationTripsTableData()
    ).pipe(
      map(([numbers, sightings, operationTrips]) => {
        return numbers.map(data => {
          const findSightings: IOperationSightingTable = find(
            sightings,
            (val: IOperationSightingTable) =>
              val.rotatedOperationNumber === data.operationNumber
          );

          if (!findSightings) {
            return {
              postedOperationNumber: null,
              rotatedOperationNumber: data.operationNumber,
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
            postedOperationNumber: findSightings.postedOperationNumber,
            rotatedOperationNumber: findSightings.rotatedOperationNumber,
            formationNumber: findSightings.formationNumber,
            sightingTime: findSightings.sightingTime,
            updatedAt: findSightings.updatedAt,
            trip: find(
              operationTrips,
              operationTrip =>
                findSightings.rotatedOperationNumber ===
                operationTrip.operationNumber
            ).trip
          };
        });
      })
    );
  }
}
