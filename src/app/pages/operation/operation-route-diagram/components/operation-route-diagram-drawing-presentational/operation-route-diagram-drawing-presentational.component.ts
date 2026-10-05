import { CommonModule } from '@angular/common';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
    ViewChild,
    viewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { wait } from 'src/app/core/utils/wait';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { CalendarBandComponent } from 'src/app/shared/calendar-band/calendar-band.component';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramFormatStationNamePipe } from '../../pipes/operation-route-diagram-format-station-name.pipe';
import { buildBandViewModels } from '../../utils/operation-route-diagram-build-band-view-models.util';
import {
    computeColumnMetrics,
    OperationRouteDiagramColumnMetrics,
    ROUTE_DIAGRAM_SIDE_PAD,
} from '../../utils/operation-route-diagram-fit-columns.util';

// 本番の行路図に合わせた描画寸法。字も SVG の中に描く（「画像としてダウンロードする」が
// SVG をそのまま画像にするため。字を HTML に出すと画像から消える）。
const HEADER_HEIGHT = 96;
/** 駅名 1 文字ぶんの送り。1 文字目のベースラインもこの値にして、上端で欠けないようにする */
const STATION_CHAR_STEP = 14;
const STATION_LABEL_CHARS = 6;
/** 行の間隔。本番は 40px。線の上に種別チップを載せるぶん、上の行と離して 44px にする */
const ROW_HEIGHT = 44;
/** 先頭行の線の y。線の上に載るラベルが上端で欠けない分 */
const ROW_TOP_MARGIN = 32;
const ROW_BOTTOM_MARGIN = 24;

/** 時刻の字の大きさ。時刻は線の高さの中央、端の外側に置く（本番と同じ） */
const TIME_FONT_SIZE = 14;
/** 線の端から時刻までの間。端に○・△があるときはそれをよける */
const TIME_GAP = 6;
const TIME_GAP_WITH_MARKER = 13;

/** 種別チップ＋列番は線の上、区間の中央に置く。線からチップの中心までの高さ */
const LABEL_OFFSET = 17;
// 種別チップは app-trip-class-chip（md）と同じ寸法: 12px 太字・左右 6px・高さ 19px・角丸 4px
const CHIP_FONT_SIZE = 12;
const CHIP_PAD_X = 6;
const CHIP_HEIGHT = 19;
const CHIP_RADIUS = 4;
const TRIP_NUMBER_FONT_SIZE = 14;
const LABEL_GAP = 4;
/** ラベルと図の左右の端の間 */
const LABEL_EDGE_GAP = 4;
/** ラベルを縦線の横へずらすときの、縦線との間 */
const LABEL_CONNECTOR_GAP = 6;
/**
 * 画像出力の列間隔。画面はカードの幅に合わせて広げるが、画像はカードの幅
 * （保存した端末）に左右されないよう、駅数だけで幅が決まる固定の間隔で描く。
 */
const OUTPUT_COLUMN_WIDTH = 64;
/** 回送のチップと線の色（grey-500） */
const NON_REVENUE_COLOR = '#9e9e9e';

/**
 * 字の幅の概算。getBBox で測らず、全角は字の大きさ、半角（Latin-1）はその 0.6 倍とみなす。
 */
function estimateTextWidth(text: string, fontSize: number): number {
    let width = 0;
    for (const ch of text) {
        width += ch.charCodeAt(0) <= 0xff ? fontSize * 0.6 : fontSize;
    }
    return width;
}

/**
 * ラベル（種別チップ＋列番）の左端の x を決める。区間の中央に置くのが基本。
 *
 * 前の列車から下りてくる縦線はラベルの高さを通るので、区間が短い（直通で先の駅が
 * 隠れる・駅 1 つぶんの回送など）ラベルにかかるときは、縦線の横へずらす。
 * ずらす向きは、区間の中央に近い側。図の外へははみ出させない。
 */
