import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { OperationNumberTagContextMenu } from './operation-number-tag-context-menu.type';

/**
 * 運用番号タグ共通部品。
 *
 * 群色（`operation-number-color.pipe` 規則: 先頭 1=赤 / 2=黄 / 4=黄緑 / 5=青 /
 * 6=藍 / 7-9=緑青 / G 含む=紺 / K 含む=赤茶 / 100（休車）=灰、12% 透過背景）を
 * 適用したタグとして運用番号を描画する。色は UI 側でハードコードせず既存 pipe に委譲する。
 *
 * 行路図等へのリンクは任意（`link` 未指定時はタグのみ表示）。
 * 形状は角型固定（丸型に固定しない方針 = 20-design-ui.md §1）。
 *
 * `contextMenus` 指定時、右クリック（デスクトップ）/ 長押し（モバイル）でコンテキスト
 * メニューを開ける（20-design-ui.md §5.12）。`contextmenu` DOM イベントはタッチでは
 * 発火しないため、モバイルは touch イベントで独自にタイマー判定する。
 */
@Component({
    selector: 'app-operation-number-tag',
    templateUrl: './operation-number-tag.component.html',
    styleUrl: './operation-number-tag.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterLink, PipesModule, MatMenuModule, MatIconModule],
    host: { class: 'tw-inline-block' },
})
export class OperationNumberTagComponent {
    readonly operationNumber = input.required<string>();
    readonly link = input<string[]>(undefined);
    readonly borderEnabled = input<boolean>(false);
    readonly borderColor = input<string>(undefined);
    readonly contextMenus = input<OperationNumberTagContextMenu[]>(undefined);
    readonly longPressMs = input<number>(500);

    #longPressTimer: ReturnType<typeof setTimeout> | null = null;
    #longPressTriggered = false;

    hasContextMenu(): boolean {
        return !!this.contextMenus()?.length;
    }

    onContextMenu(event: MouseEvent, trigger: MatMenuTrigger): void {
        if (!this.hasContextMenu()) return;

        event.preventDefault();
        trigger.openMenu();
    }

    onTouchStart(trigger: MatMenuTrigger): void {
        if (!this.hasContextMenu()) return;

        this.#clearLongPressTimer();
        this.#longPressTriggered = false;
        this.#longPressTimer = setTimeout(() => {
            this.#longPressTriggered = true;
            trigger.openMenu();
        }, this.longPressMs());
    }

    onTouchEnd(event: TouchEvent): void {
        this.#clearLongPressTimer();

        if (this.#longPressTriggered) {
            event.preventDefault();
        }
    }

    onTouchCancel(): void {
        this.#clearLongPressTimer();
    }

    onClick(event: MouseEvent): void {
        if (this.#longPressTriggered) {
            event.preventDefault();
            this.#longPressTriggered = false;
        }
    }

    #clearLongPressTimer(): void {
        if (this.#longPressTimer !== null) {
            clearTimeout(this.#longPressTimer);
            this.#longPressTimer = null;
        }
    }
}
