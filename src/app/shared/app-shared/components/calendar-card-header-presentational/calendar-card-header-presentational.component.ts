import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';

@Component({
  selector: 'app-calendar-card-header-presentational',
  templateUrl: './calendar-card-header-presentational.component.html',
  styleUrls: ['./calendar-card-header-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarCardHeaderPresentationalComponent {
  @Input() calendar: ICalendar;
  @Input() title: string;

  constructor() {}
}
