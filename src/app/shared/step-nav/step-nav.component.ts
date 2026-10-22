import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { StepTarget } from './step-target.type';

/**
 * 前後へ送るボタン（駅別時刻表の前後の駅・運用行路図の前後の運用。docs/design.md「前後へ送る」）。
 * 帯の中に名前付きで並べる。分岐駅は隣の駅を全部出す。
 */
@Component({
    selector: 'app-step-nav',
    templateUrl: './step-nav.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
    host: { class: 'tw-contents' },
})
export class StepNavComponent {
    readonly prev = input<StepTarget[]>([]);
    readonly next = input<StepTarget[]>([]);
    readonly step = output<StepTarget>();
}
