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

// 99文書（2026-07-20 モック04実ピクセル裁定）: 描画ジオメトリ定数。
// 実測値はモック04のピクセルサンプリング（11 駅・4 行が 390px 幅に収まる比率）を基準に決めている。
const HEADER_HEIGHT = 96;
// P9-9（99文書追補7 §1）: 全体的な文字サイズ拡大に合わせ、上下の他要素
// （時刻・出庫入庫マーカー・次行の線）と衝突しないよう行間隔を再拡張した
// （70→78。線・接続・時刻・出庫入庫マーカー自体の位置ロジックは変更していない）。
const ROW_HEIGHT = 78;
const ROW_BOTTOM_MARGIN = 24;
// 発着時刻は横線の上側に置くため、先頭行の時刻ラベルがボディ SVG の
// 上端で欠けないよう最初の行だけ余白を確保する。
// P9-9: フォント拡大に伴うオフセット再拡張に合わせて微増（24→26）。
const ROW_TOP_MARGIN = 26;
const STATION_LABEL_CHARS = 6;
// 発着時刻は横線から上に約10px（P9-9: フォント10→12pxの拡大に合わせて8→10）。
// 99文書追補12 §1: 出庫/入庫がある端でも、この通常の発着時刻表示にそのまま
// 統合する（専用の「HHMM 出庫/入庫」テキスト・位置調整ロジックは撤去した）。
const TIME_LABEL_OFFSET = 10;
// 旅客・回送ともにラベルは横線から下に約20px。
// P9-9: ラベルフォント拡大（バッジ/列番 10→12px・行先 12→14px）の分だけ拡大（18→20）。
// 99文書追補8 §2（P9-10）: 回送だけ線の上に置く分岐（旧NON_REVENUE_LABEL_OFFSET）は
// 「回送だけ浮いて見える」指摘を受けて撤廃し、standardと同じこの高さに統一した。
const BELOW_LABEL_OFFSET = 20;

// P9-4（99文書追補: ラベル可読性の折衷）: 線の一筆書き接続(P9-1)は維持しつつ、
// ラベル文字列だけフォントを拡大し、背後に半透明の角丸背景ボックスを敷いて目立たせる。
// P9-5（99文書追補2 §3）で旅客(standard)行はこの背景ボックス表現を廃止し、
// 駅別時刻表/列車位置情報と同じ「種別バッジ塗りつぶし＋行先黒字＋列番グレー字」に
// 置き換えた。P9-11①（99文書追補9 §1）で回送(nonRevenue)もこのバッジ表現に統一し、
// 回送専用の半透明背景ボックス（labelBoxX/Y/Width/Height）は廃止した。
// P9-9（99文書追補7 §1）: 可読性向上のため全体的に文字サイズを2px程度拡大した（12→14）。
const LABEL_FONT_SIZE = 14;

// P9-5: 種別バッジ＋行先＋列番（P9-11で回送はバッジ＋列番の2パーツ）の
// 個別描画用ジオメトリ定数。駅別時刻表(timetable-station-trip-cell)・
// 列車位置情報(train-location-card)の「バッジ塗りつぶし＋白文字」表現をSVGに移植したもの。
// P9-9: バッジ・列番も2px拡大（10→12）。
const BADGE_FONT_SIZE = 12;
const BADGE_PAD_X = 4;
const BADGE_PAD_Y = 2;
const BADGE_RADIUS = 3;
const TRIP_NUMBER_FONT_SIZE = 12;
const LABEL_GROUP_GAP = 4;

// ボックス幅をラベル文字列の長さに応じて可変にするための文字幅概算。
// SVG の getBBox 等で厳密計測せず、全角(日本語)相当=フォントサイズ・
// 半角(英数字)相当=フォントサイズの0.6倍という簡易ヒューリスティックで近似する
// (Unicode コードポイントが Latin-1 範囲(U+0000-U+00FF)なら半角とみなす)。
function estimateLabelTextWidth(text: string, fontSize: number): number {
    let width = 0;
    for (const ch of text) {
        const isHalfWidth = ch.charCodeAt(0) <= 0xff;
        width += isHalfWidth ? fontSize * 0.6 : fontSize;
    }
    return width;
}

