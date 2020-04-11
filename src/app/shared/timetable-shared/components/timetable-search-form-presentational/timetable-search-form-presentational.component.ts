import {
    Component,
    OnInit,
    ChangeDetectionStrategy,
    Input,
    Output,
    EventEmitter,
    OnChanges,
    SimpleChanges,
    Inject,
    Injector,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ICalendar } from 'src/app/general/interfaces/calendar';
import { ITimetableSearchForm } from '../../interfaces/timetable-search-form';
import { BaseComponent } from 'src/app/general/classes/base-component';

@Component({
    selector: 'app-timetable-search-form-presentational',
    templateUrl: './timetable-search-form-presentational.component.html',
    styleUrls: ['./timetable-search-form-presentational.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimetableSearchFormPresentationalComponent extends BaseComponent
    implements OnChanges {
    searchTimetableForm = this.fb.group({
        calendarId: ['', Validators.required],
        tripDirection: ['0', Validators.required],
        isSearchStation: [false, Validators.required],
        stationId: [{ value: '', disabled: true }, Validators.required],
    });

    @Input() calendars: ICalendar[];
    @Input() params: ITimetableSearchForm;
    @Input() stationsSelectList: {
        routeName: string;
        stations: { label: string; value: string }[];
    }[];
    @Output() searchTimetable: EventEmitter<any> = new EventEmitter<any>();

    constructor(@Inject(Injector) injector: Injector, private fb: FormBuilder) {
        super(injector);
        if (this.searchTimetableForm.get('isSearchStation')) {
            this.subscription = this.searchTimetableForm
                .get('isSearchStation')
                .valueChanges.subscribe((bool) => {
                    if (bool) {
                        this.searchTimetableForm.get('stationId').enable();
                    } else {
                        this.searchTimetableForm.get('stationId').disable();
                    }
                });
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.params) {
            this.searchTimetableForm.patchValue(this.params);
        }
    }

    onClickSearch(): void {
        this.searchTimetable.emit(this.searchTimetableForm.value);
    }
}
