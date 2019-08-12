import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';

@Component({
  selector: 'app-dashboard-timetable-search-form-container',
  templateUrl: './dashboard-timetable-search-form-container.component.html',
  styleUrls: ['./dashboard-timetable-search-form-container.component.scss']
})
export class DashboardTimetableSearchFormContainerComponent {
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
}
