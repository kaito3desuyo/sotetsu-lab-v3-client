import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { Station } from '../interfaces/station';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Calender } from '../interfaces/calender';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = {
    stations: 'http://localhost:3000/api/v1/stations',
    calenders: 'http://localhost:3000/api/v1/calenders',
    trips: 'http://localhost:3000/api/v1/trips',
    formations: 'http://localhost:3000/api/v1/formations',
    vehicles: 'http://localhost:3000/api/v1/vehicles',
    operations: 'http://localhost:3000/api/v1/operations'
  };

  constructor(private http: HttpClient) {}

  getStations(direction): Observable<Station[]> {
    const params = new HttpParams().set('direction', direction);
    return this.http.get<Station[]>(this.apiUrl.stations, { params: params });
  }
  getCalenders(): Observable<Calender[]> {
    return this.http.get<Calender[]>(this.apiUrl.calenders);
  }
  getCalenderById(id: string): Observable<Calender> {
    return this.http.get<Calender>(this.apiUrl.calenders + '/' + id);
  }
  getCalenderByToday(): Observable<Calender> {
    return this.http.get<Calender>(this.apiUrl.calenders + '/today');
  }

  getTrips(
    calenderId: string,
    direction: string,
    offset?: number,
    count?: number
  ): Observable<any> {
    return this.http.get<any>(this.apiUrl.trips, {
      params: {
        calender_id: calenderId,
        direction: direction,
        offset: offset ? String(offset) : '0',
        count: count ? String(count) : '10'
      }
    });
  }

  getTripsCount(calenderId: string, direction: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.trips + '/count', {
      params: {
        calender_id: calenderId,
        direction: direction
      }
    });
  }

  addTrip(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl.trips, { trip: data });
  }

  getFormation(): Observable<any> {
    return this.http.get<any>(this.apiUrl.formations);
  }

  getVehicleByNumber(number: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.vehicles + '/byNumber/' + number);
  }

  getOperationByDate(date: string) {
    return this.http.get<any>(this.apiUrl.operations + '/date/' + date);
  }
}
