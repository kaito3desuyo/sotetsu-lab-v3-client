import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    Injector,
    afterNextRender,
    computed,
    effect,
    inject,
    input,
    output,
    signal,
    untracked,
    viewChild,
} from '@angular/core';
import {
    AXIS_PX_PER_MINUTE_MAX,
    AXIS_PX_PER_MINUTE_MIN,
    DIAGRAM_TOTAL_MINUTES,
    PX_PER_MINUTE_MAX,
    PX_PER_MINUTE_MIN,
    VISIBLE_MARGIN_MINUTES,
    clamp,
    formatHourLabel,
} from '../../utils/diagram-timeline.util';
import {
    TripDiagramDepotMark,
    TripDiagramLine,
    TripDiagramPoint,
    TripDiagramStopLabel,
} from '../../utils/build-trip-diagram-line.util';
import { TurnbackLink } from '../../utils/layout-turnback-links.util';
import {
    PlacedThroughLabel,
    placeThroughLabels,
} from '../../utils/place-through-labels.util';
import { selectVisibleLines } from '../../utils/select-visible-lines.util';

export type DiagramStationRow = {
    stationId: string;
    stationName: string;
    y: number;
};

export type DiagramJumpRequest = {
    minute: number;
    align: 'start' | 'quarter';
    seq: number;
};

const STATION_LABEL_WIDTH = 88;
const TIME_HEADER_HEIGHT = 32;
const SCROLL_IDLE_MS = 300;
const ZOOM_STEP = 1.1;

/** highlightedTripIds の既定値（未指定時）。参照を使い回して余計な再計算を避ける。 */
const EMPTY_TRIP_ID_SET: ReadonlySet<string> = new Set();

type MinuteTick = {
    minute: number;
    x: number;
    isHour: boolean;
    label: string;
};

/**
 * N1 ダイヤグラムの本体（SVG）。
 *
 * 1 日ぶん（4:00〜26:00）を横スクロールする 1 枚の SVG として描く。線の計算（分×駅の y）は
 * 親（route コンポーネント）が受け持ち、本コンポーネントは横の縮尺（pxPerMinute）を掛けて
 * 座標へ直す・見えている範囲（±30分）だけを選ぶ・スクロール/ホイール/ピンチのイベントを
 * 親へ通知するだけの controlled component。
 */
@Component({
    selector: 'app-train-diagram-chart',
    templateUrl: './train-diagram-chart.component.html',
    styleUrl: './train-diagram-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    host: { class: 'tw-block tw-h-full' },
})
export class TrainDiagramChartComponent {
    readonly #injector = inject(Injector);
    readonly #destroyRef = inject(DestroyRef);

    readonly stationRows = input.required<DiagramStationRow[]>();
    readonly lines = input.required<TripDiagramLine[]>();
    /** Task 14: 折り返し（種別変更・列番変更のつながりをまたぐ）の⊐字リンク。線より前（下）に描く。 */
    readonly turnbackLinks = input<TurnbackLink[]>([]);
    readonly bodyHeight = input.required<number>();
    readonly pxPerMinute = input.required<number>();
    readonly axisPxPerMinute = input.required<number>();
    /** 強調中の tripId 集合（選んだ列車が属するつながり全体）。空集合なら何も強調しない。 */
    readonly highlightedTripIds = input<ReadonlySet<string>>(EMPTY_TRIP_ID_SET);
    /** 現在時刻（4 時からの分）。今日のダイヤでなければ null */
    readonly nowMinute = input<number | null>(null);
    readonly jumpRequest = input<DiagramJumpRequest | null>(null);
    /**
     * Task 13: 情報カードに隠れる分だけスクロール領域の下に余白を作る
     * （選択中はカードの高さ + 16、それ以外は 0。root の infoPanelHeight から渡される）。
     */
    readonly bottomInset = input<number>(0);

    readonly tripSelected = output<string | null>();
    readonly tripActivated = output<string>();
    /** スクロールが止まって 300ms 後の左端の分 */
    readonly leftMinuteChange = output<number>();
    readonly pxPerMinuteChange = output<number>();
    readonly axisPxPerMinuteChange = output<number>();

