import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CalenderApiService {
  private apiUrl = environment.apiUrl + '/v1/calenders';

  constructor(private http: HttpClient) {}

  getCalenders(): Observable<any> {
    return this.http.get(this.apiUrl);
  }
}
