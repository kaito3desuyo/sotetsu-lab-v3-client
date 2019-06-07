import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { ApiService } from './api.service';
import { Observable } from 'rxjs/internal/Observable';

@Injectable({
  providedIn: 'root'
})
export class RoutesStationsResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(): Observable<any> {
    return this.api.getRoutesStations();
  }
}