    readonly stationLabelWidth = STATION_LABEL_WIDTH;
    readonly timeHeaderHeight = TIME_HEADER_HEIGHT;

    // NG1053 により viewChild は ES private（#）フィールドに置けないため、
    // 本フィールドのみ TS の private を使う。
    private readonly scrollHost =
        viewChild.required<ElementRef<HTMLDivElement>>('scrollHost');

    /** 見えている範囲（4 時からの分）。スクロールと大きさの変化で 1 コマに 1 回だけ測る */
    readonly #visibleRange = signal({ startMinute: 0, endMinute: 180 });

    readonly svgWidth = computed(
        () => DIAGRAM_TOTAL_MINUTES * this.pxPerMinute(),
    );

    /**
     * 10 分ごとの縦線・時刻の字。見えている範囲の前後だけ（1 日ぶん 133 本を常に描かない）。
     * スマホ幅（400px）では見えている時間が 27 分程度しかなく、正時のみのラベルだと
     * 画面に何も出ないことがあるため、正時以外の 10 分刻みにも字を出す（isHour で判別し、
     * 正時は太字・それ以外は控えめな色でテンプレート側が描き分ける）。
     */
    readonly minuteTicks = computed<MinuteTick[]>(() => {
        const px = this.pxPerMinute();
        const { startMinute, endMinute } = this.#visibleRange();
        const from = Math.max(
            0,
            Math.floor((startMinute - VISIBLE_MARGIN_MINUTES) / 10) * 10,
        );
        const to = Math.min(
            DIAGRAM_TOTAL_MINUTES,
            endMinute + VISIBLE_MARGIN_MINUTES,
        );
        const ticks: MinuteTick[] = [];
        for (let m = from; m <= to; m += 10) {
            ticks.push({
                minute: m,
                x: m * px,
                isHour: m % 60 === 0,
                label: formatHourLabel(m),
            });
        }
        return ticks;
    });

    readonly visibleLines = computed(() =>
        selectVisibleLines(
            this.lines(),
            this.#visibleRange(),
            this.highlightedTripIds(),
        ),
    );

    /**
     * Task 14: 見えている範囲（前後 VISIBLE_MARGIN_MINUTES 分）にかかる折り返しリンクだけを描く。
     * 列車の線と違い、強調中でも範囲外まで常時描画はしない（クリック判定も無いため）。
     */
    readonly visibleTurnbackLinks = computed<TurnbackLink[]>(() => {
        const { startMinute, endMinute } = this.#visibleRange();
        const from = startMinute - VISIBLE_MARGIN_MINUTES;
        const to = endMinute + VISIBLE_MARGIN_MINUTES;
        return this.turnbackLinks().filter(
            (link) => link.maxMinute >= from && link.minMinute <= to,
        );
    });

    /**
     * 直通先ラベル（「→ 渋谷」等）の描画位置。同じ駅の行（同じ y）で複数の直通先ラベルが
     * 重なって描かれる問題への対処として、見えている線の throughLabels から重なりを
     * 間引いた結果を計算する（選んだ列車のラベルは常に残す。place-through-labels.util 参照）。
     */
    readonly placedThroughLabels = computed<PlacedThroughLabel[]>(() =>
        placeThroughLabels(
            this.visibleLines(),
            this.pxPerMinute(),
            this.highlightedTripIds(),
        ),
    );

    x(minute: number): number {
        return minute * this.pxPerMinute();
    }

    /**
     * 直通先ラベルの縦位置。行き先ラベル（anchor:'start'）は線の上（y - 4、従来どおり）、
     * 始発駅ラベル（anchor:'end'）は線の下（y + 11）に描き分ける（Task 16）。
     */
    throughLabelY(label: PlacedThroughLabel): number {
        return label.anchor === 'start' ? label.y - 4 : label.y + 11;
    }

