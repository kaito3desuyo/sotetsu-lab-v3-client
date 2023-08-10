import { RxLet } from '@rx-angular/template/let';
import { RxIf } from '@rx-angular/template/if';
import { RxFor } from '@rx-angular/template/for';
import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
    inject,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RxState } from '@rx-angular/state';
import { Subject } from 'rxjs';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';

type State = {
    calendars: CalendarDetailsDto[];
};

@Component({
    standalone: true,
    selector: 'app-timetable-post-card-p',
    templateUrl: './timetable-post-card-p.component.html',
    styleUrls: ['./timetable-post-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [RxState],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatSelectModule,
        MatRadioModule,
        MatButtonModule,
        PipesModule,
        RxLet,
        RxFor,
        RxIf,
    ],
})
export class TimetablePostCardPComponent {
    private readonly fb = inject(FormBuilder);
    private readonly state = inject<RxState<State>>(RxState);

    readonly form = this.fb.nonNullable.group({
        calendarId: ['', Validators.required],
        tripDirection: ['0', Validators.required],
    });

    readonly vm$ = this.state.select();

    readonly onChangedInputCalendars$ = new Subject<CalendarDetailsDto[]>();

    readonly onClickedMoveTimetableAdd$ = new Subject<ITimetablePostCardForm>();

    @Input() set calendars(calendars: CalendarDetailsDto[]) {
        this.onChangedInputCalendars$.next(calendars);
    }

    @Output() clickMoveTimetableAdd =
        new EventEmitter<ITimetablePostCardForm>();

    constructor() {
        this.state.connect(
            'calendars',
            this.onChangedInputCalendars$.asObservable()
        );

        this.state.hold(this.onClickedMoveTimetableAdd$.asObservable(), () => {
            this.clickMoveTimetableAdd.next(this.form.value);
        });
    }
}
