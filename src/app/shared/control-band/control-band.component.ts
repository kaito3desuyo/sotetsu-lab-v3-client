import { DOCUMENT } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ControlBandCollapse = 'page' | 'box';

const OFFSET_PROPERTY = '--control-band-offset';
const BAR_HEIGHT = '40px';

const GUTTER_MARGIN =
    '-tw-mx-4 -tw-mt-4 md:-tw-mx-6 md:-tw-mt-6 lg:-tw-mx-8 lg:-tw-mt-8 xl:-tw-mx-16 xl:-tw-mt-16';
const GUTTER_PADDING_X = 'tw-px-4 md:tw-px-6 lg:tw-px-8 xl:tw-px-16';
/** 開く・畳むの動き（ユーザー指示 2026-10-06「開く/畳む動きはアニメーションしてほしい」） */
const MOTION = 'tw-duration-200 tw-ease-out motion-reduce:tw-transition-none';
let nextId = 0;

/**
 * ページ上端の操作部（選択欄・チップ・切り替え）を載せる全幅の白い帯。
 * 列車ダイヤグラム・列車位置情報の表示設定と同じ見た目（白地＋下の罫線）にそろえる。
 *
 * main の余白（tw-p-4 md:tw-p-6 lg:tw-p-8 xl:tw-p-16）の中に置き、上と左右の余白を
 * 負のマージンで打ち消して端から端まで抜く。中身は同じ値の内側の余白で本文の左右にそろえる。
 * main の余白を変えるときはここも変えること。
 *
 * 帯の中の余白は「帯の上下 16px・まとまりの間 16px・ラベルとチップの間 8px・チップの段の間 8px」。
 * チップの行は Material の既定でチップの上下に 4px の余白を持ち、帯の下やラベルとの間だけ 4px 広がって
 * いたので、帯の中に限って打ち消す（共有のチップ部品は他のページでも使うので触らない）。
 *
 * 作り（docs/design.md「操作帯は貼り付き、どこからでも開ける」・2026-10-06、2026-10-28 に作り直し）:
 * - ページの流れの中に置くのは要約の行（40px・下に罫線 1 本）だけ。操作部はいつも、要約の行のすぐ下に
 *   重ねて出す（`position: absolute` を要約の行を含む帯の外枠に対して `top-full` で落とす）。
 *   重ねるだけなので、帯より下の中身は開いても畳んでも動かない。
 *   初めは畳んだ形（要約の行だけ）。開閉は保存しない（ユーザー判断 2026-10-28）。
 * - 要約の行の右端のボタン（「開く」「畳む」の 2 つだけ）で開閉する。開くと幕（tw-z-40）を敷き、
 *   操作部は高さを 0fr→1fr で 200ms かけて伸ばす。高さの上限は「画面 − ヘッダー − 40px」で、超えたら中でスクロールする。
 *   重ねた操作部は自分の下に罫線を引く。動きを減らす設定の端末では動かさない。
 *   操作部の右に「畳む」の列を取ると、スマホでチップや選択欄が狭くなった（2026-10-06）。
 * - 閉じるのは「畳む」・幕を押す・Esc・Tab で帯の外へ出たとき。スクロール（wheel・touchmove・スクロールのキー・
 *   scroll イベント）では閉じない（ユーザー指示 2026-10-28「スクロールしたときに自動で閉じる機能はオミット」）。
 *   絞り込むとページが短くなりブラウザがスクロール位置を詰めるので、scroll で閉じるとチップを押した瞬間に閉じてしまう。
 * - page: ページがスクロールするページ用。帯の外枠を `position: sticky`（`top` はヘッダーの高さ 48px、md 以上は 64px）にして
 *   要約の行をヘッダーのすぐ下に貼り付ける。sticky は親の箱の中でしか貼り付かないので、host は `display: contents`
 *   （包む部品もすでに `tw-contents`）。要約の行はいつも 40px 残るので、`--control-band-offset: 40px` をずっと入れる。
 * - box: 高さ固定のページ用（ページ全体はスクロールせず、図・表の箱が縦横にスクロールする）。貼り付かない。
 *   ページがスクロールしないので `--control-band-offset` も入れない。
 */
