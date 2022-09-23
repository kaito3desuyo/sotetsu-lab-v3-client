import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';

type State = {
    calendars: CalendarDetailsDto[];
};

@Component({
    selector: 'app-timetable-post-card-p',
    templateUrl: './timetable-post-card-p.component.html',
    styleUrls: ['./timetable-post-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
})
export class TimetablePostCardPComponent {
    readonly form = this.fb.group({
        calendarId: ['', Validators.required],
        tripDirection: ['0', Validators.required],
    });

    readonly calendars$ = this.state.select('calendars');

    readonly onChangedInputCalendars$ = new Subject<CalendarDetailsDto[]>();

    readonly onClickedMoveTimetableAdd$ = new Subject<void>();

    @Input() set calendars(calendars: CalendarDetailsDto[]) {
        this.onChangedInputCalendars$.next(calendars);
    }

    @Output() clickMoveTimetableAdd =
        new EventEmitter<ITimetablePostCardForm>();

    constructor(
        private readonly fb: UntypedFormBuilder,
        private readonly state: RxState<State>
    ) {
        this.state.connect('calendars', this.onChangedInputCalendars$);
        this.state.hold(this.onClickedMoveTimetableAdd$, () => {
            this.clickMoveTimetableAdd.next(this.form.value);
        });
    }
}
