import { NgTemplateOutlet } from '@angular/common';
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
    viewChild,
} from '@angular/core';
import { format, parse } from 'date-fns';
import { saveAs } from 'file-saver';
import { PaddingPipe } from 'src/app/core/pipes/padding.pipe';
import { wait } from 'src/app/core/utils/wait';
import { OperationItineraryLinkDto } from 'src/app/libs/operation/usecase/dtos/operation-itinerary-link.dto';
import { ItineraryLinkLabels } from 'src/app/libs/operation/usecase/build-itinerary-link-labels.util';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/usecase/enums/trip.enum';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { CalendarBandComponent } from 'src/app/shared/calendar-band/calendar-band.component';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramFormatStationNamePipe } from '../../pipes/operation-route-diagram-format-station-name.pipe';
import {
    buildBandLabels,
    computeExtraSidePads,
    ROUTE_DIAGRAM_TIME_FONT_SIZE,
} from '../../utils/operation-route-diagram-band-labels.util';
import {
    buildBandRows,
    OperationRouteDiagramBandRow,
    ROUTE_DIAGRAM_CHIP_FONT_SIZE,
    ROUTE_DIAGRAM_CHIP_HEIGHT,
    ROUTE_DIAGRAM_CHIP_RADIUS,
    ROUTE_DIAGRAM_NON_REVENUE_COLOR,
    ROUTE_DIAGRAM_ROW_HEIGHT,
    ROUTE_DIAGRAM_ROW_TOP_MARGIN,
    ROUTE_DIAGRAM_TRIP_NUMBER_FONT_SIZE,
} from '../../utils/operation-route-diagram-build-band-rows.util';
import { buildBandViewModels } from '../../utils/operation-route-diagram-build-band-view-models.util';
import {
    computeColumnMetrics,
    OperationRouteDiagramColumnMetrics,
    ROUTE_DIAGRAM_SIDE_PAD,
} from '../../utils/operation-route-diagram-fit-columns.util';
import {
    buildLinkLabelPlacements,
    ROUTE_DIAGRAM_LINK_LABEL_FONT_SIZE,
} from '../../utils/operation-route-diagram-link-label-placements.util';
import {
    isRouteDiagramOutsideStationId,
    OperationRouteDiagramTripOperationList,
} from '../../utils/operation-route-diagram-reconnect-trip-operation-lists.util';

// 本番の行路図に合わせた描画寸法。字も SVG の中に描く（「画像としてダウンロードする」が
// SVG をそのまま画像にするため。字を HTML に出すと画像から消える）。
const HEADER_HEIGHT = 96;
/** 駅名 1 文字ぶんの送り。1 文字目のベースラインもこの値にして、上端で欠けないようにする */
const STATION_CHAR_STEP = 14;
const STATION_LABEL_CHARS = 6;
const ROW_BOTTOM_MARGIN = 32;
/**
 * 画像出力の列間隔。画面はカードの幅に合わせて広げるが、画像はカードの幅
 * （保存した端末）に左右されないよう、駅数だけで幅が決まる固定の間隔で描く。
 */
const OUTPUT_COLUMN_WIDTH = 64;
/** 「図外」の列の見出しの色（grey-500） */
const OUTSIDE_HEADER_COLOR = '#9e9e9e';

