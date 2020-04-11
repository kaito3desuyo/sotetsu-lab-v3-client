import {
    Component,
    ChangeDetectionStrategy,
    Input,
    OnChanges,
    Output,
    EventEmitter,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
    selector: 'app-dashboard-operation-search-menu-presentational',
    templateUrl:
        './dashboard-operation-search-menu-presentational.component.html',
    styleUrls: [
        './dashboard-operation-search-menu-presentational.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOperationSearchMenuPresentationalComponent
    implements OnChanges {
    operationTableForm = this.fb.group({
        calendarId: ['', Validators.required],
    });

    @Input() calendarsSelectList: { label: string; value: string }[];
    @Input() todaysCalendarId: string;
    @Output() clickSearchOperationTable: EventEmitter<
        string
    > = new EventEmitter<string>();

    constructor(private fb: FormBuilder) {}

    ngOnChanges() {
        this.operationTableForm
            .get('calendarId')
            .setValue(this.todaysCalendarId);
    }

    onClickSearchOperationTable(): void {
        this.clickSearchOperationTable.emit(
            this.operationTableForm.get('calendarId').value
        );
    }
}
