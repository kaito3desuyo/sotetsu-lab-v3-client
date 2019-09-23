import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-trip-add-form-container',
  templateUrl: './dashboard-trip-add-form-container.component.html',
  styleUrls: ['./dashboard-trip-add-form-container.component.scss']
})
export class DashboardTripAddFormContainerComponent {
  calendarsSelectList$: Observable<{ label: string; value: string }[]>;

  constructor(private dashboardService: DashboardService) {
    this.calendarsSelectList$ = this.dashboardService.getCalendarSelectList();
  }
}
