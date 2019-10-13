import {
  Component,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter,
  OnInit
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
export class DashboardTimetableSearchFormPresentationalComponent
  implements OnInit {
  searchTimetableForm = this.fb.group({
    calendarId: ['', Validators.required],
    tripDirection: ['0', Validators.required]
  });

  @Input() calendarsSelectList: { label: string; value: string }[];
  @Input() stationsSelectList: {
    routeName: string;
    stations: { label: string; value: string }[];
  }[];
  @Input() todaysCalendarId: string;
  @Output() searchTimetable: EventEmitter<any> = new EventEmitter<any>();

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (this.todaysCalendarId) {
      this.searchTimetableForm
        .get('calendarId')
        .setValue(this.todaysCalendarId);
    }
  }

  onClickSearch(): void {
    this.searchTimetable.emit(this.searchTimetableForm.value);
  }
}
