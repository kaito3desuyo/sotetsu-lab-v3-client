import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { RxState } from '@rx-angular/state';
import { ForModule } from '@rx-angular/template/for';
import { IfModule } from '@rx-angular/template/if';
import { LetModule } from '@rx-angular/template/let';
import { Subject } from 'rxjs';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';

type State = {
    calendarId: CalendarDetailsDto['calendarId'];
    operationId: OperationDetailsDto['operationId'];
    calendars: CalendarDetailsDto[];
    operations: OperationDetailsDto[];
};

@Component({
    standalone: true,
    selector: 'app-operation-search-card-p',
    templateUrl: './operation-search-card-p.component.html',
    styleUrls: ['./operation-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule,
        MatFormFieldModule,
        MatSelectModule,
        MatButtonModule,
        MatRippleModule,
        PipesModule,
        LetModule,
        ForModule,
        IfModule,
    ],
})
export class OperationSearchCardPComponent {
    private readonly state = inject<RxState<State>>(RxState);

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

    constructor() {
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
        this.state.hold(this.onSelectedCalendarId$.asObservable(), (event) => {
            this.selectCalendarId.emit(event);
        });
        this.state.hold(this.onSelectedOperationId$.asObservable(), (event) => {
            this.selectOperationId.emit(event);
        });
        this.state.hold(this.onClickedSearch$.asObservable(), () => {
            this.clickSearch.emit();
        });
    }
}
