import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { ReadServiceDto } from '../models/service/service-dto';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServiceApiService {
  private apiUrl = environment.apiUrl + '/v1/services';

  constructor(private http: HttpClient) {}

  searchServices(query: {
    service_name?: string;
  }): Observable<{ services: ReadServiceDto[] }> {
    return this.http
      .get(this.apiUrl + '/search', {
        params: query
      })
      .pipe(map((data: { services: ReadServiceDto[] }) => data));
  }
}
