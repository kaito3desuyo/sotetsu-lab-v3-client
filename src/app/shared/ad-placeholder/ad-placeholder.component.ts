import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AdsenseModule } from 'ng2-adsense';

/**
 * 広告プレースホルダ共通部品（98 G0-9）。
 *
 * localhost 等で AdSense が読み込めない（403）場合、広告枠が高さ 0 に潰れたり
 * 逆に巨大な空白を確保したりして UI が崩れる。斜線パターン + 「広告」ラベルの
 * プレースホルダで高さを固定し、実広告が読み込めたときはその上に重ねて表示する。
 */
@Component({
    selector: 'app-ad-placeholder',
    templateUrl: './ad-placeholder.component.html',
    styleUrl: './ad-placeholder.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AdsenseModule],
})
export class AdPlaceholderComponent {
    readonly adSlot = input.required<number>();
}
