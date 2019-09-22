import { Injectable } from '@angular/core';
import { OperationRealTimeService } from './operation-real-time.service';
import { Observable, of, forkJoin } from 'rxjs';
import { Resolve } from '@angular/router';
import { flatMap } from 'rxjs/operators';

@Injectable()
export class OperationRealTimeResolverService
  implements Resolve<Observable<void>> {
  constructor(private operationRealTimeService: OperationRealTimeService) {}

  resolve(): Observable<void> {
    return forkJoin([
      this.operationRealTimeService.fetchServices(),
      this.operationRealTimeService.fetchCalendars(),
      this.operationRealTimeService.fetchStations()
    ]).pipe(
      flatMap(() => {
        const services = this.operationRealTimeService.getServicesAsStatic();
        const calendars = this.operationRealTimeService.getCalendarsAsStatic();
        return forkJoin([
          this.operationRealTimeService.fetchFormationNumbers(),
          this.operationRealTimeService.fetchOperationNumbers(calendars[0].id),
          this.operationRealTimeService.fetchOperationTrips(calendars[0].id),
          this.operationRealTimeService.fetchTripClasses(services[0].id)
        ]);
      }),
      flatMap(() => {
        return forkJoin([
          this.operationRealTimeService.fetchFormationSightings(),
          this.operationRealTimeService.fetchOperationSightings()
        ]);
      }),
      flatMap(() => {
        return of(null);
      })
    );
  }
}
