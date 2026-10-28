import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
} from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { safeReturnTo } from 'src/app/core/utils/return-to';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { UserState } from 'src/app/global-states/user.state';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { PanelCardComponent } from 'src/app/shared/panel-card/panel-card.component';
import { SegmentToggleComponent } from 'src/app/shared/segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from 'src/app/shared/segment-toggle/segment-toggle-option.type';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { LazyOptionsDirective } from 'src/app/shared/lazy-options/lazy-options.directive';

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
        RouterLink,
        DateFnsPipe,
        AppButtonComponent,
        PanelCardComponent,
        SegmentToggleComponent,
        LazyOptionsDirective,
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

    readonly calendars = inject(CalendarListState).calendars;

    /** 選んでいるダイヤ。選択肢を作る前（lazy-options）の select の表示に使う。 */
    readonly #selectedCalendarId = toSignal(
        this.form.controls.calendarId.valueChanges,
        { initialValue: this.form.controls.calendarId.value },
    );
    readonly selectedCalendar = computed(() =>
        this.calendars().find(
            (calendar) => calendar.calendarId === this.#selectedCalendarId(),
        ),
    );

    /** 時刻表の入力は編集者だけ。足りない人には入力欄の代わりに案内を出す */
    readonly canEditTimetable = inject(UserState).canEditTimetable;
    /** ゲストには、編集者かもしれないのでログインの入口も出す */
    readonly isLoggedIn = inject(UserState).isLoggedIn;

    /** 今の画面に戻ってくる先。router.url は signal ではないので、描き直しのたびに読む */
    returnTo(): string {
        return safeReturnTo(this.#router.url);
    }

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
