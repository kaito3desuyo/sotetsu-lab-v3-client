import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { PanelCardComponent } from 'src/app/shared/panel-card/panel-card.component';
import { SegmentToggleComponent } from 'src/app/shared/segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from 'src/app/shared/segment-toggle/segment-toggle-option.type';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';

type Form = FormGroup<{
    calendarId: FormControl<string>;
    tripDirection: FormControl<number>;
}>;

@Component({
    selector: 'app-timetable-post-card',
    templateUrl: './timetable-post-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatSelectModule,
        MatButtonModule,
        DateFnsPipe,
        AppButtonComponent,
        PanelCardComponent,
        SegmentToggleComponent,
    ],
})
export class TimetablePostCardComponent {
    readonly #fb = inject(FormBuilder).nonNullable;
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);

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

    readonly calendars = toSignal(inject(CalendarListStateQuery).calendars$);

    onTripDirectionChange(value: number): void {
        this.form.get('tripDirection').setValue(value);
    }

    submit(): void {
        const { calendarId, tripDirection } = this.form.getRawValue();
        notifyNavigationFailure(
            this.#router.navigate([
                'timetable',
                'add',
                { calendar_id: calendarId, trip_direction: tripDirection },
            ]),
            this.#notificationService,
        );
    }
}
