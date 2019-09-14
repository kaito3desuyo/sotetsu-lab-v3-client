import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

import { DashboardService } from '../../services/dashboard.service';
import { ParamsQuery } from 'src/app/state/params';

@Component({
  selector: 'app-dashboard-operation-search-menu-container',
  templateUrl: './dashboard-operation-search-menu-container.component.html',
  styleUrls: ['./dashboard-operation-search-menu-container.component.scss']
})
export class DashboardOperationSearchMenuContainerComponent implements OnInit {
  calendersSelectList$: Observable<{ label: string; value: string }[]>;

  todaysCalenderId$: Observable<string>;
  constructor(
    private dashboardService: DashboardService,
    private paramsQuery: ParamsQuery
  ) {
    this.todaysCalenderId$ = this.paramsQuery.select('calenderId');
    this.calendersSelectList$ = this.dashboardService.getCalenderSelectList();
  }

  ngOnInit() {}
}
