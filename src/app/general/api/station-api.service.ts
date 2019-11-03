import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReadStationDto } from '../models/station/station-dto';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StationApiService {
  private apiUrl = environment.apiUrl + '/v1/stations';

  constructor(private http: HttpClient) {}

  getStations(): Observable<{ stations: ReadStationDto[] }> {
    return this.http
      .get(this.apiUrl)
      .pipe(map((data: { stations: ReadStationDto[] }) => data));
  }

  getStationById(id: string): Observable<{ station: ReadStationDto }> {
    return this.http
      .get(this.apiUrl + '/' + id)
      .pipe(map((data: { station: ReadStationDto }) => data));
  }
}
