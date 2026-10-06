import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    model,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export type ControlBandCollapse = 'scroll' | 'manual';

const HEADER_HEIGHT = { mobile: 48, desktop: 64 } as const;
const DESKTOP_QUERY = '(min-width: 768px)';
const OFFSET_PROPERTY = '--control-band-offset';
const BAR_HEIGHT_PX = 40;
const BAR_HEIGHT = `${BAR_HEIGHT_PX}px`;
/** 止まったときに残す高さ。要約の行と帯の下の罫線（1px） */
const STUCK_VISIBLE_PX = BAR_HEIGHT_PX + 1;
/** 利用者のスクロールとみなすキー。操作部の中で押されたものは数えない */
const SCROLL_KEYS = new Set([
    'PageUp',
    'PageDown',
    'Home',
    'End',
    ' ',
    'ArrowUp',
    'ArrowDown',
]);

const GUTTER_MARGIN =
    '-tw-mx-4 -tw-mt-4 md:-tw-mx-6 md:-tw-mt-6 lg:-tw-mx-8 lg:-tw-mt-8 xl:-tw-mx-16 xl:-tw-mt-16';
const GUTTER_PADDING_X = 'tw-px-4 md:tw-px-6 lg:tw-px-8 xl:tw-px-16';
/** 開く・畳むの動き（ユーザー指示 2026-10-06「開く/畳む動きはアニメーションしてほしい」） */
const MOTION = 'tw-duration-200 tw-ease-out motion-reduce:tw-transition-none';
/** 動きが終わるまで待つ時間（MOTION の 200ms に少し足す） */
const SETTLE_MS = 250;
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
 * 貼り付きと折りたたみ（docs/design.md「操作帯は貼り付き、どこからでも開ける」・2026-10-06）:
 * - scroll: 帯は上から 操作部・要約の行（40px）の順で、要約の行は初めから出しておく。
 *   host を `position: sticky` にし、`top` を「ヘッダーの高さ + 40px + 罫線 1px − 帯の高さ」（負の値）にする。
 *   スクロールでは操作部だけがヘッダーの下に潜り、要約の行が残った所で止まる。ページの流れから
 *   抜けないので中身は跳ねない。操作部は薄くも覆いもしない（ユーザー判断 2026-10-06
 *   「最初から要約を表示した上でスクロールしたら畳む、の方がより実装がシンプルなのでは？」）。
 *   要約の行はいつも 40px 残るので、`--control-band-offset: 40px` はずっと入れておく。
 *   操作部が見えている間（一番上の辺り）は、要約の行のボタンが「畳む」になり、その場で操作部を隠して
 *   要約の行だけにする（ユーザー指示 2026-10-06「一番上にいる状態の時もたためてほしい」）。
 *   畳んだまま一番上で「開く」と、その場で広げる。操作部がヘッダーの下に隠れている間（と、畳んで
 *   スクロールした後）は「開く」で `top` をヘッダーの高さにし、帯の全部をページに重ねる。
 *   その場で広げると、ページの中身が帯の伸びた分だけ下へ跳ねるからだ。操作部が見えているかは
 *   IntersectionObserver で見る（スクロールのたびの計算はしない）。
 * - manual: 要約の行は同じく初めから出し、その「畳む」で操作部を隠して 40px の 1 行にする。固定も重ねもしない
 *   （列車ダイヤグラム）。操作部の右に「畳む」の列を取ると、スマホでチップや選択欄が狭くなった（2026-10-06）。
 * - 展開は scroll イベントでは閉じない。絞り込むとページが短くなりブラウザがスクロール位置を
 *   詰めるので、scroll イベントで閉じるとチップを押した瞬間に閉じる。幕の上の wheel・touchmove と
 *   スクロールするキーで閉じる。
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
        '[style.top.px]': 'hostTop()',
        '(document:keydown)': 'onDocumentKeydown($event)',
        '(focusout)': 'onFocusOut($event)',
    },
})
export class ControlBandComponent {
    readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
    readonly #destroyRef = inject(DestroyRef);

    readonly summary = input('');
    readonly filterActive = input(false);
    readonly clearable = input(false);
    readonly collapse = input<ControlBandCollapse>('scroll');
    readonly flush = input(false);
    readonly collapsed = model(false);
    readonly clear = output<void>();

