import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-timetable-search-form-presentational',
  templateUrl:
    './dashboard-timetable-search-form-presentational.component.html',
  styleUrls: [
    './dashboard-timetable-search-form-presentational.component.scss'
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardTimetableSearchFormPresentationalComponent {
  @Input() calendersSelectList: { label: string; value: string }[];

  constructor() {}
}