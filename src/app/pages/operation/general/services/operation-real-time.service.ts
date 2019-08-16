import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { BehaviorSubject, Observable, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  find,
  some,
  groupBy,
  uniqBy,
  sortBy,
  reverse,
  forIn,
  map as lodashMap
} from 'lodash';
import moment from 'moment';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';
import { IOperation } from 'src/app/general/interfaces/operation';
import { OperationApiService } from 'src/app/general/api/operation-api.service';
import { IOperationSightingTable } from '../interfaces/operation-sighting-table';

@Injectable()
export class OperationRealTimeService {
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

  constructor(
    private formationApi: FormationApiService,
    private operationApi: OperationApiService
  ) {}

  getFormationNumbers(): Observable<{ formationNumber: string }[]> {
    return this.formationNumbers.asObservable();
  }

  setFormationNumbers(value: { formationNumber: string }[]): void {
    this.formationNumbers.next(value);
  }

  getFormationSightings(): Observable<IOperationSighting[]> {
    return this.formationSightings.asObservable();
  }

  setFormationSightings(value: IOperationSighting[]): void {
    this.formationSightings.next(value);
  }

  getOperationNumbers(): Observable<{ operationNumber: string }[]> {
    return this.operationNumbers.asObservable();
  }

  setOperationNumbers(value: { operationNumber: string }[]): void {
    this.operationNumbers.next(value);
  }

  getOperationSightings(): Observable<IOperationSighting[]> {
    return this.operationSightings.asObservable();
  }

