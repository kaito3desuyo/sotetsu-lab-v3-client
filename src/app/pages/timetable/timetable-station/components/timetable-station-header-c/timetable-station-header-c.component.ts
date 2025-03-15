import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableStationHeaderPComponent } from '../timetable-station-header-p/timetable-station-header-p.component';

@Component({
    selector: 'app-timetable-station-header-c',
    templateUrl: './timetable-station-header-c.component.html',
    styleUrls: ['./timetable-station-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableStationHeaderPComponent]
})
export class TimetableStationHeaderCComponent {}