    /**
     * Task 19: 停車分ラベルの縦位置。線がこの停車の後（上り列車の終点は前）で上
     * （y が小さい方）へ向かう 'below' は線の下（y + 10）、それ以外の 'above' は
     * 従来どおり線の上（y - 3）に描く。上り列車は右上へ伸びる線と字が重なるため。
     */
    stopLabelY(label: TripDiagramStopLabel): number {
        return label.side === 'below' ? label.y + 10 : label.y - 3;
    }

    pointsAttr(segment: TripDiagramPoint[]): string {
        const px = this.pxPerMinute();
        return segment.map((p) => `${p.minute * px},${p.y}`).join(' ');
    }

    /**
     * Task 14: 入庫（△）の印の polygon 座標（点を中心にした小さな上向き三角形。
     * サイズは出庫（◯・r=3.5）と揃えて概ね 7px 角）。
     */
    depotTrianglePoints(mark: TripDiagramDepotMark): string {
        const cx = this.x(mark.minute);
        const cy = mark.y;
        return `${cx},${cy - 4} ${cx - 3.8},${cy + 3} ${cx + 3.8},${cy + 3}`;
    }

    isSelected(tripId: string): boolean {
        return this.highlightedTripIds().has(tripId);
    }

    lineOpacity(tripId: string): number {
        const highlighted = this.highlightedTripIds();
        return highlighted.size === 0 || highlighted.has(tripId) ? 1 : 0.15;
    }

    /** 折り返しリンクの両端（着く・発つ列車）のどちらかが強調中か。 */
    isTurnbackHighlighted(link: TurnbackLink): boolean {
        const highlighted = this.highlightedTripIds();
        return (
            highlighted.has(link.arrivingTripId) ||
            highlighted.has(link.departingTripId)
        );
    }

    /**
     * Task 14: どちらかの列車が強調中なら 1、何かを選んでいて両方とも強調外なら 0.15、
     * 何も選んでいなければ 1。
     */
    turnbackLinkOpacity(link: TurnbackLink): number {
        const highlighted = this.highlightedTripIds();
        if (highlighted.size === 0) {
            return 1;
        }
        return this.isTurnbackHighlighted(link) ? 1 : 0.15;
    }

    onLineClick(tripId: string): void {
        if (this.highlightedTripIds().has(tripId)) {
            this.tripActivated.emit(tripId);
            return;
        }
        this.tripSelected.emit(tripId);
    }

    onBackgroundClick(): void {
        if (this.highlightedTripIds().size > 0) {
            this.tripSelected.emit(null);
        }
    }

    #frame: number | null = null;
    #idleTimer: ReturnType<typeof setTimeout> | null = null;

