import {
    operationTimetableLink,
    OperationTimetableLinkAt,
} from 'src/app/core/utils/operation-timetable-link';
import { BreakpointObserver } from '@angular/cdk/layout';
import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { FormationNumberLinkComponent } from 'src/app/shared/formation-number-link/formation-number-link.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripLabelComponent } from 'src/app/shared/trip-label/trip-label.component';
import {
    formatClock,
    formatSightingClock,
} from '../../../timetable-formation/utils/formation-display.util';
import { FormationRowProgress } from '../../../timetable-formation/utils/formation-progress.util';
import { isPassing } from '../../../timetable-formation/utils/formation-station-filter.util';
import { OperationDayRow } from '../../utils/operation-day.util';

type TripRow = Extract<OperationDayRow, { kind: 'trip' }>;

const WIDE_QUERY = '(min-width: 1280px)';

/**
 * 運用の 1 日の列車の並び（出庫から入庫まで）。見た目と動きは編成別時刻表の列車の一覧と同じ。
 * 運用番号のチップの所に、その列車を走った編成の番号を出す（推し量りは「?」）。
 * 行を押すと各駅の時刻が開き、広い画面（xl）では一覧の右のカードに出す
 */
@Component({
    selector: 'app-timetable-operation-trip-list',
    templateUrl: './timetable-operation-trip-list.component.html',
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
export class TimetableOperationTripListComponent {
    readonly rows = input<OperationDayRow[]>([]);
    /** rows と同じ並びの進み具合 */
    readonly states = input<FormationRowProgress[]>([]);
    readonly stationNames = input<Record<string, string>>({});
    readonly calendarId = input<string | undefined>(undefined);
    /** 見ている日 'yyyy-MM-dd'。編成番号をその日の編成別時刻表へのリンクにする。ダイヤの形では null */
    readonly date = input<string | null>(null);

    /** 運番変更の運用番号のリンク先。日付の形はその日、ダイヤの形はそのダイヤの運用別時刻表 */
    protected readonly operationLinkAt = computed<OperationTimetableLinkAt>(
        () => {
            const date = this.date();
            return date ? { date } : { calendarId: this.calendarId() };
        },
    );
    protected readonly operationTimetableLink = operationTimetableLink;

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
