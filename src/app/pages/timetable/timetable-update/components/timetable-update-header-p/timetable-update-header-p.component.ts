import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-timetable-update-header-p',
    templateUrl: './timetable-update-header-p.component.html',
    styleUrls: ['./timetable-update-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableUpdateHeaderPComponent {}
