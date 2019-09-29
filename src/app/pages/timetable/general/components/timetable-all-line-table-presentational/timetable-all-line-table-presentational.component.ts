import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  Input
} from '@angular/core';
import {
  ITimetableStation,
  ETimetableStationViewMode
} from '../../interfaces/timetable-station';

@Component({
  selector: 'app-timetable-all-line-table-presentational',
  templateUrl: './timetable-all-line-table-presentational.component.html',
  styleUrls: ['./timetable-all-line-table-presentational.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimetableAllLineTablePresentationalComponent implements OnInit {
  @Input() tripDirection: '0' | '1';
  @Input() stations: ITimetableStation[];
  staitonViewMode: typeof ETimetableStationViewMode = ETimetableStationViewMode;

  constructor() {}

  ngOnInit() {}
}
