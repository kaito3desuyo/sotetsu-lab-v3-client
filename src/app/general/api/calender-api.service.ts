import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { map, flatMap, tap } from 'rxjs/operators';
import { ICalender } from '../interfaces/calender';
import { ReadCalenderDto } from '../models/calender/calender-dto';
import { CalenderModel } from '../models/calender/calender-model';

@Injectable({
  providedIn: 'root'
})
export class CalenderApiService {
  private apiUrl = environment.apiUrl + '/v1/calenders';

  constructor(private http: HttpClient) {}

  getCalenders(): Observable<{ calenders: ReadCalenderDto[] }> {
    return this.http
      .get(this.apiUrl)
      .pipe(map((data: { calenders: ReadCalenderDto[] }) => data));
  }

  searchCalenders(query: {
    date?: string;
  }): Observable<{ calenders: ReadCalenderDto[] }> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(map((data: { calenders: ReadCalenderDto[] }) => data));
  }

  searchSpecifiedDateCalenderId(query: {
    date: string;
  }): Observable<{ calender_id: string }> {
    return this.searchCalenders({
      date: query.date
    }).pipe(
      map(data => {
        return {
          calender_id: data[0].id
        };
      })
    );
  }
}
