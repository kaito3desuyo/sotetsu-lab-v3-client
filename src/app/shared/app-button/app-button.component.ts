import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
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
    styleUrl: './app-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, NgTemplateOutlet],
})
export class AppButtonComponent {
    readonly variant = input<'primary' | 'secondary'>('primary');
    readonly type = input<'button' | 'submit'>('button');
    readonly disabled = input<boolean>(false);
    /** 全幅（既定）か、内容幅にとどめるか（モック10 運用情報カードの運用表/行路図ボタン等） */
    readonly fullWidth = input<boolean>(true);

    readonly buttonClick = output<void>();
}
