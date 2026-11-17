import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripLabelComponent } from 'src/app/shared/trip-label/trip-label.component';
import { FormationDayRow } from '../../utils/formation-day.util';
import {
    formatClock,
    formatSightingClock,
    routeDiagramLink,
} from '../../utils/formation-display.util';
import { FormationRowProgress } from '../../utils/formation-progress.util';
import { isPassing } from '../../utils/formation-station-filter.util';
import { FormationNumberLinkComponent } from 'src/app/shared/formation-number-link/formation-number-link.component';

type TripRow = Extract<FormationDayRow, { kind: 'trip' }>;

const WIDE_QUERY = '(min-width: 1280px)';

/**
 * 編成の 1 日の列車の並び（最初の出庫から最後の入庫まで）。行を押すと各駅の時刻が開く。
 * 広い画面（xl）では、行の中で開かずに、一覧の右のカードに最後に押した列車の時刻を出す
 */
@Component({
    selector: 'app-timetable-formation-trip-list',
    templateUrl: './timetable-formation-trip-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FormationNumberLinkComponent,
        MatIconModule,
        NgTemplateOutlet,
        OperationNumberTagComponent,
        TripLabelComponent,
    ],
    host: {
        class: 'tw-block xl:tw-grid xl:tw-grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] xl:tw-items-start xl:tw-gap-4',
    },
})
export class TimetableFormationTripListComponent {
    readonly rows = input<FormationDayRow[]>([]);
    /** rows と同じ並びの進み具合 */
    readonly states = input<FormationRowProgress[]>([]);
    readonly stationNames = input<Record<string, string>>({});
    readonly calendarId = input<string | undefined>(undefined);
    /** 見ている日 'yyyy-MM-dd'。ほかの編成の番号をその日の編成別時刻表へのリンクにする */
    readonly date = input<string | null>(null);
    /** 運用番号 → 運用 ID（乗り移り・交換の行のチップを行路図へのリンクにする。ストアの operationIdByNumber） */
    readonly operationIdByNumber = input<Record<string, string>>({});
    protected readonly routeDiagramLink = routeDiagramLink;
    /** 「不明」の行から投稿へ進む。最後に分かっている運用番号を渡す（途中の不明は空） */
    readonly postRequested = output<string>();

    /**
     * 投稿の画面に入れる運用番号。途中の不明（あとに目撃で運用が変わった行がある）は、
     * いまの運用がその目撃で分かっているので、追い出された運用の番号を入れない
     */
    protected postOperationNumber(
        index: number,
        lastOperationNumber: string,
    ): string {
        return this.rows()
            .slice(index + 1)
            .some((r) => r.kind === 'swap')
            ? ''
            : lastOperationNumber;
    }

    /** 開いた列車の tripOperationListId（取り直しで行がずれても同じ列車を開いたままにする） */
    protected readonly expanded = signal<ReadonlySet<string>>(new Set());

    /** 右のカードに出す列車の tripOperationListId（広い画面だけで使う） */
    protected readonly selectedId = signal<string | null>(null);

    /** 右のカードに出す列車の行。取り直しで消えた列車なら無し */
    protected readonly selectedRow = computed<TripRow | null>(() => {
        const id = this.selectedId();
        if (!id) return null;
        return (
            this.rows().find(
                (r): r is TripRow =>
                    r.kind === 'trip' && r.trip.tripOperationListId === id,
            ) ?? null
        );
    });

    protected isExpanded(row: TripRow): boolean {
        return this.expanded().has(row.trip.tripOperationListId);
    }

    protected isSelected(row: TripRow): boolean {
        return this.selectedId() === row.trip.tripOperationListId;
    }

    /** 行が開いているか（広い画面は右のカードに出しているか） */
    protected isOpen(row: TripRow): boolean {
        return this.wide() ? this.isSelected(row) : this.isExpanded(row);
    }

    /** 広い画面か（Tailwind の xl と同じ 1280px 以上）。右のカードを出す幅 */
    protected readonly wide = toSignal(
        inject(BreakpointObserver)
            .observe(WIDE_QUERY)
            .pipe(map((s) => s.matches)),
        { initialValue: false },
    );

    /** 狭い画面は行の中で開き閉じし、広い画面は右のカードに出す列車を替える（同じ列車ならカードを空ける） */
    protected toggle(row: TripRow): void {
        const id = row.trip.tripOperationListId;
        if (this.wide()) {
            this.selectedId.update((cur) => (cur === id ? null : id));
            return;
        }
        this.expanded.update((set) => {
            const next = new Set(set);
            if (!next.delete(id)) next.add(id);
            return next;
        });
    }

    protected name(stationId: string | undefined): string {
        return (stationId && this.stationNames()[stationId]) || '';
    }

    protected startClock(row: TripRow): string {
        const t = row.trip.startTime;
        return formatClock(
            t?.departureTime ? t.departureDays : t?.arrivalDays,
            t?.departureTime ?? t?.arrivalTime,
        );
    }

    protected endClock(row: TripRow): string {
        const t = row.trip.endTime;
        return formatClock(
            t?.arrivalTime ? t.arrivalDays : t?.departureDays,
            t?.arrivalTime ?? t?.departureTime,
        );
    }

    protected times(row: TripRow): TimeDetailsDto[] {
        return [...(row.trip.trip?.times ?? [])].sort(
            (a, b) => (a.stopSequence ?? 0) - (b.stopSequence ?? 0),
        );
    }

    protected passing(time: TimeDetailsDto): boolean {
        return isPassing(time);
    }

    /** 駅の時刻。着と発が同じ（始発・終着など）なら 1 つだけ出す */
    protected clock(time: TimeDetailsDto): string {
        const arrival = formatClock(time.arrivalDays, time.arrivalTime);
        const departure = formatClock(time.departureDays, time.departureTime);
        if (!arrival || arrival === departure) return departure || arrival;
        return departure ? `${arrival}-${departure}` : arrival;
    }

    protected link(row: TripRow): readonly unknown[] {
        return [
            '/timetable',
            'all-line',
            {
                calendar_id: this.calendarId(),
                trip_direction: row.trip.trip?.tripDirection,
                trip_block_id: row.trip.trip?.tripBlockId,
            },
        ];
    }

    protected sightingClock(iso: string): string {
        return formatSightingClock(iso);
    }
}
