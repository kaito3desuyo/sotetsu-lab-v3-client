import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
  selector: 'app-timetable-all-line-header-presentational',
  templateUrl: './timetable-all-line-header-presentational.component.html',
  styleUrls: ['./timetable-all-line-header-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableAllLineHeaderPresentationalComponent {
  @Input() calendar: ICalendar;
  constructor() {}
}
