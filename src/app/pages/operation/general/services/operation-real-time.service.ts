import { Injectable } from '@angular/core';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { BehaviorSubject, Observable, zip } from 'rxjs';
import { map } from 'rxjs/operators';
import _, { find, some, groupBy } from 'lodash';
import moment from 'moment';
import { IFormation } from 'src/app/general/interfaces/formation';
import { FormationApiService } from 'src/app/general/api/formation-api.service';

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

  constructor(private formationApi: FormationApiService) {}

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

  getFormationTableData(): Observable<any[]> {
    return zip(this.getFormationNumbers(), this.getFormationSightings()).pipe(
      map(([numbers, sightings]) => {
        const groupingSightings = groupBy(
          sightings,
          (o: IOperationSighting) => {
            return o.formation.formationNumber;
          }
        );

        return numbers.map(data => {
          const findSightings: IOperationSighting[] = find(
            groupingSightings,
            (val, key) => key === data.formationNumber
          );

          if (!findSightings) {
            return {
              operationNumber: null,
              formationNumber: data.formationNumber,
              sightingTime: null,
              updatedAt: null,
              sightings: null
            };
          }

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
            operationNumber: findSightings[0].operation.operationNumber,
            formationNumber: data.formationNumber,
            sightingTime: findSightings[0].sightingTime,
            updatedAt: findSightings[0].updatedAt,
            sightings: findSightings || null
          };
        });
      })
    );
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
    return zip(this.getOperationNumbers(), this.getOperationSightings()).pipe(
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
}
