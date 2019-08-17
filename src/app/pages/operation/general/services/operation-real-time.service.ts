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
  map as lodashMap
} from 'lodash';
import moment from 'moment';
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

  constructor() {}

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
}
