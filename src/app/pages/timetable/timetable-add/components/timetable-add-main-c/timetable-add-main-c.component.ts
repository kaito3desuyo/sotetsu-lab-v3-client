import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TimetableEditFormCComponent } from 'src/app/shared/timetable-edit-form/components/timetable-edit-form-c/timetable-edit-form-c.component';

@Component({
    selector: 'app-timetable-add-main-c',
    templateUrl: './timetable-add-main-c.component.html',
    styleUrls: ['./timetable-add-main-c.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TimetableEditFormCComponent]
})
export class TimetableAddMainCComponent {}
