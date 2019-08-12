import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-operation-search-menu-presentational',
  templateUrl:
    './dashboard-operation-search-menu-presentational.component.html',
  styleUrls: [
    './dashboard-operation-search-menu-presentational.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardOperationSearchMenuPresentationalComponent {
  @Input() calendersSelectList: { label: string; value: string }[];

  constructor() {}
}
