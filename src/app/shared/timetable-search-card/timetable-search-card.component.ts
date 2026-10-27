import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
} from '@angular/core';
import {
    takeUntilDestroyed,
    toObservable,
    toSignal,
} from '@angular/core/rxjs-interop';
import {
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { AppButtonComponent } from '../app-button/app-button.component';
import { PanelCardComponent } from '../panel-card/panel-card.component';
import { SegmentToggleComponent } from '../segment-toggle/segment-toggle.component';
import { SegmentToggleOption } from '../segment-toggle/segment-toggle-option.type';
import { buildStationGroups } from '../station-groups.util';

type Form = FormGroup<{
    calendarId: FormControl<string>;
    tripDirection: FormControl<number>;
    searchByStation: FormControl<boolean>;
    stationId: FormControl<string>;
}>;

@Component({
    selector: 'app-timetable-search-card',
    templateUrl: './timetable-search-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatSelectModule,
        MatSlideToggleModule,
        SegmentToggleComponent,
        PanelCardComponent,
        AppButtonComponent,
        DateFnsPipe,
    ],
})
export class TimetableSearchCardComponent {
    readonly #fb = inject(FormBuilder).nonNullable;
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);

    /** 表示中のダイヤ。渡さなければ今日のダイヤ（モック 10）。 */
    readonly calendarId = input<CalendarDetailsDto['calendarId'] | null>(null);
    readonly tripDirection = input<number>(ETripDirection.INBOUND);
    /** 表示中の駅。渡せば「駅を指定して検索する」を入れた状態で始める。 */
    readonly stationId = input<StationDetailsDto['stationId'] | null>(null);

    /** 上り/下り 全幅2セグメントトグルの選択肢（98 G0-3・モック10） */
    readonly tripDirectionOptions: readonly [
        SegmentToggleOption,
        SegmentToggleOption,
    ] = [
        { value: ETripDirection.INBOUND, label: '上り' },
        { value: ETripDirection.OUTBOUND, label: '下り' },
    ];

    readonly form: Form = this.#fb.group({
        calendarId: this.#fb.control('', [Validators.required]),
        tripDirection: this.#fb.control(ETripDirection.INBOUND as number, [
            Validators.required,
        ]),
        searchByStation: this.#fb.control(false, [Validators.required]),
        stationId: this.#fb.control('', [Validators.required]),
    });

    readonly selectedTripDirection = toSignal(
        this.form.get('tripDirection').valueChanges,
        { initialValue: this.form.get('tripDirection').value },
    );

    readonly calendars = inject(CalendarListState).calendars;
    readonly #routeStations = inject(RouteStationListState).routeStations;
    readonly #agencies = inject(AgencyListState).agencies;
    /** 駅 select の選択肢を「会社名 路線名」でまとめる（ユーザー指示 2026-09-23）。 */
    readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );
    readonly #todaysCalendarId = toSignal(
        inject(TodaysCalendarListStateQuery).todaysCalendarId$,
    );

    readonly #initialState = computed(() => ({
        calendarId: this.calendarId() || (this.#todaysCalendarId() ?? ''),
        tripDirection: this.tripDirection(),
        searchByStation: !!this.stationId(),
        stationId: this.stationId() ?? '',
    }));

    constructor() {
        this.form
            .get('searchByStation')
            .valueChanges.pipe(takeUntilDestroyed())
            .subscribe((bool) => {
                if (bool) {
                    this.form.get('stationId').enable();
                } else {
                    this.form.get('stationId').disable();
                }
            });

        toObservable(this.#initialState)
            .pipe(takeUntilDestroyed())
            .subscribe((state) => {
                this.form.patchValue(state);
            });
    }

    onTripDirectionChange(value: number): void {
        this.form.get('tripDirection').setValue(value);
    }

    submit(): void {
        const { calendarId, tripDirection, searchByStation, stationId } =
            this.form.getRawValue();
        const navigation = searchByStation
            ? this.#router.navigate([
                  'timetable',
                  'station',
                  {
                      calendar_id: calendarId,
                      station_id: stationId,
                      trip_direction: tripDirection,
                  },
              ])
            : this.#router.navigate([
                  'timetable',
                  'all-line',
                  {
                      calendar_id: calendarId,
                      trip_direction: tripDirection,
                  },
              ]);
        notifyNavigationFailure(navigation, this.#notificationService);
    }
}
