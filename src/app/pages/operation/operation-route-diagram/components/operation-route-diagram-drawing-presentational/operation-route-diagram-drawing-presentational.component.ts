import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    input,
    output,
    signal,
    ViewChild,
} from '@angular/core';
import dayjs from 'dayjs';
import { saveAs } from 'file-saver';
import { DateFnsPipe } from 'src/app/core/pipes/dateFns.pipe';
import { PipesModule } from 'src/app/core/pipes/pipes.module';
import { borderAfterStation } from 'src/app/core/utils/border-after-station.util';
import { wait } from 'src/app/core/utils/wait';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { AppButtonComponent } from 'src/app/shared/app-button/app-button.component';
import { OperationRouteDiagramNavigateTimetable } from '../../interfaces/operation-route-diagram.interface';
import { OperationRouteDiagramFormatStationNamePipe } from '../../pipes/operation-route-diagram-format-station-name.pipe';
import { buildBandViewModels } from '../../utils/operation-route-diagram-build-band-view-models.util';
import { computeColumnMetrics } from '../../utils/operation-route-diagram-fit-columns.util';

// G6（モック04）: 描画ジオメトリ定数。実測値はモック04のピクセルサンプリング
// （11 駅・4 行が 390px 幅に収まる比率）を基準に決めている。
const HEADER_HEIGHT = 96;
const ROW_HEIGHT = 50;
const BAND_HEIGHT = 22;
const ROW_BOTTOM_MARGIN = 24;
// 出庫/入庫のオレンジタグは行の上に張り出すため、先頭行がボディ SVG の
// 上端で欠けないよう最初の行だけ余白を確保する。
const ROW_TOP_MARGIN = 18;
const STATION_LABEL_CHARS = 6;

export interface OperationRouteDiagramBandRow {
    tripOperationListId: string;
    tripBlockId?: string;
    tripDirection?: number;
    style: 'nonRevenue' | 'standard';
    color: string;
    label: string;
    leftX: number;
    rightX: number;
    leftTime?: string;
    rightTime?: string;
    bandTop: number;
    centerY: number;
    depotOut: boolean;
    depotIn: boolean;
    depotOutX: number;
    depotInX: number;
}

