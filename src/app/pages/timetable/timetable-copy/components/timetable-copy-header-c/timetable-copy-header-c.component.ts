import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableCopyHeaderPComponent } from '../timetable-copy-header-p/timetable-copy-header-p.component';

@Component({
    standalone: true,
    selector: 'app-timetable-copy-header-c',
    templateUrl: './timetable-copy-header-c.component.html',
    styleUrls: ['./timetable-copy-header-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableCopyHeaderPComponent],
})
export class TimetableCopyHeaderCComponent {}