@Component({
    selector: 'app-operation-route-diagram-drawing',
    templateUrl: './operation-route-diagram-drawing.component.html',
    styleUrl: './operation-route-diagram-drawing.component.scss',
    imports: [
        NgTemplateOutlet,
        PaddingPipe,
        OperationRouteDiagramFormatStationNamePipe,
        AppButtonComponent,
        CalendarBandComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationRouteDiagramDrawingComponent {
    readonly HEADER_HEIGHT = HEADER_HEIGHT;
    readonly STATION_LABEL_CHARS = STATION_LABEL_CHARS;
    readonly TIME_FONT_SIZE = ROUTE_DIAGRAM_TIME_FONT_SIZE;
    readonly CHIP_FONT_SIZE = ROUTE_DIAGRAM_CHIP_FONT_SIZE;
    readonly CHIP_HEIGHT = ROUTE_DIAGRAM_CHIP_HEIGHT;
    readonly CHIP_RADIUS = ROUTE_DIAGRAM_CHIP_RADIUS;
    readonly TRIP_NUMBER_FONT_SIZE = ROUTE_DIAGRAM_TRIP_NUMBER_FONT_SIZE;
    readonly NON_REVENUE_COLOR = ROUTE_DIAGRAM_NON_REVENUE_COLOR;
    readonly OUTSIDE_HEADER_COLOR = OUTSIDE_HEADER_COLOR;
    readonly LINK_LABEL_FONT_SIZE = ROUTE_DIAGRAM_LINK_LABEL_FONT_SIZE;

    readonly drawingSVGForOutput = signal(false);

    readonly calendar = input.required<CalendarDetailsDto>();
    readonly operation = input.required<OperationDetailsDto>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripOperationLists =
        input.required<OperationRouteDiagramTripOperationList[]>();

    /** 前後・途中の運用の文言。点の横に絵の中で描く */
    readonly linkLabels = input<ItineraryLinkLabels | null>(null);
    /** 車両の前後の運用。入出庫の端が乗り移りなら □ で描く。取れなければ空 */
    readonly itineraryLinks = input<OperationItineraryLinkDto[]>([]);

    readonly clickNavigateTimetable =
        output<OperationRouteDiagramNavigateTimetable>();

    /** 図を載せるスクロール枠の幅。駅の列はこの幅いっぱいに広げる */
    private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
    readonly availableWidth = signal(0);

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar && (calendar.sunday || calendar.saturday);
    });

    readonly bandViewModels = computed(() =>
        buildBandViewModels(
            this.tripOperationLists(),
            this.stations(),
            this.itineraryLinks(),
        ),
    );
    readonly bandLabels = computed(() =>
        this.bandViewModels().map((vm) => buildBandLabels(vm, this.stations())),
    );

    readonly extraSidePads = computed(() =>
        computeExtraSidePads(
            this.bandViewModels(),
            this.bandLabels(),
            this.stations().length,
        ),
    );

    readonly columnMetrics = computed(() =>
        computeColumnMetrics(
            this.stations().length,
            this.availableWidth(),
            this.extraSidePads().left,
            this.extraSidePads().right,
        ),
    );

    readonly svgWidth = computed(() => this.columnMetrics().width);

    readonly outputColumnMetrics = computed(() => {
        const gaps = Math.max(this.stations().length - 1, 0);
        const { left, right } = this.extraSidePads();
        return computeColumnMetrics(
            this.stations().length,
            ROUTE_DIAGRAM_SIDE_PAD * 2 +
                left +
                right +
                OUTPUT_COLUMN_WIDTH * gaps,
            left,
            right,
        );
    });

    readonly bodyHeight = computed(
        () =>
            ROUTE_DIAGRAM_ROW_TOP_MARGIN +
            Math.max(this.tripOperationLists().length - 1, 0) *
                ROUTE_DIAGRAM_ROW_HEIGHT +
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
                fill: isRouteDiagramOutsideStationId(station.stationId)
                    ? OUTSIDE_HEADER_COLOR
                    : '#212121',
                x,
                xList: Array(STATION_LABEL_CHARS).fill(x).join(','),
            };
        });
    }

    readonly stationYList = Array.from(
        { length: STATION_LABEL_CHARS },
        (_, i) => STATION_CHAR_STEP * (i + 1),
    ).join(',');

    readonly bandRows = computed(() =>
        buildBandRows(
            this.bandViewModels(),
            this.bandLabels(),
            this.columnMetrics(),
        ),
    );
    readonly outputBandRows = computed(() =>
        buildBandRows(
            this.bandViewModels(),
            this.bandLabels(),
            this.outputColumnMetrics(),
        ),
    );

    readonly linkLabelPlacements = computed(() =>
        this.#placeLinkLabels(this.bandRows(), this.columnMetrics().width),
    );
    readonly outputLinkLabelPlacements = computed(() =>
        this.#placeLinkLabels(
            this.outputBandRows(),
            this.outputColumnMetrics().width,
        ),
    );

    #placeLinkLabels(rows: ReturnType<typeof buildBandRows>, width: number) {
        const labels = this.linkLabels();
        if (!labels) return [];
        return buildLinkLabelPlacements({
            rows,
            tripIds: this.tripOperationLists().map(({ trip }) => trip.tripId),
            labels,
            width,
        });
    }

    private readonly svgElement = viewChild<ElementRef>('svgElement');

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
        const revisedOn = format(
            parse(this.calendar().startDate, 'yyyy-MM-dd', new Date()),
            'yyyy/M/d',
        );
        const name = `${revisedOn}改正 ${this.calendar().calendarName} ${
            this.operation().operationNumber
        }運 運用行路図`;

        // 画面の見出しと同じ 2 行にする（1 行だと Canvas の幅を超えて右が切れる）
        const nameLine1 = `${revisedOn}改正`;
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

        const svgUrl = getSvgUrl(this.svgElement());
        const image = await svgUrlToImageElement(svgUrl);
        URL.revokeObjectURL(svgUrl);
        const canvas = createCanvasElement(image);
        saveAs(canvas.toDataURL(), `${name.replace(/ /g, '_')}.png`);

        this.drawingSVGForOutput.set(false);
    }
}
