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
import { MatSelectModule } from '@angular/material/select';
import { toSignal } from '@angular/core/rxjs-interop';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { PanelCardComponent } from 'src/app/shared/panel-card/panel-card.component';
import { SegmentToggleComponent } from 'src/app/shared/segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from 'src/app/shared/segment-toggle/segment-toggle-option.type';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { ITimetablePostCardForm } from '../../interfaces/timetable-post-card-form.interface';

type Form = FormGroup<{
    calendarId: FormControl<string>;
    tripDirection: FormControl<number>;
}>;

@Component({
    selector: 'app-timetable-post-card-p',
    templateUrl: './timetable-post-card-p.component.html',
    styleUrls: ['./timetable-post-card-p.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatSelectModule,
        MatButtonModule,
        DateFnsPipe,
        AppButtonComponent,
        PanelCardComponent,
        SegmentToggleComponent,
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

    /** 上り/下り 全幅2セグメントトグルの選択肢（時刻表検索カードと同じ） */
    readonly tripDirectionOptions: readonly [
        SegmentToggleOption,
        SegmentToggleOption,
    ] = [
        { value: ETripDirection.INBOUND, label: '上り' },
        { value: ETripDirection.OUTBOUND, label: '下り' },
    ];

    readonly tripDirection = toSignal(
        this.form.get('tripDirection').valueChanges,
        { initialValue: this.form.get('tripDirection').value },
    );

    readonly calendars = input.required<CalendarDetailsDto[]>();

    readonly clickMoveTimetableAdd = output<ITimetablePostCardForm>();

    onTripDirectionChange(value: number): void {
        this.form.get('tripDirection').setValue(value);
    }
}
