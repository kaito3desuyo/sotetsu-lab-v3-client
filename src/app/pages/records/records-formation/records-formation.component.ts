import { isPlatformServer } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    PLATFORM_ID,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { AgencyListState } from 'src/app/global-states/agency-list.state';
import { TodaysFormationListState } from 'src/app/global-states/todays-formation-list.state';
import { NotificationService } from 'src/app/core/services/notification.service';
import { notifyNavigationFailure } from 'src/app/core/utils/notify-navigation-failure';
import { railwayDateKey } from 'src/app/core/utils/railway-day';
import { ControlBandComponent } from 'src/app/shared/control-band/control-band.component';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { RecordsFormationCalendarComponent } from './components/records-formation-calendar/records-formation-calendar.component';
import { RecordsFormationControlsComponent } from './components/records-formation-controls/records-formation-controls.component';
import { RecordsFormationSummaryComponent } from './components/records-formation-summary/records-formation-summary.component';
import { RecordsFormationService } from './services/records-formation.service';
import { RecordsFormationStore } from './stores/records-formation.store';
import { parseMonthParam, shiftMonth } from './utils/records-month.util';

/**
 * 編成の記録。編成番号と月（マトリクスパラメータ）から、その編成の月の運番カレンダーと、
 * 今日（無ければ最後に見た日）の運番の要約を出す。
 * 今日・今の月はブラウザの時計で決める。サーバーは今日を知らないので、枠だけ返して取得しない。
 */
@Component({
    selector: 'app-records-formation',
    templateUrl: './records-formation.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatProgressBarModule,
        ControlBandComponent,
        EmptyStateComponent,
        RecordsFormationCalendarComponent,
        RecordsFormationControlsComponent,
        RecordsFormationSummaryComponent,
    ],
})
export class RecordsFormationComponent {
    readonly #destroyRef = inject(DestroyRef);
    readonly #route = inject(ActivatedRoute);
    readonly #router = inject(Router);
    readonly #notification = inject(NotificationService);
    readonly #store = inject(RecordsFormationStore);
    readonly #service = inject(RecordsFormationService);
    readonly #isServer = isPlatformServer(inject(PLATFORM_ID));
    readonly #formations = inject(TodaysFormationListState);
    /** 要約を取った編成。月を替えても取り直さない */
    #summaryRequestedFor: string | null = null;

    protected readonly agencies = inject(AgencyListState).agencies;
    /** 編成番号の欄の候補（今日の編成。会社の順・番号順） */
    protected readonly formationOptions =
        this.#formations.todaysFormationsSorted;

    /** 現在時刻。ブラウザだけ 60 秒ごとに進める（サーバーは固定） */
    protected readonly now = signal(new Date());
    protected readonly formationNumber = signal<string | null>(null);
    protected readonly month = signal<string>(parseMonthParam(undefined));

    protected readonly today = computed(() => railwayDateKey(this.now()));
    protected readonly currentMonth = computed(() => this.today().slice(0, 7));
    protected readonly canGoNext = computed(
        () => this.month() < this.currentMonth(),
    );
    protected readonly isLoading = this.#store.isLoading;

    protected readonly band = viewChild.required(ControlBandComponent);

    /** ストアの中身が、いま URL で見ている編成・月のものか（前の訪問の残りを出さない） */
    protected readonly ready = computed(
        () =>
            this.#store.formationNumber() === this.formationNumber() &&
            this.#store.month() === this.month() &&
            this.#store.loaded(),
    );
    protected readonly sightingsByDate = computed(() =>
        this.ready() ? this.#store.sightingsByDate() : {},
    );
    protected readonly isMonthEmpty = computed(
        () =>
            this.ready() &&
            !this.#store.loadError() &&
            Object.keys(this.#store.sightingsByDate()).length === 0,
    );
    protected readonly summary = computed(() =>
        this.#store.summaryFormationNumber() === this.formationNumber()
            ? this.#store.summary()
            : null,
    );
    protected readonly summaryReady = computed(
        () =>
            this.#store.summaryFormationNumber() === this.formationNumber() &&
            !this.#store.summaryError(),
    );

    protected readonly view = computed(() => {
        if (!this.formationNumber()) return 'noNumber';
        if (this.ready() && this.#store.loadError()) return 'error';
        return 'content';
    });

    protected readonly bandSummary = computed(() => {
        const number = this.formationNumber();
        if (!number) return '編成番号を入力してください';
        const [year, month] = this.month().split('-');
        return `${number} ${year}年${Number(month)}月`;
    });

    constructor() {
        this.#route.paramMap
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe((paramMap) => {
                const formationNumber =
                    paramMap.get('formation_number')?.trim() || null;
                const month = parseMonthParam(
                    paramMap.get('month') ?? undefined,
                    this.now(),
                );
                this.formationNumber.set(formationNumber);
                this.month.set(month);
                // サーバーは今日を知らないので、取得しない
                if (this.#isServer || !formationNumber) return;
                this.#fetch(formationNumber, month, false);
            });

        if (this.#isServer) return;
        const timer = setInterval(() => this.now.set(new Date()), 60_000);
        this.#destroyRef.onDestroy(() => clearInterval(timer));
    }

    #fetch(formationNumber: string, month: string, forceReload: boolean): void {
        this.#service
            .fetchMonth({
                formationNumber,
                month,
                ...(forceReload ? { forceReload: true } : {}),
            })
            .subscribe();
        if (forceReload || this.#summaryRequestedFor !== formationNumber) {
            this.#summaryRequestedFor = formationNumber;
            this.#service
                .fetchSummary({
                    formationNumber,
                    ...(forceReload ? { forceReload: true } : {}),
                })
                .subscribe();
        }
    }

    #navigate(formationNumber: string, month: string): void {
        notifyNavigationFailure(
            this.#router.navigate([
                'records',
                'formation',
                { formation_number: formationNumber, month },
            ]),
            this.#notification,
        );
    }

    protected onFormationSubmit(value: string): void {
        const formationNumber = value.trim();
        if (!formationNumber || formationNumber === this.formationNumber()) {
            return;
        }
        this.#navigate(formationNumber, this.month());
    }

    protected onShift(delta: -1 | 1): void {
        const formationNumber = this.formationNumber();
        if (!formationNumber) return;
        if (delta === 1 && !this.canGoNext()) return;
        this.#navigate(formationNumber, shiftMonth(this.month(), delta));
    }

    protected reload(): void {
        const formationNumber = this.formationNumber();
        if (formationNumber) this.#fetch(formationNumber, this.month(), true);
    }
}
