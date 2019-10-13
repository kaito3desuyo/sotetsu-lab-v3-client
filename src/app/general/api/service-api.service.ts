import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ReadServiceDto } from '../models/service/service-dto';
import { map } from 'rxjs/operators';
import { ReadStationDto } from '../models/station/station-dto';

@Injectable({
  providedIn: 'root'
})
export class ServiceApiService {
  private apiUrl = environment.apiUrl + '/v1/services';

  constructor(private http: HttpClient) {}

  searchServices(query: {
    service_name?: string;
  }): Observable<{ services: ReadServiceDto[] }> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(map((data: { services: ReadServiceDto[] }) => data));
  }

  getServiceStationsById(
    serviceId: string,
    query: {
      trip_direction: '0' | '1';
    }
  ): Observable<{ stations: ReadStationDto[] }> {
    return this.http
      .get(this.apiUrl + '/' + serviceId + '/stations', {
        params: query
      })
      .pipe(map((data: { stations: ReadStationDto[] }) => data));
  }
}
