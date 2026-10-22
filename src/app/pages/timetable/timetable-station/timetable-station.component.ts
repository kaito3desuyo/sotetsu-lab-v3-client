import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { NotificationService } from 'src/app/core/services/notification.service';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { parseTripDirectionParam } from 'src/app/shared/trip-direction-param.util';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { SegmentToggleOption } from 'src/app/shared/segment-toggle/segment-toggle-option.type';
import { SegmentToggleComponent } from 'src/app/shared/segment-toggle/segment-toggle.component';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';
import { buildStationGroups } from 'src/app/shared/station-groups.util';
import { TimetableSearchCardComponent } from 'src/app/shared/timetable-search-card/timetable-search-card.component';
import { TimetableStationTableComponent } from './components/timetable-station-table/timetable-station-table.component';
import { TimetableStationService } from './services/timetable-station.service';
import { TimetableStationStore } from './stores/timetable-station.store';
import { formatTimetableStationSummary } from './utils/timetable-station-summary.util';

// チャンク再入時に前回のフェッチ失敗で loadingQueue が残留するのを防ぐ（operation-real-time と同一パターン）
TimetableStationStore.resetLoading();

// 取得の世代番号。ストアと同じくモジュールに置き、ページのインスタンスをまたいで一意にする
// （離れてすぐ戻ったとき、前のインスタンスの取得の終わりが新しい骨組みを消さないように）
let fetchSeq = 0;

