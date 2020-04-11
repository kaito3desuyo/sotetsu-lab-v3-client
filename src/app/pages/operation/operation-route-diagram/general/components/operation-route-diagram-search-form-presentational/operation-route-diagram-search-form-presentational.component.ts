import {
    Component,
    ChangeDetectionStrategy,
    Input,
    OnChanges,
    SimpleChanges,
    Output,
    EventEmitter,
    Inject,
    Injector,
} from '@angular/core';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import moment from 'moment';
import { FormBuilder, Validators } from '@angular/forms';
import { IOperation } from 'src/app/general/interfaces/operation';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
    selector: 'app-operation-route-diagram-search-form-presentational',
    templateUrl:
        './operation-route-diagram-search-form-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-search-form-presentational.component.scss',
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationRouteDiagramSearchFormPresentationalComponent
    extends BaseComponent
    implements OnChanges {
    @Input() calendars: ICalendar[];
    @Input() operations: IOperation[];
    @Output() changeCalendarId: EventEmitter<string> = new EventEmitter<
        string
    >();
    @Output() clickSearch: EventEmitter<string> = new EventEmitter<string>();

    calendarSelectList: { label: string; value: string }[] = [];
    operationSelectList: { label: string; value: string }[] = [];
    searchForm = this.fb.group({
        calendarId: ['', Validators.required],
        operationId: ['', Validators.required],
    });

    constructor(@Inject(Injector) injector: Injector, private fb: FormBuilder) {
        super(injector);
        this.subscription = this.searchForm
            .get('calendarId')
            .valueChanges.subscribe((v) => {
                this.changeCalendarId.emit(v);
                this.searchForm.get('operationId').reset('');
            });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.calendars) {
            this.calendarSelectList = this.calendars.map((o) => {
                return {
                    label: `${moment(o.startDate, 'YYYY-MM-DD').format(
                        'YYYY年MM月DD日'
                    )} 改正 ${o.calendarName}`,
                    value: o.id,
                };
            });
        }
        if (changes.operations) {
            this.operationSelectList = this.operations.map((o) => {
                return {
                    label: `${o.operationNumber}運`,
                    value: o.id,
                };
            });
        }
    }

    onClickSearch(): void {
        this.clickSearch.emit(this.searchForm.get('operationId').value);
    }
}