    onScroll(): void {
        this.#scheduleMeasure();
        if (this.#idleTimer !== null) {
            clearTimeout(this.#idleTimer);
        }
        this.#idleTimer = setTimeout(() => {
            this.#idleTimer = null;
            const host = this.scrollHost().nativeElement;
            this.leftMinuteChange.emit(host.scrollLeft / this.pxPerMinute());
        }, SCROLL_IDLE_MS);
    }

    #scheduleMeasure(): void {
        if (this.#frame !== null) {
            return;
        }
        this.#frame = requestAnimationFrame(() => {
            this.#frame = null;
            this.#measure();
        });
    }

    #measure(): void {
        const host = this.scrollHost().nativeElement;
        const px = this.pxPerMinute();
        const width = Math.max(0, host.clientWidth - STATION_LABEL_WIDTH);
        this.#visibleRange.set({
            startMinute: host.scrollLeft / px,
            endMinute: (host.scrollLeft + width) / px,
        });
    }

    #scrollToMinute(
        minute: number,
        align: 'start' | 'quarter' | 'center',
    ): void {
        const host = this.scrollHost().nativeElement;
        const width = Math.max(0, host.clientWidth - STATION_LABEL_WIDTH);
        const offset =
            align === 'start' ? 0 : align === 'quarter' ? width / 4 : width / 2;
        host.scrollLeft = Math.max(0, minute * this.pxPerMinute() - offset);
        this.#measure();
    }

    constructor() {
        // 跳ぶ要求（seq が変わるたびに 1 回）
        effect(() => {
            const request = this.jumpRequest();
            if (!request) {
                return;
            }
            untracked(() =>
                afterNextRender(
                    () => this.#scrollToMinute(request.minute, request.align),
                    { injector: this.#injector },
                ),
            );
        });

        // 横の縮尺が変わっても、画面の中央の時刻を保つ
        let lastPx: number | null = null;
        effect(() => {
            const px = this.pxPerMinute();
            const previous = lastPx;
            lastPx = px;
            if (previous === null || previous === px) {
                return;
            }
            untracked(() => {
                const host = this.scrollHost().nativeElement;
                const width = Math.max(
                    0,
                    host.clientWidth - STATION_LABEL_WIDTH,
                );
                const centerMinute = (host.scrollLeft + width / 2) / previous;
                afterNextRender(
                    () => this.#scrollToMinute(centerMinute, 'center'),
                    {
                        injector: this.#injector,
                    },
                );
            });
        });

        afterNextRender(() => {
            this.#measure();
            if (typeof ResizeObserver === 'undefined') {
                return;
            }
            const observer = new ResizeObserver(() => this.#scheduleMeasure());
            observer.observe(this.scrollHost().nativeElement);
            this.#destroyRef.onDestroy(() => observer.disconnect());
        });

        this.#destroyRef.onDestroy(() => {
            if (this.#frame !== null) {
                cancelAnimationFrame(this.#frame);
            }
            if (this.#idleTimer !== null) {
                clearTimeout(this.#idleTimer);
            }
        });
    }

    /**
     * マウスホイールで縮尺を調整する。ページスクロールと干渉しないよう、
     * Ctrl（Mac は Cmd/metaKey も許容）を押している場合のみズームとして扱う。
     * - Ctrl/Cmd + ホイール: 縦（駅軸）縮尺
     * - Ctrl/Cmd + Shift + ホイール: 横（時間軸）縮尺
     */
    onWheel(event: WheelEvent): void {
        if (!(event.ctrlKey || event.metaKey)) {
            return;
        }
        event.preventDefault();
        const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        if (event.shiftKey) {
            this.pxPerMinuteChange.emit(
                clamp(
                    this.pxPerMinute() * factor,
                    PX_PER_MINUTE_MIN,
                    PX_PER_MINUTE_MAX,
                ),
            );
            return;
        }
        this.axisPxPerMinuteChange.emit(
            clamp(
                this.axisPxPerMinute() * factor,
                AXIS_PX_PER_MINUTE_MIN,
                AXIS_PX_PER_MINUTE_MAX,
            ),
        );
    }

    /** ピンチ操作（2 本指）開始時の指間距離と縮尺を記録する。 */
    #pinchStart: {
        distance: number;
        axisPxPerMinute: number;
        pxPerMinute: number;
    } | null = null;

    onTouchStart(event: TouchEvent): void {
        if (event.touches.length !== 2) {
            this.#pinchStart = null;
            return;
        }
        this.#pinchStart = {
            distance: this.#touchDistance(event),
            axisPxPerMinute: this.axisPxPerMinute(),
            pxPerMinute: this.pxPerMinute(),
        };
    }

    /** ピンチで縦横の縮尺を同時に（等倍で）調整する。 */
    onTouchMove(event: TouchEvent): void {
        if (event.touches.length !== 2 || !this.#pinchStart) {
            return;
        }
        event.preventDefault();
        const ratio = this.#touchDistance(event) / this.#pinchStart.distance;
        this.axisPxPerMinuteChange.emit(
            clamp(
                this.#pinchStart.axisPxPerMinute * ratio,
                AXIS_PX_PER_MINUTE_MIN,
                AXIS_PX_PER_MINUTE_MAX,
            ),
        );
        this.pxPerMinuteChange.emit(
            clamp(
                this.#pinchStart.pxPerMinute * ratio,
                PX_PER_MINUTE_MIN,
                PX_PER_MINUTE_MAX,
            ),
        );
    }

    onTouchEnd(event: TouchEvent): void {
        if (event.touches.length < 2) {
            this.#pinchStart = null;
        }
    }

    #touchDistance(event: TouchEvent): number {
        const [a, b] = [event.touches[0], event.touches[1]];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }
}
