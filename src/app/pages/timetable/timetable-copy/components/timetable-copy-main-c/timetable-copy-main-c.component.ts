import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableEditFormCComponent } from 'src/app/shared/timetable-edit-form/components/timetable-edit-form-c/timetable-edit-form-c.component';

@Component({
    selector: 'app-timetable-copy-main-c',
    templateUrl: './timetable-copy-main-c.component.html',
    styleUrls: ['./timetable-copy-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableEditFormCComponent]
})
export class TimetableCopyMainCComponent {}
