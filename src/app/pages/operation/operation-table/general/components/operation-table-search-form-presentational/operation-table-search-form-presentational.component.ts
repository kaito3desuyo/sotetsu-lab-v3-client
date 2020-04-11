import {
    Component,
    Input,
    SimpleChanges,
    OnChanges,
    EventEmitter,
    Output,
} from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import moment from 'moment';

@Component({
    selector: 'app-operation-table-search-form-presentational',
    templateUrl: './operation-table-search-form-presentational.component.html',
    styleUrls: ['./operation-table-search-form-presentational.component.scss'],
})
export class OperationTableSearchFormPresentationalComponent
    implements OnChanges {
    @Input() calendars: ICalendar[];
    @Output() clickSearch: EventEmitter<string> = new EventEmitter();

    searchForm = this.fb.group({
        calendarId: ['', Validators.required],
    });
    calendarSelectList: { label: string; value: string }[] = [];

    constructor(private fb: FormBuilder) {}

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
    }

    onClickSearch(): void {
        this.clickSearch.emit(this.searchForm.get('calendarId').value);
    }
}
