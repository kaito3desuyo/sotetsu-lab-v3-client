import {
    ChangeDetectionStrategy,
    Component,
    computed,
    input,
    signal,
} from '@angular/core';
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
 * 運用番号 100 は休車なので「休」と出し、リンクも張らない（行路図が無い。
 * real-time の編成順カードと同じ扱い。ユーザー指摘 2026-09-24）。
 * 形状は角型固定（丸型に固定しない方針 = 20-design-ui.md §1）。
 *
 * `contextMenus` 指定時、右クリック（デスクトップ）/ 長押し（モバイル）でコンテキスト
 * メニューを開ける（20-design-ui.md §5.12）。`contextmenu` DOM イベントはタッチでは
 * 発火しないため、モバイルは touch イベントで独自にタイマー判定する。
 *
 * メニューは右クリック・長押しした位置に開く。以前はトリガーを `display: none` の
 * ボタンにしていたため位置が取れず、メニューが画面左上 (0, 0) に出ていた
 * （ユーザー指摘 2026-09-24）。トリガーは見えない 0×0 の固定配置要素にして、
 * 開く直前にポインタの座標へ動かす。
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

    /** 休車（運用番号 100）か。 */
    readonly isRetired = computed(() => this.operationNumber() === '100');
    readonly label = computed(() =>
        this.isRetired() ? '休' : this.operationNumber(),
    );

    /** メニューを開く位置（ビューポート座標）。トリガーをここへ置く。 */
    readonly menuPosition = signal({ x: 0, y: 0 });

    #longPressTimer: ReturnType<typeof setTimeout> | null = null;
    #longPressTriggered = false;

    hasContextMenu(): boolean {
        return !!this.contextMenus()?.length;
    }

    onContextMenu(event: MouseEvent, trigger: MatMenuTrigger): void {
        if (!this.hasContextMenu()) return;

        event.preventDefault();
        this.menuPosition.set({ x: event.clientX, y: event.clientY });
        trigger.openMenu();
    }

    onTouchStart(event: TouchEvent, trigger: MatMenuTrigger): void {
        if (!this.hasContextMenu()) return;

        const touch = event.touches[0];
        if (touch) {
            this.menuPosition.set({ x: touch.clientX, y: touch.clientY });
        }

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
