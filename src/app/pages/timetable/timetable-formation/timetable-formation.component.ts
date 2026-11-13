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
import { NotificationService } from 'src/app/core/services/notification.service';
import { readSocketSignal } from 'src/app/core/services/socket-signal';
import { SocketService } from 'src/app/core/services/socket.service';
import { railwayDateKey } from 'src/app/core/utils/railway-day';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { RouteStationListState } from 'src/app/global-states/route-station-list.state';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { formatFormationAnnotation } from 'src/app/shared/formation-annotation.util';
import { OperationPostDialogService } from 'src/app/shared/operation-post-dialog/operation-post-dialog.service';
import { buildStationGroups } from 'src/app/shared/station-groups.util';
import { TimetableFormationControlsComponent } from './components/timetable-formation-controls/timetable-formation-controls.component';
import { TimetableFormationHeaderComponent } from './components/timetable-formation-header/timetable-formation-header.component';
import { TimetableFormationStationListComponent } from './components/timetable-formation-station-list/timetable-formation-station-list.component';
import { TimetableFormationTripListComponent } from './components/timetable-formation-trip-list/timetable-formation-trip-list.component';
import { TimetableFormationService } from './services/timetable-formation.service';
import {
    FormationDateKind,
    TimetableFormationStore,
} from './stores/timetable-formation.store';
import { basisAt, operationChain } from './utils/formation-day.util';
import {
    formatSightingClock,
    formationBasisLabel,
    isInferredBasis,
} from './utils/formation-display.util';
import { formatFormationBandSummary } from './utils/formation-band-summary.util';
import { computeProgress } from './utils/formation-progress.util';
import { filterByStation } from './utils/formation-station-filter.util';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const dateKey = (date: Date): string => format(date, 'yyyy-MM-dd');

/** 'yyyy-MM-dd' を日数ぶん動かす。読めない値は null */
function shiftDate(date: string, days: number): string | null {
    const parsed = parseISO(date);
    return isValid(parsed) ? dateKey(addDays(parsed, days)) : null;
}

/**
 * 編成別時刻表。編成番号と日付（マトリクスパラメータ）から、その編成がその日に入る列車を並べる。
 * 今日・明日はブラウザの時計で決める。サーバーは今日を知らないので、枠だけ返して取得しない（SSR は長く残る）。
 */
