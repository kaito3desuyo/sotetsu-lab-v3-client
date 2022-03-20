import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RxState } from '@rx-angular/state';
import moment, { Moment } from 'moment';
import { Subject } from 'rxjs';

@Component({
    selector: 'app-operation-sightings-search-form-presentational',
    templateUrl:
        './operation-sightings-search-form-presentational.component.html',
    styleUrls: [
        './operation-sightings-search-form-presentational.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationSightingsSearchFormPresentationalComponent {
    readonly searchForm: FormGroup = this.fb.group({
        referenceDate: [null, Validators.required],
        days: [
            null,
            [Validators.required, Validators.min(1), Validators.max(30)],
        ],
    });
    readonly maxDate = moment();

    readonly onChangedInputReferenceDate$ = new Subject<string>();
    readonly onChangedInputDays$ = new Subject<number>();

    @Input() set referenceDate(date: string) {
        this.onChangedInputReferenceDate$.next(date);
    }
    @Input() set days(days: number) {
        this.onChangedInputDays$.next(days);
    }

    @Output() clickSearch: EventEmitter<{
        referenceDate: Moment;
        days: number;
    }> = new EventEmitter<{
        referenceDate: Moment;
        days: number;
    }>();

    constructor(private fb: FormBuilder, private readonly state: RxState<{}>) {
        this.state.hold(this.onChangedInputReferenceDate$, (date) => {
            this.searchForm
                .get('referenceDate')
                .setValue(moment(date, 'YYYY-MM-DD'));
        });

        this.state.hold(this.onChangedInputDays$, (days) => {
            this.searchForm.get('days').setValue(days);
        });
    }

    onClickSearch(): void {
        this.clickSearch.emit(this.searchForm.value);
    }
}
