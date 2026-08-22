import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { TripClassDetailsDto } from 'src/app/libs/trip-class/usecase/dtos/trip-class-details.dto';

interface LegendEntry {
    /** この色を共有する種別ベース名（出現順）。 */
    labels: string[];
    color: string;
}

/**
 * 種別色 + 現在時刻カーソルの凡例（5.7）。
 * 線色は tripClasses（tripClassColor）由来のまま維持する。ただし運行系統別の
 * 派生種別（例: 特急（SO）/特急（SO→TY））が多数並ぶと凡例が冗長になるため、
 * **種別ベース名（"（" 以前）でまとめて 1 行に集約**して表示する（ユーザー要望 2026-07-07）。
 *
 * さらに、**異なるベース種別が同じ色を共有する**ケース（特急と F特急がともに
 * #ff9800、各停と普通がともに #212121 等）がある。色はドメインデータなので
 * UI 側では変えられず、1 色 1 種別の凡例にすると同じ見た目のスウォッチが複数並んで
 * 何を指すのか判別できなかった（audit M3）。そこで**色でまとめ、その色を共有する
 * 種別名を併記する**（例: 「特急・F特急」）。凡例が色→種別の対応として正しくなる。
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

    /**
     * 凡例エントリ。まずベース種別名で重複を除き（最初の色を代表色にする）、
     * つぎに色でまとめて 1 スウォッチ = 1 色になるようにする。
     */
    readonly legendEntries = computed<LegendEntry[]>(() => {
        // 1) ベース種別名で重複除去（従来どおり最初に出現した色を代表色にする）
        const colorByLabel = new Map<string, string>();
        for (const tripClass of this.tripClasses()) {
            const name = tripClass.tripClassName?.trim();
            if (!name) {
                continue;
            }
            const label = name.split(/[（(]/)[0].trim() || name;
            if (colorByLabel.has(label)) {
                continue;
            }
            colorByLabel.set(label, tripClass.tripClassColor ?? '#8a8a8a');
        }

        // 2) 同じ色を共有するベース種別をひとつのエントリにまとめる
        const entries: LegendEntry[] = [];
        const indexByColor = new Map<string, number>();
        for (const [label, color] of colorByLabel) {
            const key = color.trim().toLowerCase();
            const index = indexByColor.get(key);
            if (index === undefined) {
                indexByColor.set(key, entries.length);
                entries.push({ labels: [label], color });
                continue;
            }
            entries[index].labels.push(label);
        }
        return entries;
    });
}