// P9-11①（99文書追補9 §1）: 種別バッジ＋（行先）＋列番の横並びレイアウトを
// standard/nonRevenue で共通化するための汎用ヘルパー。中心 x（centerX）を基準に、
// 幅の配列（widths）を gap を挟んで隙間なく左右対称に並べ、各パーツの開始 x
// 座標を返す（要素数が2ならバッジ＋列番、3ならバッジ＋行先＋列番になる）。
function layoutLabelGroup(
    centerX: number,
    widths: number[],
    gap: number,
): number[] {
    const totalWidth =
        widths.reduce((sum, w) => sum + w, 0) + gap * (widths.length - 1);
    let x = centerX - totalWidth / 2;
    return widths.map((w) => {
        const start = x;
        x += w + gap;
        return start;
    });
}

export interface OperationRouteDiagramBandRow {
    tripOperationListId: string;
    tripBlockId?: string;
    tripDirection?: number;
    style: 'nonRevenue' | 'standard';
    color: string;
    /** 列番（素の数字。「回」の前置は buildBandViewModels 側で除去済み）。 */
    tripNumber: string;
    /** 種別名（baseTripClassName 適用済み）。回送では常に「回送」になる。
     * バッジ内の白文字テキストとして standard/nonRevenue 共通で使う。 */
    tripClassName: string;
    /** 行先（終着駅名）。standard の行先黒文字表示にのみ使う。 */
    destinationStationName: string;
    /** ラベル群の y（横線の下側中央。dominant-baseline="central" 採用後は
     * バッジ内テキスト・行先・列番のすべてがこの y を共有する）。 */
    labelY: number;
    /** P9-11①（99文書追補9 §1）: 種別バッジの塗り。standard=row.color、
     * nonRevenue=固定の灰(#9e9e9e。帯の点線・旧背景ボックスと同じ色)。 */
    badgeFill: string;
    /** 種別バッジの矩形ジオメトリ（塗りつぶし・rx=BADGE_RADIUS）。standard/nonRevenue共通。 */
    badgeX: number;
    badgeY: number;
    badgeWidth: number;
    badgeHeight: number;
    /** バッジ内、白文字の種別名テキストの x */
    badgeTextX: number;
    /** 行先（黒太字）テキストの x。回送には行先の概念が無いため undefined
     * （テンプレート側で行先テキストブロック自体を描画しない）。 */
    destinationX?: number;
    /** 列番（グレー）テキストの x。standard/nonRevenue共通。 */
    tripNumberX: number;
    leftX: number;
    rightX: number;
    leftTime?: string;
    rightTime?: string;
    /** 発着時刻の y（横線の上側 約8px）。99文書追補12 §1: 出庫/入庫がある端も
     * この通常の発着時刻表示にそのまま統合する（専用テキストは廃止した）。 */
    timeY: number;
    /** 横線の y（列車の行位置） */
    centerY: number;
    /** 99文書追補12 §1: ○/△マーカー自体が出庫/入庫を意味するため、専用の
     * 「HHMM 出庫/入庫」テキスト（depotOutTime/depotInTime・位置調整フィールド群）は
     * 廃止した。leftTime/rightTime（通常表示）が出庫/入庫がある端でも常に使われる。 */
    depotOut: boolean;
    depotIn: boolean;
    depotOutX: number;
    depotInX: number;
    /** 99文書追補4: 座標はボディSVGローカル原点（0起点。offset未加算）で持つ。
     * offsetの加算はテンプレート側で行う（他要素と同じ原則に統一）。
     * 折返し接続線（縦線）のx座標。最終行/入庫行では undefined（この値の有無を
     * テンプレート側の描画条件にする）。 */
    connectorX?: number;
    /** 折返し接続線の起点y（自身の centerY。offset未加算）。 */
    connectorY1?: number;
    /** 折返し接続線の終点y（次行の centerY。offset未加算）。 */
    connectorY2?: number;
    /** 99文書追補4: 折返し接続線（<path>のstroke）に使う linearGradient の id（列車ごとに一意）。 */
    connectorGradientId: string;
    /** 99文書追補6: グラデーションの終了色。接続元(row.color)から接続先(next.color)へ
     * 変化させるため、次行が存在する行（接続線が実在する行）にのみ next.color を持つ。 */
    connectorEndColor?: string;
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
    readonly STATION_LABEL_CHARS = STATION_LABEL_CHARS;
    readonly LABEL_FONT_SIZE = LABEL_FONT_SIZE;
    readonly BADGE_RADIUS = BADGE_RADIUS;
    readonly BADGE_FONT_SIZE = BADGE_FONT_SIZE;
    readonly TRIP_NUMBER_FONT_SIZE = TRIP_NUMBER_FONT_SIZE;

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

