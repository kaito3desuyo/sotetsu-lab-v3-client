import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { IOperationSighting } from '../interfaces/operation-sighting';
import { ReadOperationSightingDto } from '../models/operation-sighting/operation-sighting-dto';
import { OperationSightingModel } from '../models/operation-sighting/operation-sighting-model';
import { ReadFormationDto } from '../models/formation/formation-dto';

@Injectable({
  providedIn: 'root'
})
export class FormationApiService {
  private apiUrl = environment.apiUrl + '/v1/formations';

  constructor(private http: HttpClient) {}

  searchFormations(query: {
    agency_id?: string;
    formation_number?: string;
    vehicle_number?: string;
    date?: string;
  }): Observable<{ formations: ReadFormationDto[] }> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(map((data: { formations: ReadFormationDto[] }) => data));
  }

  searchFormationNumbers(query: {
    date?: string;
  }): Observable<{ formationNumber: string }[]> {
    return this.http
      .get(this.apiUrl + '/search/numbers', {
        params: query
      })
      .pipe(
        map((data: { formation_number: string }[]) => {
          return data.map(result => {
            return {
              formationNumber: result.formation_number
            };
          });
        })
      );
  }

  searchFormationsByVehicleNumber(query: {
    number: string;
    agency_id: string;
    date?: string;
  }): Observable<{ formations: ReadFormationDto[] }> {
    return this.http
      .get(this.apiUrl + '/search/by/vehicle', {
        params: query
      })
      .pipe(map((data: { formations: ReadFormationDto[] }) => data));
  }

  getFormationsAllNumbers(
    date: string
  ): Observable<{ formationNumber: string }[]> {
    return this.http
      .get(this.apiUrl + '/all/numbers', {
        params: {
          date
        }
      })
      .pipe(
        map((data: { formation_number: string }[]) => {
          return data.map(result => {
            return {
              formationNumber: result.formation_number
            };
          });
        })
      );
  }

  getFormationsAllLatestSightings(): Observable<IOperationSighting[]> {
    return this.http.get(this.apiUrl + '/all/latest-sightings').pipe(
      map((data: ReadOperationSightingDto[]) => {
        return data.map(result => {
          return OperationSightingModel.readOperationSightingDtoImpl(result);
        });
      })
    );
  }
}
