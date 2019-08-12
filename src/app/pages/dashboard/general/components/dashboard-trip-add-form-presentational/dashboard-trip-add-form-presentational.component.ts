import { Component, ChangeDetectionStrategy, Input } from '@angular/core';

@Component({
  selector: 'app-dashboard-trip-add-form-presentational',
  templateUrl: './dashboard-trip-add-form-presentational.component.html',
  styleUrls: ['./dashboard-trip-add-form-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardTripAddFormPresentationalComponent {
  @Input() calendersSelectList: { label: string; value: string }[];

  constructor() {}
}
