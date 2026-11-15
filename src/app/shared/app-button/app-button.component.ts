import { NgTemplateOutlet } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    input,
    output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * ボタン規約共通部品（98 G0-4）。
 *
 * 主アクション（primary）= mat-flat-button によるオレンジ塗り全幅・
 * 副アクション（secondary）= mat-stroked-button による白地紺枠 outlined
 * 全幅。ページによりバラバラだった「紺塗り/送信グレー」等の独自スタイルを
 * この部品に統一する。
 */
@Component({
    selector: 'app-button',
    templateUrl: './app-button.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, NgTemplateOutlet],
    // 内容幅のボタンは横並びの中で縮ませない（ラベルが潰れるため）
    host: { '[class.tw-shrink-0]': '!fullWidth()' },
})
export class AppButtonComponent {
    readonly variant = input<'primary' | 'secondary'>('primary');
    readonly type = input<'button' | 'submit'>('button');
    readonly disabled = input<boolean>(false);
    /**
     * 押せない印だけを付ける（disabled 属性は付けず、Material の disabledInteractive で aria-disabled="true" にする）。押すと送信などの処理は走るので、
     * 押せない理由を呼び出し側が欄のエラーとして見せられる。見た目は disabled と同じ半透明
     */
    readonly ariaDisabled = input<boolean>(false);
    /** 全幅（既定）か、内容幅にとどめるか（モック10 運用情報カードの運用表/行路図ボタン等） */
    readonly fullWidth = input<boolean>(true);

    readonly buttonClick = output<void>();
}
