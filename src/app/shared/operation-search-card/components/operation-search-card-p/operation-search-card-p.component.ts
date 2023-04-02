import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type State = {
    calendarId: CalendarDetailsDto['calendarId'];
    operationId: OperationDetailsDto['operationId'];
    calendars: CalendarDetailsDto[];
    operations: OperationDetailsDto[];
};

@Component({
    selector: 'app-operation-search-card-p',
    templateUrl: './operation-search-card-p.component.html',
    styleUrls: ['./operation-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationSearchCardPComponent {
    _calendarId: CalendarDetailsDto['calendarId'] = null;
    _operationId: OperationDetailsDto['operationId'] = null;

    readonly vm$ = this.state.select();

    readonly onChangedInputCalendarId$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    readonly onChangedInputOperationId$ = new Subject<
        OperationDetailsDto['operationId']
    >();
    readonly onChangedInputCalendars$ = new Subject<CalendarDetailsDto[]>();
    readonly onChangedInputOperations$ = new Subject<OperationDetailsDto[]>();

    readonly onSelectedCalendarId$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();
    readonly onSelectedOperationId$ = new Subject<
        OperationDetailsDto['operationId']
    >();
    readonly onClickedSearch$ = new Subject<void>();

    @Input() set calendarId(calendarId: CalendarDetailsDto['calendarId']) {
        this.onChangedInputCalendarId$.next(calendarId);
    }
    @Input() set operationId(operationId: OperationDetailsDto['operationId']) {
        this.onChangedInputOperationId$.next(operationId);
    }
    @Input() set calendars(calendars: CalendarDetailsDto[]) {
        this.onChangedInputCalendars$.next(calendars);
    }
    @Input() set operations(operations: OperationDetailsDto[]) {
        this.onChangedInputOperations$.next(operations);
    }

    @Output() selectCalendarId = new EventEmitter<
        CalendarDetailsDto['calendarId']
    >();
    @Output() selectOperationId = new EventEmitter<
        OperationDetailsDto['operationId']
    >();
    @Output() clickSearch = new EventEmitter<void>();
    @Output() clickSearchOperationTable = new EventEmitter<
        CalendarDetailsDto['calendarId']
    >();

    constructor(private readonly state: RxState<State>) {
        this.state.connect(
            'calendarId',
            this.onChangedInputCalendarId$.asObservable()
        );
        this.state.connect(
            'operationId',
            this.onChangedInputOperationId$.asObservable()
        );
        this.state.connect(
            'calendars',
            this.onChangedInputCalendars$.asObservable()
        );
        this.state.connect(
            'operations',
            this.onChangedInputOperations$.asObservable()
        );

        this.state.hold(this.state.select('calendarId'), (calendarId) => {
            this._calendarId = calendarId;
        });
        this.state.hold(this.state.select('operationId'), (operationId) => {
            this._operationId = operationId;
        });

        this.state.hold(this.onSelectedCalendarId$, (event) => {
            this.selectCalendarId.emit(event);
        });
        this.state.hold(this.onSelectedOperationId$, (event) => {
            this.selectOperationId.emit(event);
        });
        this.state.hold(this.onClickedSearch$, () => {
            this.clickSearch.emit();
        });
    }
}