    readonly open = signal(false);
    /** 操作部の一部でもヘッダーの下より下に見えているか（scroll のときだけ測る） */
    readonly formVisible = signal(true);
    readonly #bandHeight = signal(0);
    readonly #headerHeight = signal<number>(HEADER_HEIGHT.mobile);
    /** その場で畳む・広げる動きの途中か。途中は操作部を帯の中（ページの流れの中）に置いて縮める */
    readonly #settling = signal(false);
    #settleTimer: ReturnType<typeof setTimeout> | undefined;
    private readonly content =
        viewChild.required<ElementRef<HTMLElement>>('content');
    private readonly toggleButton = viewChild.required('toggleButton', {
        read: ElementRef<HTMLButtonElement>,
    });
    /** 開閉のボタンの aria-controls が指す、操作部の id */
    readonly contentId = `control-band-content-${nextId++}`;

    /** 押すと操作部をその場で隠す状態か（操作部が見えていて、重ねてもいない） */
    readonly #canCollapse = computed(() =>
        this.collapse() === 'manual'
            ? !this.collapsed()
            : !this.open() && !this.collapsed() && this.formVisible(),
    );
    readonly expanded = computed(() => this.open() || this.#canCollapse());
    /** ボタンの文言は「開く」と「畳む」の 2 つだけ（重ねた操作部を閉じるときも「畳む」。ユーザー指摘 2026-10-06） */
    readonly toggleLabel = computed(() => (this.expanded() ? '畳む' : '開く'));

    readonly hostTop = computed<number | null>(() => {
        if (this.collapse() !== 'scroll') return null;
        const bandHeight = this.#bandHeight();
        if (bandHeight <= 0) return null;
        const header = this.#headerHeight();
        return this.open() ? header : header + STUCK_VISIBLE_PX - bandHeight;
    });

    readonly hostClass = computed(() => {
        const base = this.flush() ? 'tw-block' : `tw-block ${GUTTER_MARGIN}`;
        // 重ねて開く・閉じるときは top が動くので、帯がヘッダーの下から降りてくる・戻っていく
        return this.collapse() === 'scroll'
            ? `${base} tw-sticky tw-z-50 tw-transition-[top] ${MOTION}`
            : base;
    });
    // 幕（tw-z-40）は host の重なりの中にあるので、帯を幕より上に置かないと押せない。
    // 影は付けない。白い帯と灰色のページ地の差と下の罫線で分ける（開いた時だけ影が付くのはおかしい・
    // ユーザー指摘 2026-10-06）
    readonly bandClass =
        'tw-relative tw-z-50 tw-block tw-border-0 tw-border-b tw-border-solid tw-border-rule tw-bg-white';
    readonly barClass = computed(() => {
        const padding = this.flush() ? 'tw-px-3' : GUTTER_PADDING_X;
        return `tw-relative tw-box-border tw-flex tw-h-10 tw-items-center tw-gap-2 ${padding}`;
    });
    /** 操作部を隠しているか（畳んでいて、重ねてもいない） */
    readonly contentHidden = computed(() => this.collapsed() && !this.open());
    /**
     * 操作部の外枠。高さは grid の行の 1fr／0fr で動かす（display: none は動かせない）。
     * 畳んだ後は要約の行の下に落として置き、そのまま重ねて開く。帯の高さ（ページの形）を変えると、
     * ページの中身が伸びた分だけ下へ跳ねる（スクロール位置を詰め直さないブラウザがある）。
     * その場で畳む・広げる動きの途中だけは帯の中に置き、帯ごと縮めたり伸ばしたりする。
     */
    readonly contentClass = computed(() => {
        const rows = this.contentHidden()
            ? 'tw-grid-rows-[0fr]'
            : 'tw-grid-rows-[1fr]';
        const dropdown =
            this.collapse() === 'scroll' &&
            this.collapsed() &&
            (this.open() || !this.#settling());
        const place = dropdown
            ? `tw-absolute tw-inset-x-0 tw-top-full tw-bg-white${
                  this.open()
                      ? ' tw-border-0 tw-border-b tw-border-solid tw-border-rule'
                      : ''
              }`
            : '';
        return `tw-grid tw-transition-[grid-template-rows] ${MOTION} ${rows} ${place}`.trim();
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
            if (this.collapse() !== 'scroll') return;
            document.documentElement.style.setProperty(
                OFFSET_PROPERTY,
                BAR_HEIGHT,
            );
        });
        this.#destroyRef.onDestroy(() => {
            if (this.collapse() === 'scroll') {
                document.documentElement.style.removeProperty(OFFSET_PROPERTY);
            }
        });
        afterNextRender(() => {
            if (this.collapse() === 'scroll') this.#observe();
        });
        this.#destroyRef.onDestroy(() => clearTimeout(this.#settleTimer));
    }

    toggle(): void {
        if (this.collapse() === 'manual') {
            this.collapsed.update((value) => !value);
            return;
        }
        if (this.open()) {
            this.close();
        } else if (this.#canCollapse()) {
            this.#settle();
            this.collapsed.set(true);
        } else if (this.collapsed() && window.scrollY < 1) {
            // 一番上ならその場で広げる。帯はページの一番上にあるので、ここでは何も隠れない
            this.#settle();
            this.collapsed.set(false);
        } else {
            this.open.set(true);
        }
    }

    /** その場で畳む・広げる動きの間だけ、操作部を帯の中に置く */
    #settle(): void {
        clearTimeout(this.#settleTimer);
        this.#settling.set(true);
        this.#settleTimer = setTimeout(
            () => this.#settling.set(false),
            SETTLE_MS,
        );
    }

    close(): void {
        this.open.set(false);
    }

    onDocumentKeydown(event: KeyboardEvent): void {
        if (!this.open()) return;
        if (event.key === 'Escape') {
            // mat-select の選択肢を閉じる Esc（defaultPrevented）では帯まで閉じない
            if (event.defaultPrevented) return;
            this.close();
            this.toggleButton().nativeElement.focus();
            return;
        }
        const target = event.target as Node | null;
        if (target && this.#host.nativeElement.contains(target)) return;
        if (SCROLL_KEYS.has(event.key)) this.close();
    }

    /**
     * Tab で帯の外へ出たら閉じる。開いたまま幕の裏の本文にフォーカスが移らないようにする。
     * mat-select などの選択肢は帯の外（cdk の overlay）に出るので、そこへ移るのは帯の中と同じに扱う
     */
    onFocusOut(event: FocusEvent): void {
        if (!this.open()) return;
        const next = event.relatedTarget as HTMLElement | null;
        if (!next || this.#host.nativeElement.contains(next)) return;
        if (next.closest?.('.cdk-overlay-container')) return;
        this.close();
    }

    /** 帯の高さとヘッダーの高さを測る（`top` はこの 2 つで決まる）。操作部が見えているかも見る */
    #observe(): void {
        if (typeof ResizeObserver === 'undefined') return;
        const hostEl = this.#host.nativeElement;

        const resize = new ResizeObserver(() => {
            this.#bandHeight.set(hostEl.offsetHeight);
        });
        resize.observe(hostEl);

        const media = window.matchMedia(DESKTOP_QUERY);
        const applyHeader = (): void => {
            this.#headerHeight.set(
                media.matches ? HEADER_HEIGHT.desktop : HEADER_HEIGHT.mobile,
            );
        };

        let intersection: IntersectionObserver | null = null;
        const watchForm = (): void => {
            intersection?.disconnect();
            if (typeof IntersectionObserver === 'undefined') return;
            intersection = new IntersectionObserver(
                ([entry]) => this.formVisible.set(entry.isIntersecting),
                // 1px 余分に差し引く。操作部の下の端がヘッダーの縁にちょうど接したときも、
                // 接しているだけで「見えている」と出てしまうため
                { rootMargin: `-${this.#headerHeight() + 1}px 0px 0px 0px` },
            );
            intersection.observe(this.content().nativeElement);
        };
        const onMediaChange = (): void => {
            applyHeader();
            watchForm();
        };
        applyHeader();
        watchForm();
        media.addEventListener('change', onMediaChange);

        this.#destroyRef.onDestroy(() => {
            resize.disconnect();
            intersection?.disconnect();
            media.removeEventListener('change', onMediaChange);
        });
    }
}