function placeLabel(
    labelWidth: number,
    centerX: number,
    incomingX: number | undefined,
    svgWidth: number,
): number {
    const clamp = (x: number) =>
        Math.min(
            Math.max(x, LABEL_EDGE_GAP),
            svgWidth - LABEL_EDGE_GAP - labelWidth,
        );
    const crosses = (x: number) =>
        incomingX !== undefined &&
        x - LABEL_CONNECTOR_GAP < incomingX &&
        incomingX < x + labelWidth + LABEL_CONNECTOR_GAP;

    const centered = clamp(centerX - labelWidth / 2);
    if (!crosses(centered)) return centered;

    const candidates = [
        clamp(incomingX! + LABEL_CONNECTOR_GAP),
        clamp(incomingX! - LABEL_CONNECTOR_GAP - labelWidth),
    ].filter((x) => !crosses(x));
    if (candidates.length === 0) return centered;

    const distance = (x: number) => Math.abs(x + labelWidth / 2 - centerX);
    return candidates.reduce((a, b) => (distance(b) < distance(a) ? b : a));
}

export interface OperationRouteDiagramBandRow {
    tripOperationListId: string;
    tripBlockId?: string;
    tripDirection?: number;
    style: 'nonRevenue' | 'standard';
    /** 線の色。回送は灰 */
    color: string;
    /** 列番（「回」は除いた素の数字） */
    tripNumber: string;
    /** 種別名（系統の「（…）」は除去済み）。回送は「回送」 */
    tripClassName: string;
    /** 種別チップの塗り。旅客は種別色、回送は灰 */
    chipFill: string;
    chipX: number;
    chipY: number;
    chipWidth: number;
    chipTextX: number;
    tripNumberX: number;
    /** 種別チップと列番の中心の y */
    labelY: number;
    /** 線の y */
    centerY: number;
    leftX: number;
    rightX: number;
    leftTime?: string;
    rightTime?: string;
    /** 左端の時刻の x（text-anchor="end"。左端の外側） */
    leftTimeX: number;
    /** 右端の時刻の x（text-anchor="start"。右端の外側） */
    rightTimeX: number;
    depotOut: boolean;
    depotIn: boolean;
    depotOutX: number;
    depotInX: number;
    /** 次の列車へ下ろす縦線の x。入庫する列車・最後の列車では無い */
    connectorX?: number;
    connectorY1?: number;
    connectorY2?: number;
    /** 縦線のグラデーションの id（列車ごとに一意） */
    connectorGradientId: string;
    /** 縦線のグラデーションの終わりの色（次の列車の色） */
    connectorEndColor?: string;
}

