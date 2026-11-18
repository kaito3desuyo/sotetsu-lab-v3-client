import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    PLATFORM_ID,
    computed,
    effect,
    inject,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { addDays, format, isValid, parseISO } from 'date-fns';
import { filter, lastValueFrom } from 'rxjs';
import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { NotificationService } from 'src/app/core/services/notification.service';
import { readSocketSignal } from 'src/app/core/services/socket-signal';
import { SocketService } from 'src/app/core/services/socket.service';
import { formatCalendarSummaryLabel } from 'src/app/core/utils/format-calendar-summary-label.util';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { railwayDateKey } from 'src/app/core/utils/railway-day';
import { CalendarListState } from 'src/app/global-states/calendar-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { NotFoundContentComponent } from 'src/app/shared/not-found-content/not-found-content.component';
import {
    parseDateKey,
    parseUuid,
    readUrlParam,
} from 'src/app/shared/url-params/url-param';
import { formatSightingClock } from '../timetable-formation/utils/formation-display.util';
import { TimetableOperationControlsComponent } from './components/timetable-operation-controls/timetable-operation-controls.component';
import { TimetableOperationHeaderComponent } from './components/timetable-operation-header/timetable-operation-header.component';
import { TimetableOperationTripListComponent } from './components/timetable-operation-trip-list/timetable-operation-trip-list.component';
import { TimetableOperationService } from './services/timetable-operation.service';
import {
    OperationViewKind,
    TimetableOperationStore,
} from './stores/timetable-operation.store';
import { computeOperationProgress } from './utils/operation-progress.util';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** 'yyyy-MM-dd' を日数ぶん動かす。読めない値は null */
function shiftDate(date: string, days: number): string | null {
    const parsed = parseISO(date);
    return isValid(parsed) ? format(addDays(parsed, days), 'yyyy-MM-dd') : null;
}

/**
 * 運用別時刻表。運用番号と、日付かダイヤ（マトリクスパラメータ）から、その運用の列車の並びと走った編成を出す。
 * 日付の形（date）はその日の記録、ダイヤの形（calendar_id）はそのダイヤでの並びだけ。両方あれば date を使う。
 * 今日はブラウザの時計で決める。サーバーは今日を知らないので、枠だけ返して取得しない（編成別時刻表と同じ）
 */
