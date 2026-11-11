import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
    signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { TripLabelComponent } from 'src/app/shared/trip-label/trip-label.component';
import { FormationDayRow } from '../../utils/formation-day.util';
import {
    formatClock,
    formatSightingClock,
} from '../../utils/formation-display.util';
import { FormationRowProgress } from '../../utils/formation-progress.util';
import { isPassing } from '../../utils/formation-station-filter.util';

type TripRow = Extract<FormationDayRow, { kind: 'trip' }>;

/** 編成の 1 日の列車の並び（最初の出庫から最後の入庫まで）。行を押すと各駅の時刻が開く */
@Component({
    selector: 'app-timetable-formation-trip-list',
    templateUrl: './timetable-formation-trip-list.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, OperationNumberTagComponent, TripLabelComponent],
    host: { class: 'tw-block' },
})
export class TimetableFormationTripListComponent {
    readonly rows = input<FormationDayRow[]>([]);
    /** rows と同じ並びの進み具合 */
    readonly states = input<FormationRowProgress[]>([]);
    readonly stationNames = input<Record<string, string>>({});
    readonly calendarId = input<string | undefined>(undefined);
    /** 「不明」の行から投稿へ進む。最後に分かっている運用番号を渡す */
    readonly postRequested = output<string>();

    protected readonly expanded = signal<ReadonlySet<number>>(new Set());

    protected toggle(index: number): void {
        this.expanded.update((set) => {
            const next = new Set(set);
            if (!next.delete(index)) next.add(index);
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
