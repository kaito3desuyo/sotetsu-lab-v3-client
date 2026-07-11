import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

interface LegendEntry {
    label: string;
    color: string;
}

/**
 * 種別色 + 現在時刻カーソルの凡例（5.7）。
 * 線色は tripClasses（tripClassColor）由来のまま維持する。ただし運行系統別の
 * 派生種別（例: 特急（SO）/特急（SO→TY））が多数並ぶと凡例が冗長になるため、
 * **種別ベース名（"（" 以前）でまとめて 1 行に集約**して表示する（ユーザー要望 2026-07-07）。
 * 代表色は各ベース種別で最初に出現した tripClassColor を用いる。
 */
@Component({
    selector: 'app-train-diagram-legend',
    templateUrl: './train-diagram-legend.component.html',
    styleUrl: './train-diagram-legend.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    host: { class: 'tw-block' },
})
export class TrainDiagramLegendComponent {
    readonly tripClasses = input.required<TripClassDetailsDto[]>();
    readonly showCurrentTimeCursor = input<boolean>(false);

    /** 種別ベース名でまとめた凡例エントリ（出現順・重複ベース名は最初の色を代表色にする）。 */
    readonly legendEntries = computed<LegendEntry[]>(() => {
        const entries: LegendEntry[] = [];
        const seen = new Set<string>();
        for (const tripClass of this.tripClasses()) {
            const name = tripClass.tripClassName?.trim();
            if (!name) {
                continue;
            }
            const label = name.split(/[（(]/)[0].trim() || name;
            if (seen.has(label)) {
                continue;
            }
            seen.add(label);
            entries.push({ label, color: tripClass.tripClassColor ?? '#8a8a8a' });
        }
        return entries;
    });
}
