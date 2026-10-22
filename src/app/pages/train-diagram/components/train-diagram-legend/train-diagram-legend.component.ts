import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { SkeletonBarComponent } from 'src/app/shared/skeleton/skeleton-bar.component';

/**
 * 種別ごとの色分けは載せない（クリックで出るため）。記号の見本（回送・出庫・入庫・
 * 現在時刻）だけを、該当するものがあるときに出す。
 */
@Component({
    selector: 'app-train-diagram-legend',
    templateUrl: './train-diagram-legend.component.html',
    styleUrl: './train-diagram-legend.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SkeletonBarComponent],
    host: { class: 'tw-block' },
})
export class TrainDiagramLegendComponent {
    readonly hasDeadhead = input<boolean>(false);
    readonly showCurrentTimeCursor = input<boolean>(false);
    /** Task 14: 出庫（◯）・入庫（△）の印を持つ線が1本でもあるとき、凡例に見本を出す。 */
    readonly hasDepotOut = input<boolean>(false);
    readonly hasDepotIn = input<boolean>(false);
    readonly hasTransfer = input<boolean>(false);
    /** 列車を取る前は、後から増える項目（回送・出庫・入庫・別の運用へ・から）の代わりに棒を出す */
    readonly loading = input<boolean>(false);
}
