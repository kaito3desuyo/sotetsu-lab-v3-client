import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableAllLineHeaderPComponent } from '../timetable-all-line-header-p/timetable-all-line-header-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-all-line-header-c',
    templateUrl: './timetable-all-line-header-c.component.html',
    styleUrls: ['./timetable-all-line-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableAllLineHeaderPComponent],
})
export class TimetableAllLineHeaderCComponent {
    constructor() {}
}
