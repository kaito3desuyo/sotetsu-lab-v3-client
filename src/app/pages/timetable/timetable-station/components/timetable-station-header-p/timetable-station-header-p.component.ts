import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-timetable-station-header-p',
    templateUrl: './timetable-station-header-p.component.html',
    styleUrls: ['./timetable-station-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableStationHeaderPComponent {}
