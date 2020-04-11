import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-dashboard-trip-add-form-container',
    templateUrl: './dashboard-trip-add-form-container.component.html',
    styleUrls: ['./dashboard-trip-add-form-container.component.scss'],
})
export class DashboardTripAddFormContainerComponent {
    calendarsSelectList$: Observable<{ label: string; value: string }[]>;

    constructor(
        private router: Router,
        private dashboardService: DashboardService
    ) {
        this.calendarsSelectList$ = this.dashboardService.getCalendarSelectList();
    }

    onReceiveMoveTripInputPage(params: {
        calendarId: string;
        tripDirection: '0' | '1';
    }): void {
        this.router.navigate([
            'timetable',
            'add',
            params.calendarId,
            { trip_direction: params.tripDirection },
        ]);
    }
}
