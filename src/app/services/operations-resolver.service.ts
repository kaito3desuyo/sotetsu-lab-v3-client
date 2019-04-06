import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import * as moment from 'moment';

@Injectable({
  providedIn: 'root'
})
export class OperationsByDateResolverService {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getOperationByDate(
      moment().format('H') < '3'
        ? moment()
            .subtract(1, 'days')
            .format('YYYY-MM-DD')
        : moment().format('YYYY-MM-DD')
    );
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