@Component({
    selector: 'app-operation-route-diagram-drawing-presentational',
    templateUrl: './operation-route-diagram-drawing-presentational.component.html',
    styleUrls: [
        './operation-route-diagram-drawing-presentational.component.scss',
    ],
    imports: [
        CommonModule,
        PipesModule,
        DateFnsPipe,
        OperationRouteDiagramFormatStationNamePipe,
        AppButtonComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OperationRouteDiagramDrawingPresentationalComponent {
    readonly HEADER_HEIGHT = HEADER_HEIGHT;
    readonly BAND_HEIGHT = BAND_HEIGHT;
    readonly STATION_LABEL_CHARS = STATION_LABEL_CHARS;

    readonly drawingSVGForOutput = signal(false);

    readonly calendar = input.required<CalendarDetailsDto>();
    readonly operation = input.required<OperationDetailsDto>();
    readonly stations = input.required<StationDetailsDto[]>();
    readonly tripOperationLists =
        input.required<TripOperationListDetailsDto[]>();

    readonly clickNavigateTimetable =
        output<OperationRouteDiagramNavigateTimetable>();

    readonly isHolidayCalendar = computed(() => {
        const calendar = this.calendar();
        return !!calendar && (calendar.sunday || calendar.saturday);
    });

    // G6: 「390px に全経由駅をフィット」させる列間隔（駅数に応じて自動で狭まる）。
    readonly columnMetrics = computed(() =>
        computeColumnMetrics(this.stations().length),
    );

    readonly svgWidth = computed(() => this.columnMetrics().width);

    readonly bodyHeight = computed(
        () =>
            ROW_TOP_MARGIN +
            this.tripOperationLists().length * ROW_HEIGHT +
            ROW_BOTTOM_MARGIN,
    );

    // G6: 駅名の縦書き圧縮（1 文字ずつ縦積み）。SVG の `x`/`dy` は
    // カンマ区切りで文字ごとの値を取れるため、`xList` に同じ x を
    // 文字数分並べておくと `dy` の垂直オフセットだけで縦積みできる
    // （padding パイプで 6 文字化した文字列と組み合わせる既存踏襲の手法）。
    readonly stationColumns = computed(() => {
        const metrics = this.columnMetrics();
        return this.stations().map((station, index) => {
            const x = metrics.leftPad + index * metrics.columnWidth;
            return {
                stationId: station.stationId,
                stationName: station.stationName,
                x,
                xList: Array(STATION_LABEL_CHARS).fill(x).join(','),
            };
        });
    });

    // G6: 路線境界の二重縦罫線。境界判定はデータ駆動の borderAfterStation
    // （B6 で導入・全線時刻表の罫線ロジックと共有）を再利用する。
    readonly boundaryXs = computed<number[]>(() => {
        const metrics = this.columnMetrics();
        const flags = borderAfterStation(this.stations());

        return flags.reduce<number[]>((xs, flag, index) => {
            if (!flag) return xs;
            return [...xs, metrics.leftPad + (index + 0.5) * metrics.columnWidth];
        }, []);
    });

    // G6: 行路帯の座標・種別塗り分類・行先ラベルを純関数
    // （buildBandViewModels）から組み立てる。座標計算そのものはこの
    // computed の中だけで完結し、テンプレートにロジックを持たせない。
    readonly bandRows = computed<OperationRouteDiagramBandRow[]>(() => {
        const metrics = this.columnMetrics();

        return buildBandViewModels(
            this.tripOperationLists(),
            this.stations(),
        ).map((vm, index) => {
            // 座標はボディ SVG ローカル原点（0 起点）で持つ。ヘッダー分の
            // オフセットはテンプレート側（可視/PNG 出力の両方）で加算する
            // （sticky なヘッダー SVG とボディ SVG を分離描画するため）。
            // ROW_TOP_MARGIN は先頭行の出庫オレンジタグが上端で欠けないための余白。
            const bandTop = ROW_TOP_MARGIN + index * ROW_HEIGHT;
            const centerY = bandTop + BAND_HEIGHT / 2;
            const label =
                vm.style === 'nonRevenue'
                    ? vm.tripNumber
                    : `${vm.tripNumber} ${vm.tripClassName} ${vm.destinationStationName}`;

            return {
                tripOperationListId: vm.tripOperationListId,
                tripBlockId: vm.tripBlockId,
                tripDirection: vm.tripDirection,
                style: vm.style,
                color: vm.color,
                label,
                leftX: metrics.leftPad + vm.leftIndex * metrics.columnWidth,
                rightX: metrics.leftPad + vm.rightIndex * metrics.columnWidth,
                leftTime: vm.leftTime,
                rightTime: vm.rightTime,
                bandTop,
                centerY,
                depotOut: vm.depotOut,
                depotIn: vm.depotIn,
                depotOutX: metrics.leftPad + vm.depotOutIndex * metrics.columnWidth,
                depotInX: metrics.leftPad + vm.depotInIndex * metrics.columnWidth,
            };
        });
    });

    @ViewChild('svgElement') svgElement: ElementRef;

    onClickBand(row: OperationRouteDiagramBandRow): void {
        if (!row.tripBlockId || row.tripDirection === undefined) return;

        this.clickNavigateTimetable.emit({
            tripBlockId: row.tripBlockId,
            tripDirection: row.tripDirection as ETripDirection,
        });
    }

    async downloadAsPng() {
        const name = `${dayjs(this.calendar().startDate, 'YYYY-MM-DD').format(
            'YYYY年MM月DD日',
        )}改正 ${this.calendar().calendarName} ${
            this.operation().operationNumber
        }運 運用行路図`;

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

        const createCanvasElement = (image: HTMLImageElement) => {
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height + 64 + 16;
            const ctx = canvas.getContext('2d');

            // header
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, image.width, 64);
            ctx.font = font;
            ctx.fillStyle = 'white';
            ctx.fillText(name, 16, 42);

            // base
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 64, image.width, image.height + 64 + 16);

            // svg
            ctx.drawImage(
                image,
                0,
                0,
                image.width,
                image.height,
                0,
                64 + 16,
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
