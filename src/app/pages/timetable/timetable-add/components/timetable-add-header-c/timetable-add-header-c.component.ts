import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableAddHeaderPComponent } from '../timetable-add-header-p/timetable-add-header-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-add-header-c',
    templateUrl: './timetable-add-header-c.component.html',
    styleUrls: ['./timetable-add-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableAddHeaderPComponent],
})
export class TimetableAddHeaderCComponent {}
