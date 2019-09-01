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

  getCalenders(): Observable<ICalender[]> {
    return this.http.get(this.apiUrl).pipe(
      map(data => {
        return (data as ReadCalenderDto[]).map(result => {
          return CalenderModel.readCalenderDtoImpl(result);
        });
      })
    );
  }

  searchCalenders(query: { date?: string }): Observable<ICalender[]> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(
        map((data: ReadCalenderDto[]) => {
          return data.map(result => CalenderModel.readCalenderDtoImpl(result));
        })
      );
  }
}
