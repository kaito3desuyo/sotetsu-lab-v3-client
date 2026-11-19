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
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';
import { OperationNumberTagComponent } from 'src/app/shared/operation-number-tag/operation-number-tag.component';

/**
 * 編成の記録の要約。今日の運番を出し、今日の目撃が無ければ最後に見た日とその日の運番を出す。
 * 月を切り替えても変わらない（カレンダーとは別に取る）。
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
        return {
            date,
            operationNumber,
            inferred,
            label: `${date === this.today() ? '今日' : '最後に見た日'} ${format(parse(date, 'yyyy-MM-dd', new Date()), 'M/d')}`,
            link: [
                '/timetable',
                'formation',
                { formation_number: this.formationNumber(), date },
            ],
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
