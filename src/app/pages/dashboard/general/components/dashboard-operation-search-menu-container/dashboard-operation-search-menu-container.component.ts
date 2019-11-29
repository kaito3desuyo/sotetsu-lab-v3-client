import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardService } from '../../services/dashboard.service';
import { ParamsQuery } from 'src/app/state/params';
import { Router } from '@angular/router';

@Component({
    selector: 'app-dashboard-operation-search-menu-container',
    templateUrl: './dashboard-operation-search-menu-container.component.html',
    styleUrls: ['./dashboard-operation-search-menu-container.component.scss']
})
export class DashboardOperationSearchMenuContainerComponent {
    calendarsSelectList$: Observable<{ label: string; value: string }[]>;

    todaysCalendarId$: Observable<string>;
    constructor(
        private router: Router,
        private dashboardService: DashboardService,
        private paramsQuery: ParamsQuery
    ) {
        this.todaysCalendarId$ = this.paramsQuery.select('calendarId');
        this.calendarsSelectList$ = this.dashboardService.getCalendarSelectList();
    }

    onReceiveClickSearchOperationTable(calendarId: string): void {
        this.router.navigate(['operation', 'table', calendarId]);
    }
}
