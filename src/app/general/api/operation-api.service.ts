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
  constructor(private http: HttpClient) {}

  searchOperations(query: {
    calender_id?: string;
    operation_number?: string;
  }): Observable<IOperation[]> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(
        map((data: ReadOperationDto[]) => {
          return data.map(result =>
            OperationModel.readOperationDtoImpl(result)
          );
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
    formation_id: string;
    operation_id: string;
    sighting_time: string;
  }): Observable<any> {
    return this.http.post(this.apiUrl + '/sightings', body);
  }
}