@Component({
    selector: 'app-timetable-formation',
    templateUrl: './timetable-formation.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        EmptyStateComponent,
        TimetableFormationControlsComponent,
        TimetableFormationHeaderComponent,
        TimetableFormationStationListComponent,
        TimetableFormationTripListComponent,
    ],
})
export class TimetableFormationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #store = inject(TimetableFormationStore);
    readonly #service = inject(TimetableFormationService);
    readonly #socket = inject(SocketService);
    readonly #postDialog = inject(OperationPostDialogService);
    readonly #notification = inject(NotificationService);
    readonly #agencies = inject(AgencyListState).agencies;
    protected readonly agencies = this.#agencies;
    /** 編成番号の欄の候補（今日の編成。会社の順・番号順） */
    protected readonly formationOptions = inject(TodaysFormationListState)
        .todaysFormationsSorted;
    readonly #routeStations = inject(RouteStationListState).routeStations;
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));

    /** 現在時刻。ブラウザだけ 60 秒ごとに進める（サーバーは固定） */
    readonly now = signal(new Date());
    readonly formationNumber = signal<string | null>(null);
    readonly date = signal<string | null>(null);

    readonly today = computed(() => railwayDateKey(this.now()));
    readonly tomorrow = computed(() => shiftDate(this.today(), 1));

    protected readonly isLoading = this.#store.isLoading;
    protected readonly dateKind = this.#store.dateKind;
    protected readonly selectedStationId = this.#store.selectedStationId;
    protected readonly calendarId = computed(
        () => this.#store.calendar()?.calendarId,
    );

    /** ストアの中身が、いま URL で見ている編成・日のものか（前の訪問の残りを出さない） */
    protected readonly ready = computed(
        () =>
            this.#store.formationNumber() === this.formationNumber() &&
            this.#store.date() === this.date() &&
            this.date() !== null,
    );
    protected readonly rows = computed(() =>
        this.ready() ? this.#store.rows() : [],
    );
    protected readonly progress = computed(() =>
        computeProgress(
            this.rows(),
            this.date() ?? this.today(),
            this.dateKind(),
            this.now(),
        ),
    );
    protected readonly stationNames = computed(() =>
        Object.fromEntries(
            this.#store.stations().map((s) => [s.stationId, s.stationName]),
        ),
    );
    protected readonly stationGroups = computed(() =>
        buildStationGroups(this.#routeStations(), this.#agencies()),
    );
    protected readonly selectedStationName = computed(
        () => this.stationNames()[this.selectedStationId() ?? ''] ?? null,
    );
    protected readonly annotation = computed(() =>
        formatFormationAnnotation(
            this.#store.formation() ?? undefined,
            this.#agencies(),
        ),
    );

    protected readonly stationSummary = computed(() => {
        const stationId = this.selectedStationId();
        const date = this.date();
        if (!this.ready() || !stationId || !date) return null;
        return filterByStation(
            this.rows(),
            stationId,
            date,
            this.dateKind() === 'past' ? null : this.now(),
        );
    });

    /** いまの運用を決めた根拠（目撃・ダイヤの乗り移り・順送り・同日引き継ぎ・不明） */
    protected readonly currentBasis = computed(() =>
        basisAt(
            this.rows(),
            this.progress().currentIndex,
            this.#store.firstBasis(),
        ),
    );
    protected readonly currentOperationNumber = computed(() => {
        if (this.currentBasis() === 'unknown') return null;
        const row = this.rows()[this.progress().currentIndex];
        return row?.kind === 'trip' && row.operationNumber
            ? row.operationNumber
            : null;
    });
    /** その日にたどった運用（「16K → 15K」）。いまの運用が不明なら出さない */
    protected readonly operationChain = computed(() =>
        this.currentBasis() === 'unknown'
            ? []
            : operationChain(this.rows(), this.#store.firstBasis()),
    );
    protected readonly currentBasisLabel = computed(() =>
        this.rows().length > 0
            ? formationBasisLabel[this.currentBasis()]
            : null,
    );
    protected readonly currentInferred = computed(() =>
        isInferredBasis(this.currentBasis()),
    );
    protected readonly sightings = computed(() =>
        this.ready()
            ? this.#store.todaysSightings().map((s) => ({
                  time: formatSightingClock(s.sightingTime),
                  operationNumber:
                      s.operation?.operationNumber ??
                      this.#store.tripsByOperationId()[s.operationId ?? '']
                          ?.operation?.operationNumber ??
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

    /** 明日の見込み（今日の画面で、明日が順送りで決まるときだけ） */
    protected readonly tomorrowOperationNumber = computed(() =>
        this.ready() && this.#store.canSelectTomorrow()
            ? this.#store.tomorrowOperationNumber()
            : null,
    );
    protected readonly tomorrowOperationId = computed(() =>
        this.tomorrowOperationNumber()
            ? this.#store.tomorrowOperationId()
            : null,
    );
    /** 運用番号 → 運用 ID。チップを行路図へのリンクにする */
    protected readonly operationIdByNumber = this.#store.operationIdByNumber;
    protected readonly tomorrowBlocked = computed(() => {
        if (!this.ready() || !this.#store.loaded() || this.#store.loadError()) {
            return false;
        }
        if (!this.#store.formation() || !this.#store.calendar()) return false;
        return this.dateKind() === 'today'
            ? !this.#store.canSelectTomorrow()
            : this.dateKind() === 'tomorrow' && !this.#store.firstOperationId();
    });
    protected readonly canGoNext = computed(() => {
        const kind = this.dateKind();
        if (!this.ready() || kind === 'tomorrow') return false;
        return kind === 'today' ? this.#store.canSelectTomorrow() : true;
    });
    protected readonly maxDate = computed(() =>
        this.dateKind() === 'tomorrow' || this.#store.canSelectTomorrow()
            ? this.tomorrow()
            : this.today(),
    );

    /** 走っている列車の運用（推定の列車は見ない）。いまの位置を問い合わせる相手 */
    readonly #runningOperationId = computed(() => {
        const row = this.rows()[this.progress().runningIndex];
        return row?.kind === 'trip' && !row.estimated ? row.operationId : null;
    });

    protected readonly band = viewChild.required(ControlBandComponent);

    /**
     * 編成のカード・駅の欄・絞り込みの印を出してよいか。ストアには前の編成の中身と駅が残るので、
     * URL の編成・日と合っていて、編成が見つかったときだけ出す。
     */
    protected readonly showDay = computed(
        () => this.ready() && this.#store.loaded() && !!this.#store.formation(),
    );

    protected readonly bandSummary = computed(() =>
        formatFormationBandSummary({
            formationNumber: this.formationNumber(),
            date: this.date(),
            dateKind: this.dateKind(),
            stationName: this.selectedStationName(),
        }),
    );

    protected readonly view = computed(() => {
        const store = this.#store;
        if (!this.formationNumber()) return 'noNumber';
        if (!this.ready() || !store.loaded()) return 'loading';
        if (store.loadError()) return 'error';
        if (!store.formation()) return 'notFound';
        if (!store.calendar()) return 'noCalendar';
        if (this.rows().length === 0 && this.dateKind() !== 'tomorrow') {
            return 'noSighting';
        }
        return this.stationSummary() ? 'station' : 'trips';
    });

    protected readonly storeFormation = this.#store.formation;
    protected readonly position = computed(() =>
        this.ready() && this.dateKind() === 'today'
            ? this.#store.currentPosition()
            : null,
    );
    protected readonly links = this.#store.links;
    protected readonly stations = this.#store.stations;

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const formationNumber =
                    paramMap.get('formation_number')?.trim() || null;
                const raw = paramMap.get('date');
                const date =
                    raw && DATE_PATTERN.test(raw) && isValid(parseISO(raw))
                        ? raw
                        : null;
                this.formationNumber.set(formationNumber);
                // サーバーは今日を知らないので、補わず取得もしない
                if (this.#isServer) {
                    this.date.set(date);
                    return;
                }
                // 日付が無い・読めない・明後日より先は、今日に置き換える
                const tomorrow = this.tomorrow();
                if (!date || (tomorrow && date > tomorrow)) {
                    this.#navigate(formationNumber, this.today(), true);
                    return;
                }
                this.date.set(date);
                if (formationNumber) void this.#fetch(false);
            });

        if (this.#isServer) return;

        const timer = setInterval(() => this.now.set(new Date()), 60_000);
        this.#destroyRef.onDestroy(() => clearInterval(timer));

        // 他の人の目撃・時刻表の変更を受けたら、今日のときだけ目撃を取り直す
        this.#socket
            .on()
            .pipe(
                filter((ev) => readSocketSignal(ev) !== null),
                filter(() => this.ready() && this.dateKind() === 'today'),
                takeUntilDestroyed(this.#destroyRef),
            )
            .subscribe(
                () => void lastValueFrom(this.#service.refetchSightings()),
            );

        // いまの位置は、走っている列車の運用で問い合わせる（今日だけ。時計が進むたびに取り直す）
        effect(() => {
            this.now();
            const id = this.#runningOperationId();
            if (!this.ready() || !this.#store.loaded()) return;
            if (this.dateKind() !== 'today') return;
            untracked(() => {
                if (id) this.#service.fetchCurrentPosition(id).subscribe();
                else this.#store.setCurrentPosition(null);
            });
        });
    }

    async #fetch(forceReload: boolean): Promise<void> {
        const formationNumber = this.formationNumber();
        const date = this.date();
        if (!formationNumber || !date) return;
        const dateKind: FormationDateKind =
            date === this.today()
                ? 'today'
                : date === this.tomorrow()
                  ? 'tomorrow'
                  : 'past';
        try {
            await lastValueFrom(
                this.#service.fetchDay({
                    formationNumber,
                    date,
                    dateKind,
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
        formationNumber: string | null,
        date: string,
        replaceUrl: boolean,
    ): void {
        const params = {
            ...(formationNumber ? { formation_number: formationNumber } : {}),
            date,
        };
        const commands = ['timetable', 'formation', params];
        const navigation = replaceUrl
            ? this.#router.navigate(commands, { replaceUrl: true })
            : this.#router.navigate(commands);
        notifyNavigationFailure(navigation, this.#notification);
    }

    onFormationSubmit(value: string): void {
        const formationNumber = value.trim();
        if (!formationNumber || formationNumber === this.formationNumber()) {
            return;
        }
        this.#navigate(formationNumber, this.date() ?? this.today(), false);
    }

    onDateChange(date: string): void {
        const max = this.maxDate();
        if (!DATE_PATTERN.test(date) || (max && date > max)) return;
        if (date === this.date()) return;
        this.#navigate(this.formationNumber(), date, false);
    }

    onShift(delta: -1 | 1): void {
        const next = shiftDate(this.date() ?? this.today(), delta);
        if (next) this.onDateChange(next);
    }

    onStationChange(stationId: string | null): void {
        this.#store.setSelectedStationId(stationId);
    }

    reload(): void {
        void this.#fetch(true);
    }

    /** 「不明」の行から、目撃の投稿を開く */
    onPostRequested(lastOperationNumber: string): void {
        this.#postDialog.open('timetable_formation', {
            formationOrVehicleNumber: this.formationNumber() ?? undefined,
            operationNumber: lastOperationNumber,
        });
    }
}
