import { Component, OnInit } from '@angular/core';
import { TimetableStationService } from '../../services/timetable-station.service';
import { Observable } from 'rxjs';
import { ITime } from 'src/app/general/interfaces/time';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';

@Component({
  selector: 'app-timetable-station-table-container',
  templateUrl: './timetable-station-table-container.component.html',
  styleUrls: ['./timetable-station-table-container.component.scss']
})
export class TimetableStationTableContainerComponent {
  times$: Observable<ITime[]>;
  sightings$: Observable<IOperationSighting[]>;
  stationId$: Observable<string>;

  constructor(private timetableStationService: TimetableStationService) {
    this.times$ = this.timetableStationService.getTimes();
    this.sightings$ = this.timetableStationService.getOperationSightings();
    this.stationId$ = this.timetableStationService.getStationId();
  }
}
