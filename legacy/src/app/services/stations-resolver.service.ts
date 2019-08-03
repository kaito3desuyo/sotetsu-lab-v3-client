import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StationsResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getStations(route.paramMap.get('direction'));
  }
}

@Injectable({
  providedIn: 'root'
})
export class StationTimesByIdResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getStationTimesById(
      route.paramMap.get('station'),
      route.paramMap.get('dia'),
      route.paramMap.get('direction')
    );
  }
}
