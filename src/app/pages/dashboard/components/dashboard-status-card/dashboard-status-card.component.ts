import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { interval } from 'rxjs';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { DashboardStore } from '../../stores/dashboard.store';

/**
 * 「今日の状況」カード（N3 最上部）。
 * 営業日・適用ダイヤ名・現在時刻・計画走行本数・本日の目撃投稿数を表示する。
 *
 * スタットはデータ確定前（isLoading 中）は骨組みを表示し、偽の 0 と区別する。
 */
@Component({
    selector: 'app-dashboard-status-card',
    templateUrl: './dashboard-status-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStatusCardComponent {
    readonly #destroyRef = inject(DestroyRef);

    readonly isLoading = toSignal(DashboardStore.isLoading$, {
        initialValue: false,
    });
    readonly todaysCalendar = toSignal(DashboardStore.todaysCalendar$, {
        initialValue: null,
    });
    readonly todaysDayName = toSignal(DashboardStore.todaysDayName$, {
        initialValue: null,
    });
    readonly runningTripCount = toSignal(DashboardStore.runningTripCount$, {
        initialValue: 0,
    });
    readonly sightingCountToday = toSignal(
        DashboardStore.sightingCountToday$,
        { initialValue: 0 },
    );

    readonly #now = signal(new Date());

    readonly businessDateLabel = computed(() =>
        format(getRailwayDate(this.#now()), 'yyyy年M月d日（E）', {
            locale: ja,
        }),
    );
    readonly clockLabel = computed(() => format(this.#now(), 'HH:mm'));

    /** 適用ダイヤの改正日（例: 2026.3.14改正）。mockup-11 でダイヤ名の隣に小さく表示。 */
    readonly revisionLabel = computed(() => {
        const startDate = this.todaysCalendar()?.startDate;
        if (!startDate) {
            return '';
        }
        return format(parseISO(startDate), 'yyyy.M.d改正');
    });

    constructor() {
        interval(1000)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => {
                this.#now.set(new Date());
            });
    }
}
