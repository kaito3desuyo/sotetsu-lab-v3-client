import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TitleService } from 'src/app/general/services/title.service';
import { DashboardService } from './dashboard.service';

@Injectable()
export class DashboardResolverService implements Resolve<Observable<void>> {
    constructor(
        private readonly titleService: TitleService,
        private readonly dashboardService: DashboardService
    ) {}

    resolve(): Observable<void> {
        return forkJoin([this.dashboardService.fetchCalendars()]).pipe(
            map(() => null)
        );
    }
}