@Component({
    selector: 'app-control-band',
    templateUrl: './control-band.component.html',
    styles: `
        :host ::ng-deep app-filter-chips {
            display: block;
            margin-block: -4px;
        }
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButtonModule, MatIconModule],
    host: {
        '[class]': 'hostClass()',
        '(document:keydown)': 'onDocumentKeydown($event)',
        '(focusout)': 'onFocusOut($event)',
    },
})
export class ControlBandComponent {
    readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
    readonly #destroyRef = inject(DestroyRef);
    /** サーバーには document が無いので、Angular が渡すものを使う */
    readonly #document = inject(DOCUMENT);

    readonly summary = input('');
    readonly filterActive = input(false);
    readonly clearable = input(false);
    readonly collapse = input<ControlBandCollapse>('page');
    readonly flush = input(false);
    readonly clear = output<void>();

    /** 操作部を重ねて開いているか。初めは畳んだ形で、保存しない */
    readonly open = signal(false);
    private readonly toggleButton = viewChild.required('toggleButton', {
        read: ElementRef<HTMLButtonElement>,
    });
    /** 開閉のボタンの aria-controls が指す、操作部の id */
    readonly contentId = `control-band-content-${nextId++}`;

    /** ボタンの文言は「開く」と「畳む」の 2 つだけ（ユーザー指摘 2026-10-06） */
    readonly toggleLabel = computed(() => (this.open() ? '畳む' : '開く'));

    /**
     * page は host を消して（display: contents）、貼り付く帯の外枠の親をページの箱にする。
     * box は貼り付かないので、host が負のマージンで余白を打ち消す
     */
    readonly hostClass = computed(() => {
        if (this.collapse() === 'page') return 'tw-contents';
        return this.flush() ? 'tw-block' : `tw-block ${GUTTER_MARGIN}`;
    });
    // 幕（tw-z-40）は host の重なりの外にあるので、帯を幕より上に置かないと押せない。
    // 影は付けない。白い帯と灰色のページ地の差と下の罫線で分ける（開いた時だけ影が付くのはおかしい・
    // ユーザー指摘 2026-10-06）
    readonly bandClass = computed(() => {
        const base = 'tw-z-50 tw-block tw-bg-white';
        if (this.collapse() !== 'page') return `tw-relative ${base}`;
        const margin = this.flush() ? '' : ` ${GUTTER_MARGIN}`;
        return `tw-sticky tw-top-12 md:tw-top-16 ${base}${margin}`;
    });
    /** 要約の行。下の罫線はいつも引く（罫線の分も含めて高さ 40px） */
    readonly barClass = computed(() => {
        const padding = this.flush() ? 'tw-px-3' : GUTTER_PADDING_X;
        return `tw-relative tw-box-border tw-flex tw-h-10 tw-items-center tw-gap-2 ${padding} tw-border-0 tw-border-b tw-border-solid tw-border-rule`;
    });
    /**
     * 操作部の外枠。要約の行の下に落として重ねる（ページの流れに入れない）。
     * 高さは grid の行の 1fr／0fr で動かす（display: none は動かせない）。開いている間だけ自分の下に罫線を引く
     */
    readonly contentClass = computed(() => {
        const open = this.open();
        const rows = open ? 'tw-grid-rows-[1fr]' : 'tw-grid-rows-[0fr]';
        const rule = open
            ? ' tw-border-0 tw-border-b tw-border-solid tw-border-rule'
            : '';
        return `tw-absolute tw-inset-x-0 tw-top-full tw-grid tw-bg-white tw-transition-[grid-template-rows] ${MOTION} ${rows}${rule}`;
    });
    readonly contentInnerClass = computed(() =>
        this.open()
            ? 'tw-min-h-0 tw-overflow-y-auto tw-max-h-[calc(100dvh_-_88px)] md:tw-max-h-[calc(100dvh_-_104px)]'
            : 'tw-min-h-0 tw-overflow-hidden',
    );
    readonly contentPaddingClass = computed(() =>
        this.flush() ? '' : `tw-py-4 ${GUTTER_PADDING_X}`,
    );

    constructor() {
        effect(() => {
            if (this.collapse() !== 'page') return;
            this.#document.documentElement.style.setProperty(
                OFFSET_PROPERTY,
                BAR_HEIGHT,
            );
        });
        this.#destroyRef.onDestroy(() => {
            if (this.collapse() === 'page') {
                this.#document.documentElement.style.removeProperty(
                    OFFSET_PROPERTY,
                );
            }
        });
    }

    toggle(): void {
        this.open.update((open) => !open);
    }

    close(): void {
        this.open.set(false);
    }

    onDocumentKeydown(event: KeyboardEvent): void {
        if (!this.open() || event.key !== 'Escape') return;
        // mat-select の選択肢を閉じる Esc（defaultPrevented）では帯まで閉じない
        if (event.defaultPrevented) return;
        this.close();
        this.toggleButton().nativeElement.focus();
    }

    /**
     * Tab で帯の外へ出たら閉じる。開いたまま幕の裏の本文にフォーカスが移らないようにする。
     * mat-select などの選択肢は帯の外（cdk の overlay、または popover）に出るので、そこへ移るのは帯の中と同じに扱う
     */
    onFocusOut(event: FocusEvent): void {
        if (!this.open()) return;
        const next = event.relatedTarget as HTMLElement | null;
        if (!next || this.#host.nativeElement.contains(next)) return;
        if (next.closest?.('.cdk-overlay-container, [popover]')) return;
        this.close();
    }
}
