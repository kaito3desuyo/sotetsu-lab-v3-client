import { Injectable } from '@angular/core';
import { Observable, forkJoin } from 'rxjs';
import { Station } from '../interfaces/station';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Calender } from '../interfaces/calender';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBaseUrl = environment.apiUrl + '/api/v1/';

  private apiUrl = {
    services: this.apiBaseUrl + 'services',
    stations: this.apiBaseUrl + 'stations',
    calenders: this.apiBaseUrl + 'calenders',
    trips: this.apiBaseUrl + 'trips',
    formations: this.apiBaseUrl + 'formations',
    vehicles: this.apiBaseUrl + 'vehicles',
    operations: this.apiBaseUrl + 'operations'
  };

  constructor(private http: HttpClient) {}

  getServices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl.services);
  }

  getStations(direction): Observable<Station[]> {
    const params = new HttpParams().set('direction', direction);
    return this.http.get<Station[]>(this.apiUrl.stations, { params: params });
  }

  getStationTimesById(id: string, dia: string, direction: string) {
    return this.http.get<any>(this.apiUrl.stations + '/' + id + '/time', {
      params: {
        dia: dia,
        direction: direction
      }
    });
  }

  getCalenders(): Observable<Calender[]> {
    return this.http.get<Calender[]>(this.apiUrl.calenders);
  }
  getCalenderById(id: string): Observable<Calender> {
    return this.http.get<Calender>(this.apiUrl.calenders + '/' + id);
  }
  getCalenderByDate(date: string): Observable<Calender> {
    return this.http.get<Calender>(this.apiUrl.calenders + '/date/' + date);
  }
  /*
  getCalenderByToday(): Observable<Calender> {
    return this.http.get<Calender>(this.apiUrl.calenders + '/today');
  }
  */

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

  getTripById(
    calenderId: string,
    direction: string,
    tripId: string
  ): Observable<any> {
    console.log('id', calenderId, direction, tripId);
    return this.http.get<any>(this.apiUrl.trips + '/' + tripId, {
      params: {
        calender_id: calenderId,
        direction: direction
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

  getTripsGroupByOperations(params?: { calender_id: string }) {
    return this.http.get<any>(this.apiUrl.operations + '/trips', {
      params: params || null
    });
  }

  addTrip(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl.trips, { trip: data });
  }

  editTrip(tripId: string, data: any): Observable<any> {
    return this.http.put<any>(this.apiUrl.trips + '/' + tripId, { trip: data });
  }

  getFormation(): Observable<any> {
    return this.http.get<any>(this.apiUrl.formations);
  }

  getFormationByNumber(number: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.formations + '/number/' + number);
  }

  getVehicleByNumber(number: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.vehicles + '/number/' + number);
  }

  getOperationByOperationId(id: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.operations + '/by-id/' + id);
  }

  getOperationByCalenderId(id: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.operations + '/by-calender/' + id);
  }

  getOperationByDate(date: string) {
    return this.http.get<any>(this.apiUrl.operations + '/date/' + date);
  }

  getOperationByDateByNumber(date: string, number: string) {
    return this.http.get<any>(
      this.apiUrl.operations + '/date/' + date + '/number/' + number
    );
  }

  getOperationSightingsByFormation() {
    return this.http.get<any>(this.apiUrl.operations + '/sightings/formation');
  }

  getOperationSightingsByFormationNumber(
    formationNumber: string,
    params?: {
      limit: string
      offset: string
    }
  ) {
    console.log(params);
    return this.http.get<any>(
      this.apiUrl.operations + '/sightings/formation/' + formationNumber,
      {
        params: params || {}
      }
    );
  }

  getOperationSightingsByOperation() {
    return this.http.get<any>(this.apiUrl.operations + '/sightings/operation');
  }

  getOperationSightingsByOperationNumber(
    operationNumber: string,
    params?: {
      limit: string
      offset: string
    }
  ) {
    return this.http.get<any>(
      this.apiUrl.operations + '/sightings/operation/' + operationNumber,
      {
        params: params || {}
      }
    );
  }

  getOperationSightingsByLatestSighting() {
    return this.http.get<any>(this.apiUrl.operations + '/sightings/latest');
  }

  postOperationSightings(body: any) {
    return this.http.post(this.apiUrl.operations + '/sightings', body);
  }
}
