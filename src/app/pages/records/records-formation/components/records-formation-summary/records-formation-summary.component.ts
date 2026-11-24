import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { format, parse } from 'date-fns';
import { toRailwayDateKey } from 'src/app/core/utils/railway-day';
import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { formatSightingClock } from 'src/app/pages/timetable/timetable-formation/utils/formation-display.util';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';
import { formatSlashDate } from '../../utils/formation-display.util';
import { FormationPeriod } from '../../utils/formation-periods.util';

/**
 * 編成の記録の見出しのカード。編成番号・形式・会社（解かれた日があればその日まで）と、
 * 最後の目撃（今日の目撃なら今日）の時刻と運番を出す。月を切り替えても変わらない（カレンダーとは別に取る）。
 * 編成別時刻表の見出しと同じ作り。
 */
@Component({
    selector: 'app-records-formation-summary',
    templateUrl: './records-formation-summary.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [EmptyStateComponent, OperationNumberTagComponent, RouterLink],
    host: { class: 'tw-block' },
})
export class RecordsFormationSummaryComponent {
    readonly formationNumber = input.required<string>();
    readonly summary = input<OperationSightingTimeCrossSectionDto | null>(null);
    /** 'yyyy-MM-dd'。今日（4 時区切り）の鉄道日 */
    readonly today = input.required<string>();
    /** いま見ている月 'YYYY-MM'。最後に見た日の月と同じなら「この月の記録」は出さない */
    readonly month = input<string | null>(null);
    /** 編成の最も新しい期間。形式・会社・解かれた日を出す。取れなければ番号だけを出す */
    readonly latestPeriod = input<FormationPeriod | null>(null);

    /** 「10000・相鉄」「7000・相鉄・2019/10/14 まで」 */
    protected readonly annotation = computed(() => {
        const period = this.latestPeriod();
        if (!period) return '';
        return [
            period.vehicleType,
            period.agencyName,
            period.endDate ? `${formatSlashDate(period.endDate)} まで` : null,
        ]
            .filter(Boolean)
            .join('・');
    });

    protected readonly timetableLink = computed(() => {
        const date = this.latest()?.date;
        return [
            '/timetable',
            'formation',
            date
                ? { formation_number: this.formationNumber(), date }
                : { formation_number: this.formationNumber() },
        ];
    });

    /**
     * 最後の目撃がある日と運番。一度も目撃が無ければ null。
     * 同日の引き継ぎ（sightedAsOperation あり）のとき latestSighting は元の目撃なので、
     * 運番は推定した今の運用（expectedSighting.operation）を出す（real-time の編成カードと同じ規則）。
     * 推定できなければ運番は null（「不明」と出す）。
     */
    protected readonly latest = computed(() => {
        const summary = this.summary();
        const sighting = summary?.latestSighting;
        if (!sighting) return null;
        const inferred = !!summary.sightedAsOperation;
        const operationNumber =
            (inferred
                ? summary.expectedSighting?.operation?.operationNumber
                : sighting.operation?.operationNumber) ?? null;
        const date = toRailwayDateKey(sighting.sightingTime);
        // 今年（4 時区切りの鉄道日で数える）でない日は、今年の日と読み違えないよう年を付ける
        const dateFormat =
            date.slice(0, 4) === this.today().slice(0, 4) ? 'M/d' : 'yyyy/M/d';
        return {
            date,
            operationNumber,
            inferred,
            heading: date === this.today() ? '今日の目撃' : '最後の目撃',
            // 今日の目撃は時刻だけ、それ以外は日付も添える
            when:
                date === this.today()
                    ? formatSightingClock(sighting.sightingTime)
                    : `${format(parse(date, 'yyyy-MM-dd', new Date()), dateFormat)} ${formatSightingClock(sighting.sightingTime)}`,
            showMonthLink: date.slice(0, 7) !== this.month(),
            monthLink: [
                '/records',
                'formation',
                {
                    formation_number: this.formationNumber(),
                    month: date.slice(0, 7),
                },
            ],
        };
    });
}