@Component({
    selector: 'app-timetable-operation',
    templateUrl: './timetable-operation.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        EmptyStateComponent,
        NotFoundContentComponent,
        TimetableOperationControlsComponent,
        TimetableOperationHeaderComponent,
        TimetableOperationTripListComponent,
    ],
})
export class TimetableOperationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #store = inject(TimetableOperationStore);
    readonly #service = inject(TimetableOperationService);
    readonly #socket = inject(SocketService);
    readonly #notification = inject(NotificationService);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #pageNotFound = inject(PageNotFound);
    readonly #stations = inject(RouteStationListState).stations;
    protected readonly calendars = inject(CalendarListState).calendars;

    /** URL の日付・ダイヤが読めない形のとき true（本体の代わりに見つからない表示を出す） */
    readonly notFound = signal(false);
    /** 現在時刻。ブラウザだけ 60 秒ごとに進める */
    readonly now = signal(new Date());
    readonly operationNumber = signal<string | null>(null);
    /** 日付の形の日。ダイヤの形では null */
    readonly date = signal<string | null>(null);
    /** ダイヤの形のダイヤ。日付の形では null */
    readonly urlCalendarId = signal<string | null>(null);

    readonly today = computed(() => railwayDateKey(this.now()));
    readonly viewKind = computed<OperationViewKind>(() => {
        const date = this.date();
        if (!date) return 'calendar';
        return date === this.today() ? 'today' : 'past';
    });

    protected readonly isLoading = this.#store.isLoading;
    protected readonly calendarId = computed(
        () => this.#store.calendar()?.calendarId,
    );

    /** ストアの中身が、いま URL で見ている運用・日（ダイヤ）のものか（前の訪問の残りを出さない） */
    protected readonly ready = computed(() => {
        const store = this.#store;
        if (store.operationNumber() !== (this.operationNumber() ?? '')) {
            return false;
        }
        if (store.viewKind() !== this.viewKind()) return false;
        return this.date()
            ? store.date() === this.date()
            : store.calendar()?.calendarId === this.urlCalendarId() ||
                  !store.loaded();
    });
    protected readonly rows = computed(() =>
        this.ready() ? this.#store.rows() : [],
    );
    protected readonly progress = computed(() =>
        computeOperationProgress(
            this.rows(),
            this.date(),
            this.viewKind(),
            this.now(),
        ),
    );
    protected readonly stationNames = computed(() =>
        Object.fromEntries(
            this.#stations().map((s) => [s.stationId, s.stationName]),
        ),
    );
    protected readonly stations = this.#stations;
    protected readonly operationNumbers = this.#store.operationNumbers;
    protected readonly operationId = computed(
        () => this.#store.operation()?.operationId ?? null,
    );
    protected readonly calendarLabel = computed(() => {
        const c = this.#store.calendar();
        return c ? formatCalendarSummaryLabel(c) : '';
    });

    /** いまの編成。走っている列車、無ければこれからの最初の列車、無ければ最後の列車の編成 */
    readonly #currentTrip = computed(() => {
        const rows = this.rows();
        const states = this.progress().states;
        const trips = rows
            .map((r, i) => ({ r, s: states[i] }))
            .filter(
                (
                    x,
                ): x is {
                    r: Extract<typeof x.r, { kind: 'trip' }>;
                    s: typeof x.s;
                } => x.r.kind === 'trip',
            );
        return (
            trips.find((x) => x.s === 'running') ??
            trips.find((x) => x.s === 'future') ??
            trips.at(-1)
        )?.r;
    });
    protected readonly currentFormationNumber = computed(
        () => this.#currentTrip()?.formationNumber ?? null,
    );
    protected readonly currentInferred = computed(
        () => this.#currentTrip()?.inferred ?? false,
    );
    protected readonly sightings = computed(() =>
        this.ready()
            ? this.#store.operationSightings().map((s) => ({
                  time: formatSightingClock(s.sightingTime),
                  formationNumber:
                      this.#store.formationNumberById()[s.formationId] ??
                      s.formation?.formationNumber ??
                      '',
              }))
            : [],
    );
    protected readonly tripClasses = computed(() => {
        const found = new Map<string, TripClassDetailsDto>();
        for (const row of this.rows()) {
            const tripClass = row.kind === 'trip' && row.trip.trip?.tripClass;
            if (tripClass) found.set(tripClass.tripClassId, tripClass);
        }
        return [...found.values()];
    });
    protected readonly position = computed(() =>
        this.ready() && this.viewKind() === 'today'
            ? this.#store.currentPosition()
            : null,
    );

    protected readonly band = viewChild.required(ControlBandComponent);

    protected readonly bandSummary = computed(() => {
        const number = this.operationNumber();
        const head = number ? `${number}運` : '運用番号を選ぶ';
        const date = this.date();
        if (date) {
            const [, m, d] = date.split('-').map(Number);
            return `${head} ${m}/${d}${this.viewKind() === 'today' ? '（今日）' : ''}`;
        }
        return `${head} ${this.calendarLabel()}`.trim();
    });

    protected readonly view = computed(() => {
        const store = this.#store;
        if (!this.operationNumber()) return 'noNumber';
        if (!this.ready() || !store.loaded()) return 'loading';
        if (store.loadError()) return 'error';
        if (!store.calendar()) return 'noCalendar';
        if (!store.operation()) return 'noOperation';
        if (this.rows().length === 0) return 'noTrips';
        return 'trips';
    });

    protected readonly showHeader = computed(
        () => this.view() === 'trips' || this.view() === 'noTrips',
    );

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const operationNumber =
                    paramMap.get('operation_number')?.trim() || null;
                const dateParam = readUrlParam(
                    paramMap.get('date'),
                    parseDateKey,
                );
                const calendarParam = readUrlParam(
                    paramMap.get('calendar_id'),
                    parseUuid,
                );
                // 値があるのに読めない日付・ダイヤは、見つからない表示にして取得しない
                if (
                    dateParam.kind === 'invalid' ||
                    (dateParam.kind !== 'ok' &&
                        calendarParam.kind === 'invalid')
                ) {
                    this.operationNumber.set(operationNumber);
                    this.notFound.set(true);
                    this.#pageNotFound.mark();
                    return;
                }
                if (this.notFound()) {
                    this.notFound.set(false);
                    this.#pageNotFound.clear();
                }
                const date = dateParam.kind === 'ok' ? dateParam.value : null;
                const calendarId =
                    !date && calendarParam.kind === 'ok'
                        ? calendarParam.value
                        : null;
                this.operationNumber.set(operationNumber);
                this.urlCalendarId.set(calendarId);
                if (this.#isServer) {
                    this.date.set(date);
                    return;
                }
                // 日付もダイヤも無い・先の日は、今日の日付の形に置き換える
                if ((!date && !calendarId) || (date && date > this.today())) {
                    this.#navigate(
                        { operationNumber, date: this.today() },
                        true,
                    );
                    return;
                }
                this.date.set(date);
                void this.#fetch(false);
            });

        if (this.#isServer) return;

        const timer = setInterval(() => this.now.set(new Date()), 60_000);
        this.#destroyRef.onDestroy(() => clearInterval(timer));

        // 他の人の目撃を受けたら、今日のときだけ目撃を取り直す
        this.#socket
            .on()
            .pipe(
                filter((ev) => readSocketSignal(ev) !== null),
                filter(() => this.ready() && this.viewKind() === 'today'),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe(
                () => void lastValueFrom(this.#service.refetchSightings()),
            );
        this.#socket
            .resync()
            .pipe(
                filter(() => this.ready() && this.viewKind() === 'today'),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe(
                () => void lastValueFrom(this.#service.refetchSightings()),
            );

        // いまの位置（今日だけ。時計が進むたびに取り直す）
        effect(() => {
            this.now();
            const running = this.progress().runningIndex >= 0;
            if (!this.ready() || !this.#store.loaded()) return;
            if (this.viewKind() !== 'today') return;
            untracked(() => {
                if (running) this.#service.fetchCurrentPosition().subscribe();
                else this.#store.setCurrentPosition(null);
            });
        });
    }

    async #fetch(forceReload: boolean): Promise<void> {
        try {
            await lastValueFrom(
                this.#service.fetch({
                    operationNumber: this.operationNumber() ?? '',
                    date: this.date(),
                    calendarId: this.urlCalendarId(),
                    viewKind: this.viewKind(),
                    ...(forceReload ? { forceReload: true } : {}),
                }),
            );
        } catch (error) {
            console.error(error);
            this.#store.setLoadError(true);
            this.#store.setLoaded(true);
        }
    }

    #navigate(
        to: {
            operationNumber: string | null;
            date?: string;
            calendarId?: string;
        },
        replaceUrl: boolean,
    ): void {
        const params = {
            ...(to.operationNumber
                ? { operation_number: to.operationNumber }
                : {}),
            ...(to.date ? { date: to.date } : {}),
            ...(!to.date && to.calendarId
                ? { calendar_id: to.calendarId }
                : {}),
        };
        const commands = ['timetable', 'operation', params];
        const navigation = replaceUrl
            ? this.#router.navigate(commands, { replaceUrl: true })
            : this.#router.navigate(commands);
        notifyNavigationFailure(navigation, this.#notification);
    }

    /** 今と同じ日付・ダイヤのまま、運用番号を替える */
    onOperationNumberChange(operationNumber: string): void {
        if (!operationNumber || operationNumber === this.operationNumber()) {
            return;
        }
        this.#navigate(
            {
                operationNumber,
                date: this.date() ?? undefined,
                calendarId: this.urlCalendarId() ?? undefined,
            },
            false,
        );
    }

    onDateChange(date: string): void {
        if (!DATE_PATTERN.test(date) || date > this.today()) return;
        if (date === this.date()) return;
        this.#navigate(
            { operationNumber: this.operationNumber(), date },
            false,
        );
    }

    onShift(delta: -1 | 1): void {
        const next = shiftDate(this.date() ?? this.today(), delta);
        if (next) this.onDateChange(next);
    }

    onCalendarChange(calendarId: string): void {
        if (!calendarId || calendarId === this.urlCalendarId()) return;
        this.#navigate(
            { operationNumber: this.operationNumber(), calendarId },
            false,
        );
    }

    /** 見ている日のダイヤの形へ移る */
    onViewByCalendar(): void {
        const calendarId = this.calendarId();
        if (!calendarId) return;
        this.#navigate(
            { operationNumber: this.operationNumber(), calendarId },
            false,
        );
    }

    reload(): void {
        void this.#fetch(true);
    }
}
