import { Observable, of } from 'rxjs';
import { combineAll, map, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';
import { RoutesAllStationsService } from 'src/app/general/models/routes/state/routes-all-stations.service';

@Injectable()
export class DashboardResolverService {
  constructor(
    private calendersService: CalendersService,
    private routesAllStationsService: RoutesAllStationsService
  ) {}

  resolve(): Observable<any> {
    return of(
      this.calendersService.get(),
      this.routesAllStationsService.get()
    ).pipe(
      combineAll(),
      map(([calenders, routes]) => ({ calenders, routes }))
    );
  }
}
