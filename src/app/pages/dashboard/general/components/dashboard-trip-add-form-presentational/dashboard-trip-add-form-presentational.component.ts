import {
    Component,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
    selector: 'app-dashboard-trip-add-form-presentational',
    templateUrl: './dashboard-trip-add-form-presentational.component.html',
    styleUrls: ['./dashboard-trip-add-form-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardTripAddFormPresentationalComponent {
    form = this.fb.group({
        calendarId: ['', Validators.required],
        tripDirection: ['0', Validators.required]
    });

    @Input() calendarsSelectList: { label: string; value: string }[];
    @Output() clickMoveTripInputPage: EventEmitter<{
        calendarId: string;
        tripDirection: '0' | '1';
    }> = new EventEmitter<{ calendarId: string; tripDirection: '0' | '1' }>();

    constructor(private fb: FormBuilder) {}

    onClickMoveTripInputPage(): void {
        this.clickMoveTripInputPage.emit(this.form.value);
    }
}