@Component({
    selector: 'app-timetable-station',
    templateUrl: './timetable-station.component.html',
    styleUrl: './timetable-station.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatFormFieldModule,
        MatProgressBarModule,
        MatSelectModule,
        DateFnsPipe,
        ControlBandComponent,
        EmptyStateComponent,
        SegmentToggleComponent,
        SkeletonBarComponent,
        TimetableStationTableComponent,
        TimetableSearchCardComponent,
    ],
})
export class TimetableStationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #notificationService = inject(NotificationService);
    readonly #timetableStationService = inject(TimetableStationService);
    readonly #todaysCalendarListStateQuery = inject(
        TodaysCalendarListStateQuery,
    );
    readonly #calendarListStateQuery = inject(CalendarListStateQuery);
    readonly #routeStationListStateQuery = inject(RouteStationListStateQuery);
    readonly #agencyListStateQuery = inject(AgencyListStateQuery);

    readonly calendars = toSignal(this.#calendarListStateQuery.calendars$, {
        initialValue: [],
    });
    readonly stationOptions = toSignal(
        this.#routeStationListStateQuery.stations$,
        { initialValue: [] },
    );
    readonly #routeStations = toSignal(
        this.#routeStationListStateQuery.routeStations$,
        { initialValue: [] },
    );
    readonly #agencies = toSignal(this.#agencyListStateQuery.agencies$, {
        initialValue: [],
    });

    /** 駅 select の選択肢（「会社名 路線名」でまとめる。検索カードと共通）。 */
    readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );

    /** 上り/下り 全幅2セグメントトグルの選択肢（98 G0-3・mockup-01） */
    readonly tripDirectionOptions: readonly [
        SegmentToggleOption,
        SegmentToggleOption,
    ] = [
        { value: ETripDirection.INBOUND, label: '上り' },
        { value: ETripDirection.OUTBOUND, label: '下り' },
    ];

    readonly isLoading = toSignal(TimetableStationStore.isLoading$);
    readonly hasFetchedTimetable = toSignal(
        TimetableStationStore.hasFetchedTimetable$,
        { initialValue: false },
    );
    /** 骨組みの時の行の数と、1 行の列車のセルの数 */
    readonly skeletonHours = Array.from({ length: 4 }, (_, i) => i);
    readonly skeletonCells = Array.from({ length: 6 }, (_, i) => i);
    readonly calendarId = toSignal(TimetableStationStore.calendarId$);
    readonly stationId = toSignal(TimetableStationStore.stationId$);
    readonly tripDirection = toSignal(TimetableStationStore.tripDirection$);
    readonly calendar = toSignal(TimetableStationStore.calendar$);
    readonly timetableData = toSignal(TimetableStationStore.timetableData$, {
        initialValue: [],
    });
    readonly todaysCalendarIds = toSignal(
        this.#todaysCalendarListStateQuery.todaysCalendarIds$,
        { initialValue: [] as string[] },
    );

    /**
     * B7: 表示中 calendar が「今日有効なダイヤ集合」に含まれるか。
     * resolver/ストアに新規状態を足さず、コンポーネント内の派生値として持つ。
     */
    readonly isTodaysCalendar = computed(() => {
        const calendarId = this.calendarId();
        return !!calendarId && this.todaysCalendarIds().includes(calendarId);
    });

    /** ダイヤ select の選択中表示（改正日 + ダイヤ名）に使う。 */
    readonly selectedCalendar = computed(() =>
        this.calendars().find(
            (calendar) => calendar.calendarId === this.calendarId(),
        ),
    );

    readonly isEmpty = computed(
        () => !!this.calendar() && this.timetableData().length === 0,
    );

    /** 細帯の要約（絞り込みはこのページに無いので常に表示）。 */
    readonly bandSummary = computed(() =>
        formatTimetableStationSummary({
            stationName: this.stationOptions().find(
                (station) => station.stationId === this.stationId(),
            )?.stationName,
            calendar: this.selectedCalendar(),
            directionLabel: this.tripDirectionOptions.find(
                (option) => option.value === this.tripDirection(),
            )?.label,
        }),
    );

    /** G12: 空状態の次アクション（反対方向へ切り替え）に使う方向・ラベル（mockup-07 準拠）。 */
    readonly oppositeDirection = computed(() =>
        this.tripDirection() === ETripDirection.INBOUND
            ? ETripDirection.OUTBOUND
            : ETripDirection.INBOUND,
    );
    readonly oppositeDirectionActionLabel = computed(
        () =>
            `${this.oppositeDirection() === ETripDirection.OUTBOUND ? '下り' : '上り'}時刻表を表示する`,
    );

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const rawCalendarId = paramMap.get('calendar_id');
                const rawStationId = paramMap.get('station_id');
                // 読めない向き（"abc" など）は、無いときと同じ扱いにする
                const tripDirection = parseTripDirectionParam(
                    paramMap.get('trip_direction'),
                );

                // 既定表示（mockup-01）: パラメータ不足時は 横浜 / 今日のダイヤ / 上り へ補完
                if (!rawCalendarId || !rawStationId || tripDirection === null) {
                    const defaultCalendarId =
                        rawCalendarId ??
                        this.#todaysCalendarListStateQuery.todaysCalendarId;
                    const defaultStationId =
                        rawStationId ??
                        this.stationOptions().find(
                            (s) => s.stationName === '横浜',
                        )?.stationId ??
                        this.stationOptions()[0]?.stationId;
                    const defaultTripDirection = String(
                        tripDirection ?? ETripDirection.INBOUND,
                    );

                    if (defaultCalendarId && defaultStationId) {
                        this.#router.navigate(
                            [
                                'timetable',
                                'station',
                                {
                                    calendar_id: defaultCalendarId,
                                    station_id: defaultStationId,
                                    trip_direction: defaultTripDirection,
                                },
                            ],
                            { replaceUrl: true },
                        );
                        return;
                    }
                }

                const calendarId = rawCalendarId;
                const stationId = rawStationId;

                TimetableStationStore.setCalendarId(calendarId);
                TimetableStationStore.setStationId(stationId);
                TimetableStationStore.setTripDirection(tripDirection);

                this.fetchData();
            });
    }

    async fetchData(): Promise<void> {
        const seq = ++fetchSeq;
        TimetableStationStore.enableLoading();
        TimetableStationStore.setHasFetchedTimetable(false);

        try {
            // 互いに依存しないので並行に取る（以前は 1 本ずつ待っていた）
            await Promise.all([
                lastValueFrom(this.#timetableStationService.fetchCalendar()),
                lastValueFrom(this.#timetableStationService.fetchTrips()),
                lastValueFrom(this.#timetableStationService.fetchTripClasses()),
                lastValueFrom(this.#timetableStationService.fetchStations()),
                lastValueFrom(this.#timetableStationService.fetchOperations()),
            ]);
            // 時刻表はここで描ける。充当編成はセルの中だけなので、待たずに出す
            // 古い取得が先に終わっても骨組みを消さない（いちばん新しい取得だけが true にする）
            if (seq === fetchSeq) {
                TimetableStationStore.setHasFetchedTimetable(true);
            }

            // 充当編成は列車の運用番号とダイヤ（今日かどうか）が揃ってから取る。
            // B7: 過去ダイヤ表示時は編成関連のフェッチ自体をスキップする
            if (this.isTodaysCalendar()) {
                await lastValueFrom(
                    this.#timetableStationService.fetchOperationSightingTimeCrossSections(),
                );
            } else {
                TimetableStationStore.resetOperationSightingTimeCrossSections();
            }
        } finally {
            // 途中の reject でローディングバーと骨組みが永久残留しないことを保証する
            if (seq === fetchSeq) {
                TimetableStationStore.setHasFetchedTimetable(true);
            }
            TimetableStationStore.disableLoading();
        }
    }

    onStationChange(stationId: string): void {
        if (stationId === this.stationId()) return;
        const navigation = this.#router.navigate([
            'timetable',
            'station',
            {
                calendar_id: this.calendarId(),
                station_id: stationId,
                trip_direction: this.tripDirection(),
            },
        ]);
        this.#handleNavigationResult(navigation);
    }

    onCalendarChange(calendarId: string): void {
        if (calendarId === this.calendarId()) return;
        const navigation = this.#router.navigate([
            'timetable',
            'station',
            {
                calendar_id: calendarId,
                station_id: this.stationId(),
                trip_direction: this.tripDirection(),
            },
        ]);
        this.#handleNavigationResult(navigation);
    }

    onDirectionChange(value: number | string): void {
        const tripDirection = Number(value) as ETripDirection;
        if (tripDirection === this.tripDirection()) return;

        const navigation = this.#router.navigate([
            'timetable',
            'station',
            {
                calendar_id: this.calendarId(),
                station_id: this.stationId(),
                trip_direction: tripDirection,
            },
        ]);

        this.#handleNavigationResult(navigation);
    }

    #handleNavigationResult(navigation: Promise<boolean>): void {
        navigation
            .then((succeeded) => {
                if (!succeeded) {
                    console.error('timetable navigation did not complete');
                    this.#notificationService.open(
                        'ページの遷移に失敗しました',
                        'OK',
                    );
                }
            })
            .catch((error) => {
                console.error('timetable navigation failed', error);
                this.#notificationService.open(
                    'ページの遷移に失敗しました',
                    'OK',
                );
            });
    }
}
