import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ReadStationDto } from '../models/station/station-dto';
import { IStation } from '../interfaces/station';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { StationModel } from '../models/station/station-model';

@Injectable({
  providedIn: 'root'
})
export class StationApiService {
  private apiUrl = environment.apiUrl + '/v1/stations';

  constructor(private http: HttpClient) {}

  getStations(): Observable<IStation[]> {
    return this.http.get(this.apiUrl).pipe(
      map((data: ReadStationDto[]) => {
        return data.map(result => StationModel.readStationDtoImpl(result));
      })
    );
  }
}
