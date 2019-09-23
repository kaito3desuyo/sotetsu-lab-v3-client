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
  @Input() calendarsSelectList: { label: string; value: string }[];
  @Input() stationsSelectList: {
    routeName: string;
    stations: { label: string; value: string }[];
  }[];

  constructor() {}
}
