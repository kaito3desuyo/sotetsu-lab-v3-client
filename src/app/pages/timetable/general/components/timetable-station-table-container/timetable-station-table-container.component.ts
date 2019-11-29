import { Component, OnInit } from '@angular/core';
import { TimetableStationService } from '../../services/timetable-station.service';
import { Observable } from 'rxjs';
import { ITime } from 'src/app/general/interfaces/time';
import { IOperationSighting } from 'src/app/general/interfaces/operation-sighting';
import { IStation } from 'src/app/general/interfaces/station';

@Component({
    selector: 'app-timetable-station-table-container',
    templateUrl: './timetable-station-table-container.component.html',
    styleUrls: ['./timetable-station-table-container.component.scss']
})
export class TimetableStationTableContainerComponent {
    calendarId$: Observable<string>;
    times$: Observable<ITime[]>;
    sightings$: Observable<IOperationSighting[]>;
    stations$: Observable<IStation[]>;

    constructor(private timetableStationService: TimetableStationService) {
        this.calendarId$ = this.timetableStationService.getCalendarId();
        this.times$ = this.timetableStationService.getTimes();
        this.sightings$ = this.timetableStationService.getOperationSightings();
        this.stations$ = this.timetableStationService.getStations();
    }
}
