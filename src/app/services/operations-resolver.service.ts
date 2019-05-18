import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class OperationsByOperationIdResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getOperationByOperationId(route.paramMap.get('id'));
  }
}

@Injectable({
  providedIn: 'root'
})
export class OperationsByCalenderIdResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any[]> {
    return this.api.getOperationByCalenderId(route.paramMap.get('dia'));
  }
}

@Injectable({
  providedIn: 'root'
})
export class OperationsByDateResolverService {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getOperationByDate(route.data.date);
  }
}

@Injectable({
  providedIn: 'root'
})
export class OperationSightingsByLatestSightingResolverService
  implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getOperationSightingsByLatestSighting();
  }
}
