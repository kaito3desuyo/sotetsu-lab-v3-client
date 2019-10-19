import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IOperationSighting } from '../interfaces/operation-sighting';
import { map } from 'rxjs/operators';
import { ReadOperationSightingDto } from '../models/operation-sighting/operation-sighting-dto';
import { OperationSightingModel } from '../models/operation-sighting/operation-sighting-model';
import { IOperation } from '../interfaces/operation';
import { ReadOperationDto } from '../models/operation/operation-dto';
import { OperationModel } from '../models/operation/operation-model';

@Injectable({
  providedIn: 'root'
})
export class OperationApiService {
  private apiUrl = environment.apiUrl + '/v1/operations';
  private apiUrl2 = environment.apiUrl + '/v1/operation-sightings';
  constructor(private http: HttpClient) {}

  getOperationById(
    operationId: string
  ): Observable<{ operation: ReadOperationDto }> {
    return this.http
      .get(this.apiUrl + '/' + operationId)
      .pipe(map((data: { operation: ReadOperationDto }) => data));
  }

  searchOperations(query: {
    calendar_id?: string;
    operation_number?: string;
  }): Observable<{ operations: ReadOperationDto[] }> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(map((data: { operations: ReadOperationDto[] }) => data));
  }

  searchOperationNumbers(query: {
    calendar_id?: string;
  }): Observable<{ operationNumber: string }[]> {
    return this.http
      .get(this.apiUrl + '/search/numbers', {
        params: query
      })
      .pipe(
        map((data: { operation_number: string }[]) => {
          return data.map(result => {
            return {
              operationNumber: result.operation_number
            };
          });
        })
      );
  }

  getOperationsAllNumbers(): Observable<{ operationNumber: string }[]> {
    return this.http.get(this.apiUrl + '/all/numbers').pipe(
      map(data => {
        return (data as { operation_number: string }[]).map(result => {
          return {
            operationNumber: result.operation_number
          };
        });
      })
    );
  }

  getOperationsTrips(params: {
    calendar_id: string;
  }): Observable<{ operations: ReadOperationDto[] }> {
    return this.http
      .get(this.apiUrl + '/trips', {
        params: params
      })
      .pipe(map((data: { operations: ReadOperationDto[] }) => data));
  }

  getOperationsSearchNumbers(params: {
    calendar_id: string;
  }): Observable<{ operationNumber: string }[]> {
    return this.http
      .get(this.apiUrl + '/search/numbers', {
        params: params
      })
      .pipe(
        map((data: { operation_number: string }[]) => {
          return data.map(result => {
            return {
              operationNumber: result.operation_number
            };
          });
        })
      );
  }

  getOperationsAllLatestSightings(): Observable<IOperationSighting[]> {
    return this.http.get(this.apiUrl + '/all/latest-sightings').pipe(
      map(data => {
        return (data as ReadOperationSightingDto[]).map(result => {
          return OperationSightingModel.readOperationSightingDtoImpl(result);
        });
      })
    );
  }

  addOperationSighting(body: {
    formationId: string;
    operationId: string;
    sightingTime: string;
  }): Observable<any> {
    const data = OperationSightingModel.createOperationSightingDtoImpl(body);
    return this.http.post(this.apiUrl + '/sightings', data);
  }

  getOperationSightingsLatest(params: {
    calendar_id: string;
  }): Observable<{
    group_by_formations: ReadOperationSightingDto[];
    group_by_operations: ReadOperationSightingDto[];
  }> {
    return this.http
      .get(this.apiUrl2 + '/latest', {
        params
      })
      .pipe(
        map(
          (data: {
            group_by_formations: ReadOperationSightingDto[];
            group_by_operations: ReadOperationSightingDto[];
          }) => data
        )
      );
  }
}
