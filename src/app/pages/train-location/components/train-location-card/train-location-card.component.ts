import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
} from '@angular/core';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { RouterLink } from '@angular/router';
import { STOPPED_REASON_LABEL } from 'src/app/shared/train-position.util';
import { TripClassChipComponent } from 'src/app/shared/trip-class-chip/trip-class-chip.component';
import { TrainLocationCard } from '../../interfaces/train-location-card.interface';

/**
 * 列車カード（5.8）: 種別バッジ+行先 / 列車番号+進行方向矢印（停車中は「停車中」）+充当編成番号。
 * タップで列車詳細ページへ遷移する（card.detailLink をそのまま routerLink に使う）。
 */
@Component({
    selector: 'app-train-location-card',
    templateUrl: './train-location-card.component.html',
    styleUrl: './train-location-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, TripClassChipComponent, PipesModule],
    host: { class: 'tw-block tw-max-w-full' },
})
export class TrainLocationCardComponent {
    readonly card = input.required<TrainLocationCard>();
    /** 停車中か駅間走行中か（矢印 or 「停車中」表示の切り替えに使う） */
    readonly status = input<'stopped' | 'between'>('between');
    /** 停車時の文字。駅にいる理由があれば「折返し」「入庫中」「出庫中」、無ければ「停車中」 */
    readonly stoppedLabel = computed(() => {
        const reason = this.card().stoppedReason;
        return reason ? STOPPED_REASON_LABEL[reason] : '停車中';
    });
}
