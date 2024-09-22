import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableUpdateHeaderPComponent } from '../timetable-update-header-p/timetable-update-header-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-update-header-c',
    templateUrl: './timetable-update-header-c.component.html',
    styleUrls: ['./timetable-update-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableUpdateHeaderPComponent],
})
export class TimetableUpdateHeaderCComponent {}
