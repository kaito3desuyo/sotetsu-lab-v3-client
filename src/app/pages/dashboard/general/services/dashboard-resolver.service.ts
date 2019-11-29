import { Observable, forkJoin } from 'rxjs';
import { Injectable } from '@angular/core';

import { DashboardService } from './dashboard.service';

@Injectable()
export class DashboardResolverService {
    constructor(private dashboardService: DashboardService) {}

    resolve(): Observable<any> {
        return forkJoin([this.dashboardService.fetchCalendars()]);
    }
}
