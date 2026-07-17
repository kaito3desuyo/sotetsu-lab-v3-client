import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
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

/**
 * 路線ライン本体（5.8）: 中央の縦ラインに沿って駅行（駅ノード+停車中カード）と
 * 駅間行（走行中カードを progress で絶対配置）を交互に描画する。
 * 上り(inbound)=左側、下り(outbound)=右側。
 *
 * 同一駅・同一方向に複数の停車中カードがある場合は集約バッジ「n本停車中」を表示し、
 * タップで全件展開する（省略しない）。展開は CDK Overlay（バッジをアンカーとした
 * ポップオーバー）で行い、駅軸のレイアウト・高さに影響を与えない。
 * 展開状態はこのコンポーネント内のみで完結する表示上の一時状態のため、store には持たせない。
 */
@Component({
    selector: 'app-train-location-line',
    templateUrl: './train-location-line.component.html',
    styleUrl: './train-location-line.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TrainLocationCardComponent, RouterLink, OverlayModule],
    host: { class: 'tw-block' },
})
export class TrainLocationLineComponent {
    readonly rows = input.required<TrainLocationRow[]>();

    readonly #expandedKeys = signal<ReadonlySet<string>>(new Set());

    /** 起点駅名（駅軸の先頭駅。上り方面ラベル「上り（〇〇方面）」に使う） */
    readonly originStationName = computed(() => {
        const first = this.rows().find((row) => row.kind === 'station');
        return first?.kind === 'station' ? first.stationName : '';
    });

    /**
     * 駅間行（between）ごとの衝突回避レイアウトを事前計算する（98 G8）。
     * rows() が変わらない限り再計算しない（Map の再構築コストを rows 変更時のみに限定する）。
     */
    readonly #betweenLayouts = computed(() => {
        const map = new Map<TrainLocationBetweenRow, BetweenRowLayout>();
        for (const row of this.rows()) {
            if (row.kind === 'between') {
                map.set(row, resolveBetweenRowLayout(row.leftCards, row.rightCards));
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

    /** 左側（上り）: バッジ右端を基準に下へ、収まらなければ上へ出す */
    readonly leftOverlayPositions: ConnectedPosition[] = [
        {
            originX: 'end',
            originY: 'bottom',
            overlayX: 'end',
            overlayY: 'top',
            offsetY: 4,
        },
        {
            originX: 'end',
            originY: 'top',
            overlayX: 'end',
            overlayY: 'bottom',
            offsetY: -4,
        },
    ];
    /** 右側（下り）: バッジ左端を基準に下へ、収まらなければ上へ出す */
    readonly rightOverlayPositions: ConnectedPosition[] = [
        {
            originX: 'start',
            originY: 'bottom',
            overlayX: 'start',
            overlayY: 'top',
            offsetY: 4,
        },
        {
            originX: 'start',
            originY: 'top',
            overlayX: 'start',
            overlayY: 'bottom',
            offsetY: -4,
        },
    ];

    toggleExpand(key: string): void {
        const current = new Set(this.#expandedKeys());
        if (current.has(key)) {
            current.delete(key);
        } else {
            current.add(key);
        }
        this.#expandedKeys.set(current);
    }

    closeExpand(key: string): void {
        const current = new Set(this.#expandedKeys());
        if (current.delete(key)) {
            this.#expandedKeys.set(current);
        }
    }

    onOverlayKeydown(event: KeyboardEvent, key: string): void {
        if (event.key === 'Escape') {
            this.closeExpand(key);
        }
    }

    isExpanded(key: string): boolean {
        return this.#expandedKeys().has(key);
    }

    rowKey(row: TrainLocationRow): string {
        return row.kind === 'station'
            ? `station:${row.stationId}`
            : `between:${row.fromStationId}:${row.toStationId}`;
    }
}
