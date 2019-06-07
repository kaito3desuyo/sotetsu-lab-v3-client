import { Injectable } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { Station } from '../interfaces/station';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Calender } from '../interfaces/calender';
import * as moment from 'moment';
import { environment } from 'src/environments/environment';
import { retry, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiBaseUrl = environment.apiUrl + '/api/v1/';

  private apiUrl = {
    services: this.apiBaseUrl + 'services',
    routes: this.apiBaseUrl + 'routes',
    stations: this.apiBaseUrl + 'stations',
    calenders: this.apiBaseUrl + 'calenders',
    trips: this.apiBaseUrl + 'trips',
    formations: this.apiBaseUrl + 'formations',
    vehicles: this.apiBaseUrl + 'vehicles',
    operations: this.apiBaseUrl + 'operations'
  };

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong,
      console.error(
        `Backend returned code ${error.status}`,
        `body was:`,
        error.error
      );
    }
    // return an observable with a user-facing error message
    return throwError(
      '通信できませんでした。一度ページを更新して頂き、改善しない場合は管理者にご連絡ください。'
    );
  }

  getServices(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl.services).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getRoutesStations(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl.routes + '/stations').pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getStations(direction): Observable<Station[]> {
    const params = new HttpParams().set('direction', direction);
    return this.http
      .get<Station[]>(this.apiUrl.stations, { params: params })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getStationTimesById(id: string, dia: string, direction: string) {
    return this.http
      .get<any>(this.apiUrl.stations + '/' + id + '/time', {
        params: {
          dia: dia,
          direction: direction
        }
      })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getCalenders(): Observable<Calender[]> {
    return this.http.get<Calender[]>(this.apiUrl.calenders).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }
  getCalenderById(id: string): Observable<Calender> {
    return this.http.get<Calender>(this.apiUrl.calenders + '/' + id).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }
  getCalenderByDate(date: string): Observable<Calender> {
    console.log('getCalenderDate', date);
    return this.http
      .get<Calender>(this.apiUrl.calenders + '/date/' + date)
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
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
    return this.http
      .get<any>(this.apiUrl.trips, {
        params: {
          calender_id: calenderId,
          direction: direction,
          offset: offset ? String(offset) : '0',
          count: count ? String(count) : '10'
        }
      })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getTripById(
    calenderId: string,
    direction: string,
    tripId: string
  ): Observable<any> {
    console.log('id', calenderId, direction, tripId);
    return this.http
      .get<any>(this.apiUrl.trips + '/' + tripId, {
        params: {
          calender_id: calenderId,
          direction: direction
        }
      })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getTripsCount(calenderId: string, direction: string): Observable<any> {
    return this.http
      .get<any>(this.apiUrl.trips + '/count', {
        params: {
          calender_id: calenderId,
          direction: direction
        }
      })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getTripsGroupByOperations(params?: { calender_id: string }) {
    return this.http
      .get<any>(this.apiUrl.operations + '/trips', {
        params: params || null
      })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  addTrip(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl.trips, { trip: data }).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  editTrip(tripId: string, data: any): Observable<any> {
    return this.http
      .put<any>(this.apiUrl.trips + '/' + tripId, { trip: data })
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getFormation(): Observable<any> {
    return this.http.get<any>(this.apiUrl.formations).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getFormationByNumber(number: string): Observable<any> {
    return this.http
      .get<any>(this.apiUrl.formations + '/number/' + number)
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getVehicleByNumber(number: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.vehicles + '/number/' + number).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getOperationByOperationId(id: string): Observable<any> {
    return this.http.get<any>(this.apiUrl.operations + '/by-id/' + id).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getOperationByCalenderId(id: string): Observable<any> {
    return this.http
      .get<any>(this.apiUrl.operations + '/by-calender/' + id)
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getOperationByDate(date: string) {
    return this.http.get<any>(this.apiUrl.operations + '/date/' + date).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  getOperationByDateByNumber(date: string, number: string) {
    return this.http
      .get<any>(this.apiUrl.operations + '/date/' + date + '/number/' + number)
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getOperationSightingsByFormation() {
    return this.http
      .get<any>(this.apiUrl.operations + '/sightings/formation')
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getOperationSightingsByFormationNumber(
    formationNumber: string,
    params?: {
      limit: string
      offset: string
    }
  ) {
    console.log(params);
    return this.http
      .get<any>(
        this.apiUrl.operations + '/sightings/formation/' + formationNumber,
        {
          params: params || {}
        }
      )
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getOperationSightingsByOperation() {
    return this.http
      .get<any>(this.apiUrl.operations + '/sightings/operation')
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getOperationSightingsByOperationNumber(
    operationNumber: string,
    params?: {
      limit: string
      offset: string
    }
  ) {
    return this.http
      .get<any>(
        this.apiUrl.operations + '/sightings/operation/' + operationNumber,
        {
          params: params || {}
        }
      )
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  getOperationSightingsByLatestSighting() {
    return this.http
      .get<any>(this.apiUrl.operations + '/sightings/latest')
      .pipe(
        retry(3),
        catchError(this.handleError)
      );
  }

  postOperationSightings(body: any) {
    return this.http.post(this.apiUrl.operations + '/sightings', body).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }
}