  setOperationSightings(value: IOperationSighting[]): void {
    this.operationSightings.next(value);
  }

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
        /*
        const test2 = duplicateChecked.map(target => {
          const checker = some(duplicateChecked, data => {
            return (
              target.formationNumber === data.formationNumber &&
              moment(target.sightingTime) < moment(data.sightingTime)
            );
          });
          return {
            ...target,
            formationNumber: checker ? 'unknown' : target.formationNumber
          };
        });

        const test3 = test2.map(formationSighting => {
          return {
            postedOperationNumber: formationSighting.operationNumber,
            rotatedOperationNumber:
              formationSighting.operationNumber !== '100'
                ? this.rotateOperationNumber(
                    formationSighting.operationNumber,
                    this.calcDaySabun(formationSighting.sightingTime)
                  )
                : formationSighting.operationNumber,
            formationNumber: formationSighting.formationNumber,
            sightingTime: formationSighting.sightingTime
          };
        });

        console.log('hoge', operationGrouped, duplicateChecked, test2, test3);

        return formationSightings.map(formationSighting => {
          return {
            postedOperationNumber: formationSighting.operation.operationNumber,
            rotatedOperationNumber:
              formationSighting.operation.operationNumber !== '100'
                ? this.rotateOperationNumber(
                    formationSighting.operation.operationNumber,
                    this.calcDaySabun(formationSighting.sightingTime)
                  )
                : formationSighting.operation.operationNumber,
            formationNumber: formationSighting.formation.formationNumber,
            sightingTime: formationSighting.sightingTime,
            updatedAt: formationSighting.updatedAt
          };
        });
      })
      /*,
      map(rotatedData => {
        return rotatedData.map((rotated, index, array) => {
          return {
            ...rotated,
            rotatedOperationNumber: this.isExistNewerSighting(rotated, array)
              ? 'unknown'
              : rotated.rotatedOperationNumber
          };
        });
      })
      */
      })
    );
  }

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
            const checker = some(sightings.formation, data => {
              return (
                target.formationNumber === data.formationNumber &&
                moment(target.sightingTime) < moment(data.sightingTime)
              );
            });
            const checker2 = some(sightings.operation, data => {
              return (
                target.formationNumber === data.formationNumber &&
                moment(target.sightingTime) < moment(data.sightingTime)
              );
            });
            return {
              ...target,
              formationNumber:
                checker || checker2 ? 'unknown' : target.formationNumber
            };
          });

          const rotatedSightings = newestSightings.map(formationSighting => {
            return {
              postedOperationNumber: formationSighting.operationNumber,
              rotatedOperationNumber:
                formationSighting.operationNumber !== '100' &&
                formationSighting.operationNumber !== 'unknown'
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
      )
    );
  }

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
            const checker = some(sightings.formation, data => {
              return (
                target.operationNumber === data.operationNumber &&
                moment(target.sightingTime) < moment(data.sightingTime)
              );
            });
            const checker2 = some(sightings.operation, data => {
              return (
                target.operationNumber === data.operationNumber &&
                moment(target.sightingTime) < moment(data.sightingTime)
              );
            });
            return {
              ...target,
              operationNumber:
                checker || checker2 ? 'unknown' : target.operationNumber
            };
          });

          const rotatedSightings = newestSightings.map(formationSighting => {
            return {
              postedOperationNumber: formationSighting.operationNumber,
              rotatedOperationNumber:
                formationSighting.operationNumber !== '100' &&
                formationSighting.operationNumber !== 'unknown'
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
            rotatedOperationNumber: this.isExistNewerSighting(target, array)
              ? 'unknown'
              : target.rotatedOperationNumber
          };
        });
      })
    );
  }

  calcDaySabun(timestamp: string) {
    return moment(moment().subtract(moment().hour() < 4 ? 1 : 0)).diff(
      timestamp,
      'days'
    );
  }

  rotateOperationNumber(operationNumber: string, days: number) {
    const posted = Number(operationNumber);
    let added = posted;
    console.log(operationNumber, days);
    for (let i = 1; i <= days; i++) {
      added = added + 1;
      if (String(added).slice(-1) === '0') {
        added = added - 9;
      }
    }
    return String(added);
  }

  isExistNewerSighting(target: any, allData: any[]) {
    return some(allData, data => {
      return (
        target.rotatedOperationNumber === data.rotatedOperationNumber &&
        moment(target.sightingTime) < moment(data.sightingTime)
      );
    });
  }

  getFormationTableData(): Observable<IOperationSightingTable[]> {
    return zip(
      this.getFormationNumbers(),
      this.generateFormationTableData()
    ).pipe(
      map(([numbers, sightings]) => {
        return numbers.map(data => {
          const findSightings: IOperationSightingTable = find(
            sightings,
            (val: IOperationSightingTable) =>
              val.formationNumber === data.formationNumber
          );
          console.log(findSightings);

          if (!findSightings) {
            return {
              postedOperationNumber: null,
              rotatedOperationNumber: null,
              formationNumber: data.formationNumber,
              sightingTime: null,
              updatedAt: null
            };
          }

          return {
            postedOperationNumber: findSightings.postedOperationNumber,
            rotatedOperationNumber: findSightings.rotatedOperationNumber,
            formationNumber: findSightings.formationNumber,
            sightingTime: findSightings.sightingTime,
            updatedAt: findSightings.updatedAt
          };
        });
      })
    );
  }

  getOperationTableData(): Observable<IOperationSightingTable[]> {
    return zip(
      this.getOperationNumbers(),
      this.generateOperationTableData()
    ).pipe(
      map(([numbers, sightings]) => {
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
              updatedAt: null
            };
          }

          return {
            postedOperationNumber: findSightings.postedOperationNumber,
            rotatedOperationNumber: findSightings.rotatedOperationNumber,
            formationNumber: findSightings.formationNumber,
            sightingTime: findSightings.sightingTime,
            updatedAt: findSightings.updatedAt
          };
        });
      })
    );
  }

  async getCurrentFormationByVehicleNumber(
    agencyId: string,
    vehicleNumber: string,
    date: string
  ): Promise<IFormation[]> {
    const result = await this.formationApi
      .searchFormationsByVehicleNumber({
        agencyId,
        number: vehicleNumber,
        date
      })
      .toPromise();

    return result;
  }

  async getOperationByCalenderIdAndOperationNumber(
    calenderId: string,
    operationNumber: string
  ): Promise<IOperation[]> {
    const result = await this.operationApi
      .searchOperations({
        calender_id: calenderId,
        operation_number: operationNumber
      })
      .toPromise();

    return result;
  }

  async addOperationSighting(
    formationId: string,
    operationId: string,
    sightingTime: string
  ) {
    const result = await this.operationApi
      .addOperationSighting({
        formation_id: formationId,
        operation_id: operationId,
        sighting_time: sightingTime
      })
      .toPromise();

    return result;
  }
}
