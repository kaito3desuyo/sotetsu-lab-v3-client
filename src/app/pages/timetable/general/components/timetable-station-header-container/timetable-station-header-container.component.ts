import { Component, OnInit } from '@angular/core';
import { TimetableStationService } from '../../services/timetable-station.service';
import { Observable } from 'rxjs';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IStation } from 'src/app/general/interfaces/station';

@Component({
  selector: 'app-timetable-station-header-container',
  templateUrl: './timetable-station-header-container.component.html',
  styleUrls: ['./timetable-station-header-container.component.scss']
})
export class TimetableStationHeaderContainerComponent {
  calendar$: Observable<ICalendar>;
  station$: Observable<IStation>;
  tripDirection$: Observable<'0' | '1'>;

  constructor(private timetableStationService: TimetableStationService) {
    this.calendar$ = this.timetableStationService.getCalendar();
    this.station$ = this.timetableStationService.getStation();
    this.tripDirection$ = this.timetableStationService.getTripDirection();
  }
}
