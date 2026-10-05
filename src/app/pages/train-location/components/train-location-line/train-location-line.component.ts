import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    output,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
    TrainLocationBetweenRow,
    TrainLocationRow,
} from '../../interfaces/train-location-row.interface';
import {
    BetweenRowLayout,
    resolveBetweenRowLayout,
} from '../../utils/resolve-between-row-layout.util';
import { TrainLocationCardComponent } from '../train-location-card/train-location-card.component';

/** 在線の無い駅間の高さ（spec: 空は 30px。18 駅で約 1,300px） */
export const EMPTY_BETWEEN_ROW_HEIGHT_PX = 30;

/**
 * 路線ライン本体（5.8）: 中央の縦ラインに沿って駅行（駅ノード+停車中カード）と
 * 駅間行（走行中カードを progress で絶対配置）を交互に描画する。
 * 上り(inbound)=左側、下り(outbound)=右側。
 *
 * 同一駅に複数停車していても全カードを縦に並べる（情報を隠さない）。
 */
@Component({
    selector: 'app-train-location-line',
    templateUrl: './train-location-line.component.html',
    styleUrl: './train-location-line.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TrainLocationCardComponent, RouterLink],
    host: { class: 'tw-block' },
})
export class TrainLocationLineComponent {
    readonly rows = input.required<TrainLocationRow[]>();
    readonly selectedStationId = input<string | null>(null);
    readonly stationSelect = output<string>();

    /**
     * 駅間行（between）ごとの衝突回避レイアウトを事前計算する（98 G8）。
     * rows() が変わらない限り再計算しない（Map の再構築コストを rows 変更時のみに限定する）。
     */
    readonly #betweenLayouts = computed(() => {
        const map = new Map<TrainLocationBetweenRow, BetweenRowLayout>();
        for (const row of this.rows()) {
            if (row.kind === 'between') {
                // 在線が無い区間は 30px の細い間隔にする。在線がある区間は
                // 従来どおりの基準高（BETWEEN_ROW_BASE_HEIGHT_PX）を使い、
                // topProgress に基づく縦位置の表現力（衝突回避含む）を保つ。
                const isEmpty =
                    row.leftCards.length === 0 && row.rightCards.length === 0;
                map.set(
                    row,
                    resolveBetweenRowLayout(
                        row.leftCards,
                        row.rightCards,
                        isEmpty ? EMPTY_BETWEEN_ROW_HEIGHT_PX : undefined,
                    ),
                );
            }
        }
        return map;
    });

    betweenLayout(row: TrainLocationBetweenRow): BetweenRowLayout {
        return (
            this.#betweenLayouts().get(row) ?? {
                heightPx: 0,
                left: [],
                right: [],
            }
        );
    }

    rowKey(row: TrainLocationRow): string {
        return row.kind === 'station'
            ? `station:${row.stationId}`
            : `between:${row.fromStationId}:${row.toStationId}`;
    }
}
