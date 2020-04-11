import {
    Component,
    ChangeDetectionStrategy,
    Output,
    EventEmitter,
    Input,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import moment, { Moment } from 'moment';

@Component({
    selector: 'app-operation-sightings-search-form-presentational',
    templateUrl:
        './operation-sightings-search-form-presentational.component.html',
    styleUrls: [
        './operation-sightings-search-form-presentational.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationSightingsSearchFormPresentationalComponent
    implements OnChanges {
    searchForm: FormGroup = this.fb.group({
        referenceDate: [null, Validators.required],
        days: [
            null,
            [Validators.required, Validators.min(1), Validators.max(30)],
        ],
    });
    maxDate = moment();

    @Input() referenceDate: Moment;
    @Input() days: number;
    @Output() clickSearch: EventEmitter<{
        referenceDate: Moment;
        days: number;
    }> = new EventEmitter<{
        referenceDate: Moment;
        days: number;
    }>();

    constructor(private fb: FormBuilder) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.referenceDate) {
            this.searchForm.get('referenceDate').setValue(this.referenceDate);
        }
        if (changes.days) {
            this.searchForm.get('days').setValue(this.days);
        }
    }

    onClickSearch(): void {
        this.clickSearch.emit(this.searchForm.value);
    }
}
