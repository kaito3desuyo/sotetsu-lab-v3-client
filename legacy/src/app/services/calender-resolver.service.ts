import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { ApiService } from './api.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

/*
@Injectable({
  providedIn: 'root'
})
export class CalendersResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getTrips(
      route.paramMap.get('dia'),
      route.paramMap.get('direction')
    );
  }
}
*/

@Injectable({
  providedIn: 'root'
})
export class CalenderByIdResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getCalenderById(route.paramMap.get('dia'));
  }
}

@Injectable({
  providedIn: 'root'
})
export class CalenderByDateResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const date = route.data.date;
    console.log('カレンダーを取得します', date);
    return this.api.getCalenderByDate(date).pipe(
      take(1)
    );
  }
}
