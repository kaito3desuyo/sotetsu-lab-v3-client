import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    afterNextRender,
    computed,
    inject,
    input,
    linkedSignal,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import {
    StationAxis,
    StationAxisEntry,
    enforceMinimumRowGap,
    timeToX,
} from 'src/app/shared/diagram-scale';
import { DIAGRAM_ZOOM_LEVELS } from '../../stores/train-diagram.store';
import {
    TripDiagramLine,
    TripDiagramPoint,
    buildTripDiagramLine,
} from '../../utils/build-trip-diagram-line.util';
import { RouteIdsByStation } from '../../utils/build-route-ids-by-station.util';

const HEADER_HEIGHT = 32;
const AXIS_PX_PER_MINUTE = 6;
const WINDOW_MINUTES = 60;
const STATION_LABEL_WIDTH = 72;
const OUT_OF_WINDOW_MARGIN_PX = 120;
/**
 * 駅ラベル行の最小ピクセル高さ（G7: 駅軸ラベルの重なり解消）。
 * 12px の tw-text-xs ラベルが重ならない最小値。所要時間比は維持しつつ、
 * 高速通過区間で駅間隔が潰れる場合のみこの値まで底上げする（enforceMinimumRowGap）。
 */
const MIN_ROW_HEIGHT_PX = 22;

// ホイール/ピンチによる縮尺調整の範囲と 1 ノッチあたりの倍率。
const AXIS_PX_PER_MINUTE_MIN = 2;
const AXIS_PX_PER_MINUTE_MAX = 24;
const PX_PER_MINUTE_MIN = 4;
const PX_PER_MINUTE_MAX = 40;
const ZOOM_STEP = 1.1;

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

type TimeGridMark = { x: number; label: string };
type StationRow = { stationId: string; stationName: string; y: number };

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

/**
 * N1 ダイヤグラムの本体（SVG）。
 * 時間×距離の斜め線ダイヤグラム本体を描画し、列車線タップで強調表示・情報パネル起動の
 * イベントを親へ通知する（自身は選択状態を保持しない = controlled component）。
 */
@Component({
    selector: 'app-train-diagram-chart',
    templateUrl: './train-diagram-chart.component.html',
    styleUrl: './train-diagram-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [],
    host: { class: 'tw-block' },
})
export class TrainDiagramChartComponent {
    readonly #destroyRef = inject(DestroyRef);

    readonly stations = input.required<StationDetailsDto[]>();
    readonly axis = input.required<StationAxis | null>();
    /**
     * 駅ID → 所属routeId集合（選択路線に限定）。経由しない分岐区間で線を分断する判定に使う
     * （build-trip-diagram-line.util.ts）。未指定（既定=空Map）の場合は分断しない。
     */
    readonly routeIdsByStation = input<RouteIdsByStation>(new Map());
    readonly tripBlocksByDirection =
        input.required<Record<number, TripBlockDetailsDto[]>>();
    readonly windowStartHour = input.required<number>();
    readonly pxPerMinute = input.required<number>();
    readonly selectedTripId = input<string | null>(null);
    readonly isTodaySelected = input<boolean>(false);

    readonly tripSelected = output<string | null>();
    readonly tripActivated = output<string>();

    readonly #now = signal(new Date());

    /**
     * 縮尺（ローカル状態）。
     * - 横（時間軸）: 親の pxPerMinute（縮小/標準/拡大ボタン由来）を初期値に取り、
     *   Ctrl(Cmd)+Shift+ホイール／ピンチで連続的に上書きする。ボタンで pxPerMinute が変わると再同期される。
     * - 縦（駅軸）: Ctrl(Cmd)+ホイール／ピンチで連続的に調整する。
     */
    readonly #horizontalPxPerMinute = linkedSignal(() => this.pxPerMinute());
    readonly #axisPxPerMinute = signal(AXIS_PX_PER_MINUTE);

    // NG1053 により viewChild は ES private（#）フィールドに置けないため、
    // 本フィールドのみ TS の private を使う。
    private readonly scrollHost =
        viewChild.required<ElementRef<HTMLDivElement>>('scrollHost');
    /** 横スクロール領域のうち SVG が使える幅（駅ラベル列を除く）。ResizeObserver で追従する。 */
    readonly #availableChartWidth = signal(0);

