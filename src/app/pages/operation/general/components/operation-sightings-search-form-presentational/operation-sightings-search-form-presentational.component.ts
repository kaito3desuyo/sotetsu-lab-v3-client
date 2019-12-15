import {
    Component,
    ChangeDetectionStrategy,
    Output,
    EventEmitter
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Moment } from 'moment';

@Component({
    selector: 'app-operation-sightings-search-form-presentational',
    templateUrl:
        './operation-sightings-search-form-presentational.component.html',
    styleUrls: [
        './operation-sightings-search-form-presentational.component.scss'
    ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class OperationSightingsSearchFormPresentationalComponent {
    searchForm: FormGroup = this.fb.group({
        referenceDate: [null, Validators.required],
        days: [
            null,
            [Validators.required, Validators.min(1), Validators.max(30)]
        ]
    });

    @Output() clickSearch: EventEmitter<{
        referenceDate: Moment;
        days: number;
    }> = new EventEmitter<{
        referenceDate: Moment;
        days: number;
    }>();

    constructor(private fb: FormBuilder) {}

    onClickSearch(): void {
        this.clickSearch.emit(this.searchForm.value);
    }
}
