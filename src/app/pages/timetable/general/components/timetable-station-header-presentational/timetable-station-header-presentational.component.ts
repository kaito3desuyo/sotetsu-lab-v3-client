import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input,
} from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { IStation } from 'src/app/general/interfaces/station';

@Component({
    selector: 'app-timetable-station-header-presentational',
    templateUrl: './timetable-station-header-presentational.component.html',
    styleUrls: ['./timetable-station-header-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableStationHeaderPresentationalComponent {
    @Input() calendar: ICalendar;
    @Input() stationId: string;
    @Input() stations: IStation[];
    @Input() tripDirection: '0' | '1';

    constructor() {}
}