    // 99文書: 行路帯の座標・種別塗り分類・行先ラベルを純関数
    // （buildBandViewModels）から組み立てる。座標計算そのものはこの
    // computed の中だけで完結し、テンプレートにロジックを持たせない。
    //
    // 各列車は「横線1本」（rect の角丸ボックスではない）。1周目で各行の
    // 座標・ラベル・時刻表示可否を確定し、2周目で次行の座標を参照する
    // 折返し接続線（縦線の直線）を付与する（一筆書きの階段状に連なる描画）。
    readonly bandRows = computed<OperationRouteDiagramBandRow[]>(() => {
        const metrics = this.columnMetrics();

        const rows = buildBandViewModels(
            this.tripOperationLists(),
            this.stations(),
        ).map((vm, index) => {
            // 座標はボディ SVG ローカル原点（0 起点）で持つ。ヘッダー分の
            // オフセットはテンプレート側（可視/PNG 出力の両方）で加算する
            // （sticky なヘッダー SVG とボディ SVG を分離描画するため）。
            const centerY = ROW_TOP_MARGIN + index * ROW_HEIGHT + ROW_HEIGHT / 2;

            const leftX = metrics.leftPad + vm.leftIndex * metrics.columnWidth;
            const rightX = metrics.leftPad + vm.rightIndex * metrics.columnWidth;
            const depotOutX =
                metrics.leftPad + vm.depotOutIndex * metrics.columnWidth;
            const depotInX =
                metrics.leftPad + vm.depotInIndex * metrics.columnWidth;
            // 99文書追補8 §2: 回送だけ線の上に置く分岐を撤廃し、standardと同じ
            // 「線の下」に統一する。
            const labelY = centerY + BELOW_LABEL_OFFSET;
            const labelCenterX = (leftX + rightX) / 2;
            // 99文書追補12 §1: 出庫/入庫がある端の時刻は、常にその端の
            // leftTime/rightTime と一致する（buildBandViewModels 側で同じ元データ
            // startTime/endTime から算出されているため）。出庫/入庫専用の位置調整
            // ロジック（resolveDepotTextPlacement・画面端反転・y方向ずらし）は
            // 通常の発着時刻表示に一本化したことで不要になったため撤去した。
            const timeY = centerY - TIME_LABEL_OFFSET;

            // P9-11①（99文書追補9 §1）: 種別バッジ＋（行先）＋列番の横並びレイアウトを
            // standard/nonRevenue で共通化する。回送は行先パーツを持たない
            // （バッジ＋列番の2パーツ）。バッジの文字列（vm.tripClassName）は
            // buildBandViewModels 側で baseTripClassName 適用済みのため、回送では
            // 既に「回送」になっている（追加のハードコード文字列は不要）。
            // バッジの塗りは standard=種別色(vm.color)・nonRevenue=固定の灰
            // （帯の点線・駅グリッドと同じ #9e9e9e。実データの tripClassColor が
            // 何であっても回送は常にこの灰を使う）。
            const badgeFill = vm.style === 'nonRevenue' ? '#9e9e9e' : vm.color;
            const badgeTextWidth = estimateLabelTextWidth(
                vm.tripClassName,
                BADGE_FONT_SIZE,
            );
            const badgeWidth = badgeTextWidth + BADGE_PAD_X * 2;
            const badgeHeight = BADGE_FONT_SIZE + BADGE_PAD_Y * 2;
            const tripNumberWidth = estimateLabelTextWidth(
                vm.tripNumber,
                TRIP_NUMBER_FONT_SIZE,
            );
            const destinationWidth =
                vm.style === 'nonRevenue'
                    ? 0
                    : estimateLabelTextWidth(
                          vm.destinationStationName,
                          LABEL_FONT_SIZE,
                      );

            const groupWidths =
                vm.style === 'nonRevenue'
                    ? [badgeWidth, tripNumberWidth]
                    : [badgeWidth, destinationWidth, tripNumberWidth];
            const groupPositions = layoutLabelGroup(
                labelCenterX,
                groupWidths,
                LABEL_GROUP_GAP,
            );
            const badgeX = groupPositions[0];
            const destinationX =
                vm.style === 'nonRevenue' ? undefined : groupPositions[1];
            const tripNumberX = groupPositions[groupPositions.length - 1];

            // P9-11②（99文書追補9 §2）: dominant-baseline="central"（テンプレート側で
            // 指定）に切り替えたため、フォントサイズが違ってもバッジ内テキスト・
            // 行先・列番のすべてが labelY をそのまま共有できる（旧
            // verticalCenterOffset による近似補正・badgeTextY/tripNumberY の
            // 個別y座標は不要になった）。バッジ矩形のみ、テキストの視覚的中心
            // （= labelY）を挟んで上下対称になるよう配置する。
            const badgeY = labelY - badgeHeight / 2;
            const badgeTextX = badgeX + BADGE_PAD_X;

            // 99文書追補4/6: グラデーションは種別バッジではなく折返し接続線に適用する。
            // 列車ごとに一意な gradient id にしないと、同一ページ内の別列車の定義を
            // 上書きしてしまう。開始色(row.color=接続元)は1周目で確定できるが、
            // 終了色(next.color=接続先)は2周目でしか分からないため、ここでは
            // gradientId のみ確定し、connectorEndColor は2周目で付与する。
            const connectorGradientId = `route-diagram-connector-gradient-${vm.tripOperationListId}`;

            return {
                tripOperationListId: vm.tripOperationListId,
                tripBlockId: vm.tripBlockId,
                tripDirection: vm.tripDirection,
                style: vm.style,
                color: vm.color,
                tripNumber: vm.tripNumber,
                tripClassName: vm.tripClassName,
                destinationStationName: vm.destinationStationName,
                labelY,
                badgeFill,
                badgeX,
                badgeY,
                badgeWidth,
                badgeHeight,
                badgeTextX,
                connectorGradientId,
                destinationX,
                tripNumberX,
                leftX,
                rightX,
                leftTime: vm.leftTime,
                rightTime: vm.rightTime,
                timeY,
                centerY,
                depotOut: vm.depotOut,
                depotIn: vm.depotIn,
                depotOutX,
                depotInX,
            };
        });

        return rows.map((row, index) => {
            const next = rows[index + 1];
            if (row.depotIn || !next) return row;

            // 列車 i の着駅端 x（depotInX）から列車 i+1 の横線 y までを、
            // 駅の実座標をそのまま通る単純な垂直直線で結ぶ（99文書追補3:
            // 丸め処理はオフセットの原因になるため撤去。オリジナルmaster実装と同じ）。
            // 99文書追補4: ここでは完成済みの path d 文字列を作らない
            // （offset加算前に確定させてしまうとテンプレート側のoffset加算の
            // 仕組みに乗らず、PNG出力用の隠しSVG(offset=HEADER_HEIGHT)でだけ
            // ズレるバグの原因になった）。offsetを含まない個別の値のまま
            // ビューモデルへ渡し、offset加算はテンプレート側で行う。
            // 99文書追補6: グラデーションは接続元(row.color)→接続先(next.color)の
            // 種別色変化。next の情報が要るため、connectorEndColor はここでのみ確定する。
            return {
                ...row,
                connectorX: row.depotInX,
                connectorY1: row.centerY,
                connectorY2: next.centerY,
                connectorEndColor: next.color,
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

        // P9-5（99文書追補2 §4）: 画面表示（article > header）と同じ2行構成で
        // ヘッダーを描画する。1行に詰めるとCanvas幅（=SVG幅）を超えて右側が
        // 見切れていた不具合の是正。ファイル名生成用の name は分割前のまま保持する。
        const nameLine1 = `${dayjs(
            this.calendar().startDate,
            'YYYY-MM-DD',
        ).format('YYYY年MM月DD日')}改正`;
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

        // P9-5: 2行分のテキストが収まり上下に余白が残る高さへ拡張（64→96）。
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
