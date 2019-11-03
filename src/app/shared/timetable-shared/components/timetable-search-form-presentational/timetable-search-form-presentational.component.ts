import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input,
  Output,
  EventEmitter
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
  selector: 'app-timetable-search-form-presentational',
  templateUrl: './timetable-search-form-presentational.component.html',
  styleUrls: ['./timetable-search-form-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableSearchFormPresentationalComponent {
  searchTimetableForm = this.fb.group({
    calendarId: ['', Validators.required],
    tripDirection: ['0', Validators.required],
    isSearchStation: [false, Validators.required],
    stationId: [{ value: '', disabled: true }, Validators.required]
  });

  @Input() calendars: ICalendar[];
  @Input() stationsSelectList: {
    routeName: string;
    stations: { label: string; value: string }[];
  }[];
  @Input() todaysCalendarId: string;
  @Output() searchTimetable: EventEmitter<any> = new EventEmitter<any>();

  constructor(private fb: FormBuilder) {
    this.searchTimetableForm
      .get('isSearchStation')
      .valueChanges.subscribe(bool => {
        if (bool) {
          this.searchTimetableForm.get('stationId').enable();
        } else {
          this.searchTimetableForm.get('stationId').disable();
        }
      });
  }

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
