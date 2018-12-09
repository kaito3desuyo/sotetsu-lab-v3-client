import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Station } from '../interfaces/station';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Calender } from '../interfaces/calender';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = {
    stations: 'http://localhost:3000/api/v1/stations',
    calenders: 'http://localhost:3000/api/v1/calenders',
    trips: 'http://localhost:3000/api/v1/trips'
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

  addTrip(data: any): Observable<any> {
    return this.http.post<any>(this.apiUrl.trips, { trip: data });
  }
}
