import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    standalone: true,
    selector: 'app-timetable-all-line-header-p',
    templateUrl: './timetable-all-line-header-p.component.html',
    styleUrls: ['./timetable-all-line-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableAllLineHeaderPComponent {
    constructor() {}
}
