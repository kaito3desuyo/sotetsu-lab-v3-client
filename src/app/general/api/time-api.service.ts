import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ReadTimeDto } from '../models/time/time-dto';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TimeApiService {
  private apiUrl = environment.apiUrl + '/v1/times';

  constructor(private http: HttpClient) {}

  searchTimes(query: {
    station_id?: string;
    calendar_id?: string;
    trip_direction?: '0' | '1';
  }): Observable<{ times: ReadTimeDto[] }> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(map((data: { times: ReadTimeDto[] }) => data));
  }
}
