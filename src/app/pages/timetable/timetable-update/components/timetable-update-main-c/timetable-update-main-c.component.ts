import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableEditFormCComponent } from 'src/app/shared/timetable-edit-form/components/timetable-edit-form-c/timetable-edit-form-c.component';

@Component({
    selector: 'app-timetable-update-main-c',
    templateUrl: './timetable-update-main-c.component.html',
    styleUrls: ['./timetable-update-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableEditFormCComponent]
})
export class TimetableUpdateMainCComponent {}
