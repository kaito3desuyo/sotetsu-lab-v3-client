import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { OperationTableService } from './operation-table.service';
import { map } from 'rxjs/operators';

@Injectable()
export class OperationTableResolverService
  implements Resolve<Observable<void>> {
  constructor(private operationTableService: OperationTableService) {}

  resolve(route: ActivatedRouteSnapshot): Observable<void> {
    const calendarId = route.paramMap.get('calendarId');
    console.log(calendarId);
    return forkJoin([
      this.operationTableService.fetchOperationTrips(calendarId),
      this.operationTableService.fetchStations(),
      this.operationTableService.fetchTripClasses(),
      this.operationTableService.fetchCalendar(calendarId)
    ]).pipe(map(() => null));
  }
}
