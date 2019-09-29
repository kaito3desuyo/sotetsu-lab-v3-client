import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

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
  searchTimetableForm = this.fb.group({
    calendarId: ['', Validators.required],
    tripDirection: ['', Validators.required]
  });

  @Input() calendarsSelectList: { label: string; value: string }[];
  @Input() stationsSelectList: {
    routeName: string;
    stations: { label: string; value: string }[];
  }[];
  @Output() searchTimetable: EventEmitter<any> = new EventEmitter<any>();

  constructor(private fb: FormBuilder) {}

  onClickSearch(): void {
    this.searchTimetable.emit(this.searchTimetableForm.value);
  }
}
