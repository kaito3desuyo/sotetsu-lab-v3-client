import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { DashboardService } from '../../services/dashboard.service';
import { map } from 'rxjs/operators';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';

@Component({
  selector: 'app-dashboard-trip-add-form-container',
  templateUrl: './dashboard-trip-add-form-container.component.html',
  styleUrls: ['./dashboard-trip-add-form-container.component.scss']
})
export class DashboardTripAddFormContainerComponent implements OnInit {
  calendersSelectList$: Observable<
    { label: string; value: string }[]
  > = this.calendersQuery
    .selectAll()
    .pipe(
      map(calender =>
        this.dashboardService.generateCalenderSelectList(calender)
      )
    );
  constructor(
    private calendersQuery: CalendersQuery,
    private dashboardService: DashboardService
  ) {}

  ngOnInit() {}
}
