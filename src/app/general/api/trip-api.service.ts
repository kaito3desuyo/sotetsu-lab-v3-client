import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ITrip } from '../interfaces/trip';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { ReadTripDto } from '../models/trip/trip-dto';
import { TripModel } from '../models/trip/trip-model';

@Injectable({
  providedIn: 'root'
})
export class TripApiService {
  private apiUrl = environment.apiUrl + '/v1/trips';

  constructor(private http: HttpClient) {}

  searchTrips(query: {
    calender_id?: string;
    trip_direction?: '0' | '1';
  }): Observable<ITrip[]> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(
        map((data: ReadTripDto[]) => {
          return data.map(result => TripModel.readTripDtoImpl(result));
        })
      );
  }
}
