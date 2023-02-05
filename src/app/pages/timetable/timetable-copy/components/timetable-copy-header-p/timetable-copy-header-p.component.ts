import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-timetable-copy-header-p',
    templateUrl: './timetable-copy-header-p.component.html',
    styleUrls: ['./timetable-copy-header-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableCopyHeaderPComponent {
    constructor() {}
}
