import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { ApiService } from './api.service';
import { Observable, of } from 'rxjs';
import { flatMap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TripsResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    if (route.paramMap.get('trip')) {
      return this.api.getTripById(
        route.paramMap.get('dia'),
        route.paramMap.get('direction'),
        route.paramMap.get('trip')
      );
    }
    return this.api.getTrips(
      route.paramMap.get('dia'),
      route.paramMap.get('direction')
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class TripByIdResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getTripById(
      route.paramMap.get('dia'),
      route.paramMap.get('direction'),
      route.paramMap.get('trip')
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class TripsCountResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    return this.api.getTripsCount(
      route.paramMap.get('dia'),
      route.paramMap.get('direction')
    );
  }
}

@Injectable({
  providedIn: 'root'
})
export class TripsGroupByOperationsResolverService implements Resolve<any> {
  constructor(private api: ApiService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<any> {
    const date = route.data.date;
    console.log('Calender', date);
    return this.api.getCalenderByDate(date).pipe(
      map(res => {
        return this.api.getTripsGroupByOperations({
          calender_id: res.id
        });
      })
    );

    // return of([]);
    /*
    return this.api.getCalenderByDate(date).pipe(
      flatMap(res => {

        return this.api.getTripsGroupByOperations({
          calender_id: res.id
        });
      })
    );
    */
  }
}
