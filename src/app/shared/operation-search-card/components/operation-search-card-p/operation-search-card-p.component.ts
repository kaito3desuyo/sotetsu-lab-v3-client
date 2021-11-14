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

type State = {
    calendars: CalendarDetailsDto[];
};

@Component({
    selector: 'app-operation-search-card-p',
    templateUrl: './operation-search-card-p.component.html',
    styleUrls: ['./operation-search-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class OperationSearchCardPComponent {
    calendarId: CalendarDetailsDto['calendarId'];

    readonly calendars$ = this.state.select('calendars');

    readonly onChangedInputCalendars$ = new Subject<CalendarDetailsDto[]>();
    readonly onChangedInputTodaysCalendarId$ = new Subject<
        CalendarDetailsDto['calendarId']
    >();

    @Input() set calendars(calendars: CalendarDetailsDto[]) {
        this.onChangedInputCalendars$.next(calendars);
    }
    @Input() set todaysCalendarId(
        calendarId: CalendarDetailsDto['calendarId']
    ) {
        this.onChangedInputTodaysCalendarId$.next(calendarId);
    }
    @Output() clickSearchOperationTable = new EventEmitter<
        CalendarDetailsDto['calendarId']
    >();

    constructor(private readonly state: RxState<State>) {
        this.state.connect('calendars', this.onChangedInputCalendars$);
        this.state.hold(this.onChangedInputTodaysCalendarId$, (calendarId) => {
            this.calendarId = calendarId;
        });
    }
}
