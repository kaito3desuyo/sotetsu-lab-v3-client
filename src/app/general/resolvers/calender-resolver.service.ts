import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { CalenderApiService } from '../api/calender-api.service';

@Injectable({
  providedIn: 'root'
})
export class GetCalendersResolverService implements Resolve<any> {
  constructor(private api: CalenderApiService) {}

  resolve(): Observable<any> {
    return this.api.getCalenders();
  }
}