@Component({
    selector: 'app-operation-route-diagram-drawing-presentational',
    templateUrl:
        './operation-route-diagram-drawing-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-drawing-presentational.component.scss',
    ],
    imports: [
        CommonModule,
        PipesModule,
        DateFnsPipe,
        OperationRouteDiagramFormatStationNamePipe,
        AppButtonComponent,
        CalendarBandComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationRouteDiagramDrawingPresentationalComponent {
    readonly HEADER_HEIGHT = HEADER_HEIGHT;
    readonly STATION_LABEL_CHARS = STATION_LABEL_CHARS;
    readonly TIME_FONT_SIZE = TIME_FONT_SIZE;
    readonly CHIP_FONT_SIZE = CHIP_FONT_SIZE;
    readonly CHIP_HEIGHT = CHIP_HEIGHT;
    readonly CHIP_RADIUS = CHIP_RADIUS;
    readonly TRIP_NUMBER_FONT_SIZE = TRIP_NUMBER_FONT_SIZE;
    readonly NON_REVENUE_COLOR = NON_REVENUE_COLOR;

    readonly drawingSVGForOutput = signal(false);

    readonly calendar = input.required<CalendarDetailsDto>();
    readonly operation = input.required<OperationDetailsDto>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripOperationLists =
        input.required<TripOperationListDetailsDto[]>();

    readonly clickNavigateTimetable =
        output<OperationRouteDiagramNavigateTimetable>();

    /** 図を載せるスクロール枠の幅。駅の列はこの幅いっぱいに広げる */
    private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
    readonly availableWidth = signal(0);

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar && (calendar.sunday || calendar.saturday);
    });

    readonly columnMetrics = computed(() =>
        computeColumnMetrics(this.stations().length, this.availableWidth()),
    );

    readonly svgWidth = computed(() => this.columnMetrics().width);

    readonly outputColumnMetrics = computed(() => {
        const gaps = Math.max(this.stations().length - 1, 0);
        return computeColumnMetrics(
            this.stations().length,
            ROUTE_DIAGRAM_SIDE_PAD * 2 + OUTPUT_COLUMN_WIDTH * gaps,
        );
    });

    readonly bodyHeight = computed(
        () =>
            ROW_TOP_MARGIN +
            Math.max(this.tripOperationLists().length - 1, 0) * ROW_HEIGHT +
            ROW_BOTTOM_MARGIN,
    );

    // 駅名は 1 文字ずつ縦に積む。SVG の x・y は文字ごとの値をカンマ区切りで取れるので、
    // 同じ x と 1 文字ずつ下がる y を並べる（padding パイプで 6 文字にそろえて下詰めにする）。
    readonly stationColumns = computed(() =>
        this.#buildStationColumns(this.columnMetrics()),
    );
    readonly outputStationColumns = computed(() =>
        this.#buildStationColumns(this.outputColumnMetrics()),
    );

    #buildStationColumns(metrics: OperationRouteDiagramColumnMetrics) {
        return this.stations().map((station, index) => {
            const x = metrics.leftPad + index * metrics.columnWidth;
            return {
                stationId: station.stationId,
                stationName: station.stationName,
                x,
                xList: Array(STATION_LABEL_CHARS).fill(x).join(','),
            };
        });
    }

    readonly stationYList = Array.from(
        { length: STATION_LABEL_CHARS },
        (_, i) => STATION_CHAR_STEP * (i + 1),
    ).join(',');

    // 各列車は横線 1 本。両端の時刻は線の外側、種別チップ＋列番は線の上の中央。
    // 列車の着いた端から次の列車の線まで縦線を下ろして、一筆書きの階段にする。
    readonly bandRows = computed(() =>
        this.#buildBandRows(this.columnMetrics()),
    );
    readonly outputBandRows = computed(() =>
        this.#buildBandRows(this.outputColumnMetrics()),
    );

    #buildBandRows(
        metrics: OperationRouteDiagramColumnMetrics,
    ): OperationRouteDiagramBandRow[] {
        const xOf = (index: number) =>
            metrics.leftPad + index * metrics.columnWidth;

        const viewModels = buildBandViewModels(
            this.tripOperationLists(),
            this.stations(),
        );
        const rows = viewModels.map((vm, index) => {
            const centerY = ROW_TOP_MARGIN + index * ROW_HEIGHT;
            const leftX = xOf(vm.leftIndex);
            const rightX = xOf(vm.rightIndex);

            const hasMarkerAt = (stationIndex: number) =>
                (vm.depotOut && vm.depotOutIndex === stationIndex) ||
                (vm.depotIn && vm.depotInIndex === stationIndex);
            const leftTimeX =
                leftX -
                (hasMarkerAt(vm.leftIndex) ? TIME_GAP_WITH_MARKER : TIME_GAP);
            const rightTimeX =
                rightX +
                (hasMarkerAt(vm.rightIndex) ? TIME_GAP_WITH_MARKER : TIME_GAP);

            const isNonRevenue = vm.style === 'nonRevenue';
            const color = isNonRevenue ? NON_REVENUE_COLOR : vm.color;
            const chipWidth =
                estimateTextWidth(vm.tripClassName, CHIP_FONT_SIZE) +
                CHIP_PAD_X * 2;
            const labelWidth =
                chipWidth +
                LABEL_GAP +
                estimateTextWidth(vm.tripNumber, TRIP_NUMBER_FONT_SIZE);
            const previous = viewModels[index - 1];
            const chipX = placeLabel(
                labelWidth,
                (leftX + rightX) / 2,
                previous && !previous.depotIn
                    ? xOf(previous.depotInIndex)
                    : undefined,
                metrics.width,
            );
            const labelY = centerY - LABEL_OFFSET;

            return {
                tripOperationListId: vm.tripOperationListId,
                tripBlockId: vm.tripBlockId,
                tripDirection: vm.tripDirection,
                style: vm.style,
                color,
                tripNumber: vm.tripNumber,
                tripClassName: vm.tripClassName,
                chipFill: color,
                chipX,
                chipY: labelY - CHIP_HEIGHT / 2,
                chipWidth,
                chipTextX: chipX + CHIP_PAD_X,
                tripNumberX: chipX + chipWidth + LABEL_GAP,
                labelY,
                centerY,
                leftX,
                rightX,
                leftTime: vm.leftTime,
                rightTime: vm.rightTime,
                leftTimeX,
                rightTimeX,
                depotOut: vm.depotOut,
                depotIn: vm.depotIn,
                depotOutX: xOf(vm.depotOutIndex),
                depotInX: xOf(vm.depotInIndex),
                connectorGradientId: `route-diagram-connector-gradient-${vm.tripOperationListId}`,
            };
        });

        // 縦線の座標は画面表示・画像出力で共通の、ヘッダー分を足す前の値で持つ
        // （足すのはテンプレート側。画像出力の SVG だけヘッダーの高さを足す）。
        return rows.map((row, index) => {
            const next = rows[index + 1];
            if (row.depotIn || !next) return row;

            return {
                ...row,
                connectorX: row.depotInX,
                connectorY1: row.centerY,
                connectorY2: next.centerY,
                connectorEndColor: next.color,
            };
        });
    }

    @ViewChild('svgElement') svgElement: ElementRef;

    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const scroller = this.scroller()?.nativeElement;
            if (!scroller) return;

            this.availableWidth.set(scroller.clientWidth);
            if (typeof ResizeObserver === 'undefined') return;

            const observer = new ResizeObserver(() => {
                this.availableWidth.set(scroller.clientWidth);
            });
            observer.observe(scroller);
            destroyRef.onDestroy(() => observer.disconnect());
        });
    }

    onClickBand(row: OperationRouteDiagramBandRow): void {
        if (!row.tripBlockId || row.tripDirection === undefined) return;

        this.clickNavigateTimetable.emit({
            tripBlockId: row.tripBlockId,
            tripDirection: row.tripDirection as ETripDirection,
        });
    }

    async downloadAsPng() {
        const name = `${dayjs(this.calendar().startDate, 'YYYY-MM-DD').format(
            'YYYY/M/D',
        )}改正 ${this.calendar().calendarName} ${
            this.operation().operationNumber
        }運 運用行路図`;

        // 画面の見出しと同じ 2 行にする（1 行だと Canvas の幅を超えて右が切れる）
        const nameLine1 = `${dayjs(
            this.calendar().startDate,
            'YYYY-MM-DD',
        ).format('YYYY/M/D')}改正`;
        const nameLine2 = `${this.calendar().calendarName} ${
            this.operation().operationNumber
        }運`;

        const font =
            "24px -apple-system, BlinkMacSystemFont, Roboto, 'Yu Gothic UI', '游ゴシック体', YuGothic, 'Yu Gothic Medium', sans-serif";

        const color = this.isHolidayCalendar()
            ? 'rgb(217, 83, 79)'
            : 'rgb(66, 139, 202)';

        const getSvgUrl = (svgElementRef: ElementRef) => {
            const svgText = new XMLSerializer().serializeToString(
                svgElementRef.nativeElement,
            );
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const svgUrl = URL.createObjectURL(svgBlob);
            return svgUrl;
        };

        const svgUrlToImageElement = async (svgUrl: string) => {
            const image = new Image();
            image.src = svgUrl;
            await new Promise((resolve) => {
                image.onload = () => {
                    resolve(undefined);
                };
            });
            return image;
        };

        const HEADER_CANVAS_HEIGHT = 96;

        const createCanvasElement = (image: HTMLImageElement) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height + HEADER_CANVAS_HEIGHT + 16;
            const ctx = canvas.getContext('2d');

            // header
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, image.width, HEADER_CANVAS_HEIGHT);
            ctx.font = font;
            ctx.fillStyle = 'white';
            ctx.fillText(nameLine1, 16, 42);
            ctx.fillText(nameLine2, 16, 74);

            // base
            ctx.fillStyle = 'white';
            ctx.fillRect(
                0,
                HEADER_CANVAS_HEIGHT,
                image.width,
                image.height + HEADER_CANVAS_HEIGHT + 16,
            );

            // svg
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                0,
                HEADER_CANVAS_HEIGHT + 16,
                image.width,
                image.height,
            );

            return canvas;
        };

        this.drawingSVGForOutput.set(true);
        await wait(0);

        const svgUrl = getSvgUrl(this.svgElement);
        const image = await svgUrlToImageElement(svgUrl);
        URL.revokeObjectURL(svgUrl);
        const canvas = createCanvasElement(image);
        saveAs(canvas.toDataURL(), `${name.replace(/ /g, '_')}.png`);

        this.drawingSVGForOutput.set(false);
    }
}