    /** 60 分ぶんがコンテナ幅にちょうど収まる縮尺。未計測時は 0。 */
    readonly #fitPxPerMinute = computed(() => {
        const available = this.#availableChartWidth();
        return available > 0 ? available / WINDOW_MINUTES : 0;
    });

    /**
     * ズーム段（絶対 px/分）をコンテナ幅に合わせて底上げする倍率。
     *
     * 表示窓は常に 60 分固定なので、横方向の縮尺は「何分ぶん見えるか」ではなく
     * 密度・可読性だけを決める。よって標準段はコンテナ幅ちょうどが正しい既定になる。
     * 幅が標準描画（10px/分 = 600px）より狭いモバイルでは 1 倍のままとし、
     * 既存の挙動を変えない。
     */
    readonly #widthScale = computed(() => {
        const fit = this.#fitPxPerMinute();
        if (fit <= 0) {
            return 1;
        }
        return Math.max(1, fit / DIAGRAM_ZOOM_LEVELS.standard);
    });

    /**
     * 時間軸の実効縮尺。
     *
     * 標準縮尺は 10px/分 = 600px 固定だったため、1456px 幅では右側 856px が常に
     * 空いていた（audit M2）。ズーム段に #widthScale を掛けて幅に追随させ、
     * さらに fit を下限に敷いて空白が出ないようにする。
     * 拡大側は下限に飲まれず、はみ出した分は従来どおり横スクロールする。
     */
    readonly #effectivePxPerMinute = computed(() =>
        Math.max(
            this.#fitPxPerMinute(),
            this.#horizontalPxPerMinute() * this.#widthScale(),
        ),
    );

    readonly svgWidth = computed(
        () => WINDOW_MINUTES * this.#effectivePxPerMinute(),
    );
    readonly stationLabelWidth = STATION_LABEL_WIDTH;
    readonly timeLabelY = HEADER_HEIGHT - 12;

    readonly #baseTime = computed(() => getRailwayDate(this.#now()).getTime());
    readonly #windowStartTime = computed(
        () => this.#baseTime() + this.windowStartHour() * 60 * 60 * 1000,
    );

    readonly #axisStationIds = computed(
        () => new Set(this.stations().map((s) => s.stationId)),
    );
    /** stationId → 駅名。axis のエントリ（複製された分岐駅を含む）から駅名を引くために使う。 */
    readonly #stationNameById = computed(
        () => new Map(this.stations().map((s) => [s.stationId, s.stationName])),
    );

    /**
     * ピクセル換算済みの駅軸（axis の y を axisPxPerMinute で乗算した後、
     * enforceMinimumRowGap で最小行高を底上げしたもの）。
     * stationRows（ラベル位置）と lines（列車線の y 座標）の両方がこれを参照することで、
     * ラベルと線のズレなく「所要時間比を維持しつつ最小行高を確保」する（G7）。
     */
    readonly #pixelAxis = computed<StationAxisEntry[] | null>(() => {
        const axis = this.axis();
        if (!axis) {
            return null;
        }
        const axisPxPerMinute = this.#axisPxPerMinute();
        const scaled = axis.map((entry) => ({
            stationId: entry.stationId,
            y: entry.y * axisPxPerMinute,
        }));
        return enforceMinimumRowGap(scaled, MIN_ROW_HEIGHT_PX);
    });

    readonly svgHeight = computed(() => {
        const pixelAxis = this.#pixelAxis();
        const maxY =
            pixelAxis && pixelAxis.length > 0
                ? Math.max(...pixelAxis.map((entry) => entry.y))
                : 0;
        return HEADER_HEIGHT + maxY + 24;
    });

    /**
     * 駅ラベル列（グリッド線含む）。axis 配列の各エントリをそのまま描画するため、
     * 分岐駅（複製挿入された接続駅）は複数行として二重表示される。
     */
    readonly stationRows = computed<StationRow[]>(() => {
        const pixelAxis = this.#pixelAxis();
        if (!pixelAxis) {
            return [];
        }
        const nameById = this.#stationNameById();
        return pixelAxis.map((entry) => ({
            stationId: entry.stationId,
            stationName: nameById.get(entry.stationId) ?? '',
            y: HEADER_HEIGHT + entry.y,
        }));
    });

    readonly timeGridMarks = computed<TimeGridMark[]>(() => {
        const startHour = this.windowStartHour();
        const pxPerMinute = this.#effectivePxPerMinute();
        const marks: TimeGridMark[] = [];
        for (
            let minuteOffset = 0;
            minuteOffset <= WINDOW_MINUTES;
            minuteOffset += 10
        ) {
            const hour = startHour + Math.floor(minuteOffset / 60);
            const minute = minuteOffset % 60;
            marks.push({
                x: minuteOffset * pxPerMinute,
                label: `${hour}:${pad2(minute)}`,
            });
        }
        return marks;
    });

    readonly lines = computed<TripDiagramLine[]>(() => {
        const pixelAxis = this.#pixelAxis();
        if (!pixelAxis) {
            return [];
        }

        const axisStationIds = this.#axisStationIds();
        const routeIdsByStation = this.routeIdsByStation();
        const base = new Date(this.#baseTime());
        const windowStart = new Date(this.#windowStartTime());
        const pxPerMinute = this.#effectivePxPerMinute();
        const width = this.svgWidth();

        const trips = Object.values(this.tripBlocksByDirection())
            .flat()
            .flatMap((block) => block.trips ?? []);

        return trips
            .map((trip) =>
                buildTripDiagramLine({
                    trip,
                    // pixelAxis は既に axisPxPerMinute で乗算 + 最小行高を適用済みのため、
                    // ここでは axisPxPerMinute=1（二重乗算を避ける。stationRows と同一の y を使う）。
                    axis: pixelAxis,
                    axisStationIds,
                    routeIdsByStation,
                    base,
                    windowStart,
                    pxPerMinute,
                    axisPxPerMinute: 1,
                    headerHeight: HEADER_HEIGHT,
                }),
            )
            .filter((line): line is TripDiagramLine => !!line)
            .filter((line) =>
                line.segments.some((segment) =>
                    segment.some(
                        (p) =>
                            p.x >= -OUT_OF_WINDOW_MARGIN_PX &&
                            p.x <= width + OUT_OF_WINDOW_MARGIN_PX,
                    ),
                ),
            );
    });

    readonly cursorX = computed(() =>
        timeToX(
            (this.#now().getTime() - this.#windowStartTime()) / (60 * 1000),
            this.#effectivePxPerMinute(),
        ),
    );

    /**
     * 描画順を選択中トリップが最後（= 最前面）になるよう並べ替えたもの。
     * SVG は後勝ち描画のため、選択ラインを他ラインの上に見せるにはこの並べ替えが必要。
     */
    readonly orderedLines = computed<TripDiagramLine[]>(() => {
        const selected = this.selectedTripId();
        const lines = this.lines();
        if (!selected) {
            return lines;
        }
        const others = lines.filter((line) => line.tripId !== selected);
        const selectedLines = lines.filter((line) => line.tripId === selected);
        return [...others, ...selectedLines];
    });

    constructor() {
        interval(1000)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => {
                this.#now.set(new Date());
            });

        // コンテナ幅を観測して時間軸の実効縮尺に反映する（#effectivePxPerMinute）。
        // ResizeObserver が無い環境（jsdom 等）では観測せず、利用者指定の縮尺のみで描画する。
        afterNextRender(() => {
            if (typeof ResizeObserver === 'undefined') {
                return;
            }
            const host = this.scrollHost().nativeElement;
            const observer = new ResizeObserver((entries) => {
                const width = entries[0]?.contentRect.width ?? 0;
                this.#availableChartWidth.set(
                    Math.max(0, width - STATION_LABEL_WIDTH),
                );
            });
            observer.observe(host);
            this.#destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    pointsAttr(segment: TripDiagramPoint[]): string {
        return segment.map((p) => `${p.x},${p.y}`).join(' ');
    }

    /** 選択中トリップ番号ラベルの基点（先頭 segment の先頭点）。 */
    firstPoint(line: TripDiagramLine): TripDiagramPoint | undefined {
        return line.segments[0]?.[0];
    }

    isSelected(tripId: string): boolean {
        return this.selectedTripId() === tripId;
    }

    lineOpacity(tripId: string): number {
        const selected = this.selectedTripId();
        return !selected || selected === tripId ? 1 : 0.15;
    }

    onLineClick(tripId: string): void {
        if (this.selectedTripId() === tripId) {
            this.tripActivated.emit(tripId);
            return;
        }
        this.tripSelected.emit(tripId);
    }

    onBackgroundClick(): void {
        if (this.selectedTripId() !== null) {
            this.tripSelected.emit(null);
        }
    }

    /**
     * マウスホイールで縮尺を調整する。ページスクロールと干渉しないよう、
     * Ctrl（Mac は Cmd/metaKey も許容）を押している場合のみズームとして扱う。
     * - Ctrl/Cmd + ホイール: 縦（駅軸）縮尺
     * - Ctrl/Cmd + Shift + ホイール: 横（時間軸）縮尺
     * 修飾キーなしの素の wheel / Shift+wheel は通常のページスクロールに委ねる（何もしない）。
     * 上スクロール（deltaY<0）で拡大、下スクロールで縮小。ズームとして処理する場合のみ
     * preventDefault してブラウザ標準のズーム動作を抑止する。
     */
    onWheel(event: WheelEvent): void {
        const isZoomModifierPressed = event.ctrlKey || event.metaKey;
        if (!isZoomModifierPressed) {
            return;
        }
        event.preventDefault();
        const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
        if (event.shiftKey) {
            this.#horizontalPxPerMinute.update((value) =>
                clamp(value * factor, PX_PER_MINUTE_MIN, PX_PER_MINUTE_MAX),
            );
            return;
        }
        this.#axisPxPerMinute.update((value) =>
            clamp(
                value * factor,
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
            axisPxPerMinute: this.#axisPxPerMinute(),
            pxPerMinute: this.#horizontalPxPerMinute(),
        };
    }

    /** ピンチで縦横の縮尺を同時に（等倍で）調整する。 */
    onTouchMove(event: TouchEvent): void {
        if (event.touches.length !== 2 || !this.#pinchStart) {
            return;
        }
        event.preventDefault();
        const ratio = this.#touchDistance(event) / this.#pinchStart.distance;
        this.#axisPxPerMinute.set(
            clamp(
                this.#pinchStart.axisPxPerMinute * ratio,
                AXIS_PX_PER_MINUTE_MIN,
                AXIS_PX_PER_MINUTE_MAX,
            ),
        );
        this.#horizontalPxPerMinute.set(
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
