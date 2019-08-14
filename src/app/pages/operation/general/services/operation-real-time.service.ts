import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import {
  BehaviorSubject,
  Observable,
  of,
  combineLatest,
  forkJoin,
  zip
} from 'rxjs';
import { combineAll, concatAll, mergeAll, map } from 'rxjs/operators';
import _, { find, groupBy, some, values } from 'lodash';
import moment from 'moment';

@Injectable()
export class OperationRealTimeService {
  private operationNumbers: BehaviorSubject<
    { operationNumber: string }[]
  > = new BehaviorSubject<{ operationNumber: string }[]>([]);

  private sightings: BehaviorSubject<
    IOperationSighting[]
  > = new BehaviorSubject<IOperationSighting[]>([]);

  constructor() {}

  getOperationNumbers(): Observable<{ operationNumber: string }[]> {
    return this.operationNumbers.asObservable();
  }

  setOperationNumbers(value: { operationNumber: string }[]): void {
    this.operationNumbers.next(value);
  }

  getSightings(): Observable<IOperationSighting[]> {
    return this.sightings.asObservable();
  }

  setSightings(value: IOperationSighting[]): void {
    this.sightings.next(value);
  }

  getOperationTableData(): Observable<
    {
      operationNumber: string;
      formationNumber: string;
      sightingTime: string;
      updatedAt: string;
      sightings: IOperationSighting[] | null;
    }[]
  > {
    return zip(this.getOperationNumbers(), this.getSightings()).pipe(
      map(([numbers, sightings]) => {
        const groupingSightings = groupBy(
          sightings,
          (o: IOperationSighting) => {
            return o.operation.operationNumber;
          }
        );
        console.log('グループ化された', sightings);
        return numbers.map(data => {
          const findSightings: IOperationSighting[] = find(
            groupingSightings,
            (val, key) => key === data.operationNumber
          );

          if (!findSightings) {
            return {
              operationNumber: data.operationNumber,
              formationNumber: null,
              sightingTime: null,
              updatedAt: null,
              sightings: null
            };
          }

          console.log('aaaa', sightings);
          const isExistNewerSighting = _(sightings)
            .reject((obj: IOperationSighting) => obj.id === findSightings[0].id)
            .some((obj: IOperationSighting) => {
              console.log(
                moment(obj.sightingTime),
                moment(findSightings[0].sightingTime)
              );
              return (
                obj.formationId === findSightings[0].formationId &&
                moment(obj.sightingTime) > moment(findSightings[0].sightingTime)
              );
            });

          return {
            operationNumber: data.operationNumber,
            formationNumber: !isExistNewerSighting
              ? findSightings[0].formation.formationNumber
              : 'unknown',
            sightingTime: findSightings[0].sightingTime,
            updatedAt: findSightings[0].updatedAt,
            sightings: findSightings || null
          };
        });
      })
    );
  }
}
