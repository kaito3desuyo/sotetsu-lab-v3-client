import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ITrip } from '../interfaces/trip';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators';
import { ReadTripDto } from '../models/trip/trip-dto';
import { TripModel } from '../models/trip/trip-model';
import { ReadTripClassDto } from '../models/trip-class/trip-class-dto';
import { ReadTripBlockDto } from '../models/trip-block/trip-block-dto';

@Injectable({
  providedIn: 'root'
})
export class TripApiService {
  private apiUrl = environment.apiUrl + '/v1/trips';

  constructor(private http: HttpClient) {}

  getTripClasses(query: {
    service_id?: string;
  }): Observable<{ trip_classes: ReadTripClassDto[] }> {
    return this.http
      .get(this.apiUrl + '/classes', {
        params: query
      })
      .pipe(map((data: { trip_classes: ReadTripClassDto[] }) => data));
  }

  searchTrips(query: {
    calendar_id?: string;
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

  searchTripsByBlocks(query: {
    calendar_id?: string;
    trip_direction?: '0' | '1';
  }): Observable<{ trip_blocks: ReadTripBlockDto[] }> {
    return this.http
      .get(this.apiUrl + '/search/by-blocks', {
        params: query
      })
      .pipe(map((data: { trip_blocks: ReadTripBlockDto[] }) => data));
  }
}
