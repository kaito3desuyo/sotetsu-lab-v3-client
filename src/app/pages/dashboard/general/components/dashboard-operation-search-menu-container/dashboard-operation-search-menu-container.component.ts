import { Component, OnInit } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { Observable } from 'rxjs';
import { ICalender } from 'src/app/general/interfaces/calender';
import { map } from 'rxjs/operators';
import { CalendersQuery } from 'src/app/general/models/calenders/state/calenders.query';

@Component({
  selector: 'app-dashboard-operation-search-menu-container',
  templateUrl: './dashboard-operation-search-menu-container.component.html',
  styleUrls: ['./dashboard-operation-search-menu-container.component.scss']
})
export class DashboardOperationSearchMenuContainerComponent implements OnInit {
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
