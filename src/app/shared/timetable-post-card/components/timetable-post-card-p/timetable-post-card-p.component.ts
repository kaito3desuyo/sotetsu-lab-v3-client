import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    inject,
    input,
    output,
} from '@angular/core';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { RxState } from '@rx-angular/state';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';

type Form = FormGroup<{
    calendarId: FormControl<string>;
    tripDirection: FormControl<number>;
}>;

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
        DateFnsPipe,
    ],
})
export class TimetablePostCardPComponent {
    readonly #fb = inject(FormBuilder).nonNullable;

    readonly form: Form = this.#fb.group({
        calendarId: this.#fb.control('', [Validators.required]),
        tripDirection: this.#fb.control(ETripDirection.INBOUND as number, [
            Validators.required,
        ]),
    });

    readonly calendars = input.required<CalendarDetailsDto[]>();

    readonly clickMoveTimetableAdd = output<ITimetablePostCardForm>();
}
