import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-timetable-add-header-p',
    templateUrl: './timetable-add-header-p.component.html',
    styleUrls: ['./timetable-add-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableAddHeaderPComponent {}
