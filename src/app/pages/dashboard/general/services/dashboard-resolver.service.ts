import { CalenderApiService } from 'src/app/general/api/calender-api.service';
import { Observable, of } from 'rxjs';
import { combineAll, map, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';
import { DashboardService } from './dashboard.service';
import { CalendersService } from 'src/app/general/models/calenders/state/calenders.service';

@Injectable()
export class DashboardResolverService {
  constructor(
    private api: CalenderApiService,
    private dashboardService: DashboardService,
    private calendersService: CalendersService
  ) {}

  resolve(): Observable<any> {
    return of(this.calendersService.get()).pipe(
      combineAll(),
      map(([calenders]) => ({ calenders }))
    );
  }
}
