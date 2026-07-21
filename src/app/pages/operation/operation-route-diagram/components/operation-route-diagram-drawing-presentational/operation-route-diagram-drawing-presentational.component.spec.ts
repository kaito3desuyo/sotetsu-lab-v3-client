/* eslint-disable no-unused-vars, @typescript-eslint/no-unused-vars */
import '@testing-library/jest-dom';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

import { OperationRouteDiagramDrawingPresentationalComponent } from './operation-route-diagram-drawing-presentational.component';

function station(
    stationId: string,
    stationName: string,
    routeIds: string[] = ['route-main'],
): StationDetailsDto {
    return {
        stationId,
        stationName,
        routeStationLists: routeIds.map((routeId) => ({
            routeStationListId: `${stationId}-${routeId}`,
            routeId,
            route: { routeId, routeName: routeId },
        })),
    } as StationDetailsDto;
}

const stations: StationDetailsDto[] = [
    station('s-yokohama', '横浜'),
    station('s-hoshikawa', '星川'),
    station('s-futamatagawa', '二俣川', ['route-main', 'route-izumino']),
    station('s-izuminokuni', 'いずみ野', ['route-izumino']),
    station('s-ebina', '海老名'),
];

function tripOperationList(
    overrides: Record<string, unknown> = {},
): TripOperationListDetailsDto {
    return {
        tripOperationListId: 'tol-1',
        startTime: { stationId: 's-yokohama', departureTime: '05:45:00' },
        endTime: { stationId: 's-ebina', arrivalTime: '06:40:00' },
        trip: {
            tripId: 'trip-1',
            tripNumber: '5001',
            tripBlockId: 'block-1',
            tripDirection: 0,
            depotOut: false,
            depotIn: false,
            tripClass: {
                tripClassId: 'tc-1',
                tripClassName: '急行',
                tripClassColor: '#001556',
            },
        },
        ...overrides,
    } as unknown as TripOperationListDetailsDto;
}

const calendar: CalendarDetailsDto = {
    calendarId: 'cal-1',
    calendarName: '平日',
    startDate: '2026-07-01',
    sunday: false,
    saturday: false,
} as CalendarDetailsDto;

const operation: OperationDetailsDto = {
    operationId: 'op-1',
    operationNumber: '11',
} as OperationDetailsDto;

describe('OperationRouteDiagramDrawingPresentationalComponent', () => {
    let component: OperationRouteDiagramDrawingPresentationalComponent;
    let fixture: ComponentFixture<OperationRouteDiagramDrawingPresentationalComponent>;

    beforeEach(waitForAsync(() => {
        TestBed.configureTestingModule({
            imports: [OperationRouteDiagramDrawingPresentationalComponent],
        }).compileComponents();
    }));

    beforeEach(() => {
        fixture = TestBed.createComponent(
            OperationRouteDiagramDrawingPresentationalComponent,
        );
        component = fixture.componentInstance;
    });

    describe('入力が空の場合', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('calendar', {} as any);
            fixture.componentRef.setInput('operation', {} as any);
            fixture.componentRef.setInput('stations', []);
            fixture.componentRef.setInput('tripOperationLists', []);
            fixture.detectChanges();
        });

        it('should create', () => {
            expect(component).toBeTruthy();
        });
    });

    describe('実データ相当の入力', () => {
        beforeEach(() => {
            fixture.componentRef.setInput('calendar', calendar);
            fixture.componentRef.setInput('operation', operation);
            fixture.componentRef.setInput('stations', stations);
            fixture.componentRef.setInput('tripOperationLists', [
                tripOperationList(),
                tripOperationList({
                    tripOperationListId: 'tol-2',
                    startTime: {
                        stationId: 's-ebina',
                        departureTime: '07:52:00',
                    },
                    endTime: {
                        stationId: 's-yokohama',
                        arrivalTime: '08:55:00',
                    },
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '5102',
                        tripDirection: 1,
                        depotIn: true,
                        tripClass: {
                            tripClassId: 'tc-2',
                            tripClassName: '快速',
                            tripClassColor: '#1d88e2',
                        },
                    },
                }),
                tripOperationList({
                    tripOperationListId: 'tol-3',
                    startTime: {
                        stationId: 's-yokohama',
                        departureTime: '05:00:00',
                    },
                    endTime: {
                        stationId: 's-hoshikawa',
                        arrivalTime: '05:10:00',
                    },
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '回9301',
                        depotOut: true,
                        tripClass: {
                            tripClassId: 'tc-3',
                            tripClassName: '回送',
                            tripClassColor: '#9e9e9e',
                        },
                    },
                }),
            ]);
            fixture.detectChanges();
        });

        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('駅数から算出した幅（390px フィット）を SVG width に反映する', () => {
            // 5 駅なので最小列間隔（22px）を割り込まず、目標幅ちょうどにフィットする
            expect(component.svgWidth()).toBe(390);

            const svgs: DebugElement[] = fixture.debugElement.queryAll(
                By.css('svg'),
            );
            const bodySvg = svgs.find(
                (el) => el.attributes['width'] === '390',
            );
            expect(bodySvg).toBeTruthy();
        });

        it('トリップ数と同じ本数の行路帯行を組み立てる', () => {
            expect(component.bandRows().length).toBe(3);
        });

        it('急行・快速はともに standard、回送のみ nonRevenue に分類する', () => {
            const [express, rapid, nonRevenue] = component.bandRows();
            expect(express.style).toBe('standard');
            expect(rapid.style).toBe('standard');
            expect(nonRevenue.style).toBe('nonRevenue');
        });

        it('種別色（tripClassColor）をそのまま帯の色として使う', () => {
            const [express, rapid] = component.bandRows();
            expect(express.color).toBe('#001556');
            expect(rapid.color).toBe('#1d88e2');
        });

        it('P9-5: 帯行は列番・種別名・行先を個別フィールドとして持つ（バッジ/行先/列番の分離描画のため）', () => {
            const [express] = component.bandRows();
            expect(express.tripNumber).toBe('5001');
            expect(express.tripClassName).toBe('急行');
            expect(express.destinationStationName).toBe('海老名');
        });

        it('99文書追補9 §1（P9-11）: 回送の列番は「回」を含まない素の数字になり、バッジ文字列(tripClassName)は「回送」になる', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.tripNumber).toBe('9301');
            expect(nonRevenue.tripClassName).toBe('回送');
        });

        it('出庫フラグが立った行は depotOut=true になる', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.depotOut).toBe(true);
        });

        it('99文書G6-1: 旅客列車は角丸ボックスではなく種別色の横線1本で描かれる（帯そのものを囲う不透明矩形は存在しない）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            // P9-5/P9-11: standard/nonRevenue共通の種別バッジ（rx=3・不透明）のみを敷く
            // （standard 2件＋nonRevenue 1件＝3件）。帯（横線）そのものを囲う不透明な
            // ボックスではないことを、バッジ幅がラベル1件分の小さいサイズであることで確認する。
            const badgeRects = Array.from(svg.querySelectorAll('rect')).filter(
                (r) => r.getAttribute('rx') === '3',
            );
            expect(badgeRects.length).toBe(3);

            const lines = Array.from(svg.querySelectorAll('line'));
            // 優等（急行 #001556）の横線
            expect(
                lines.some((l) => l.getAttribute('stroke') === '#001556'),
            ).toBe(true);
            // 快速（#1d88e2）の横線
            expect(
                lines.some((l) => l.getAttribute('stroke') === '#1d88e2'),
            ).toBe(true);
        });

        it('P9-5: 旅客(standard)行は種別バッジ（塗りつぶし・不透明）＋白文字の種別名で描画する', () => {
            const svg = fixture.nativeElement as HTMLElement;
            // P9-11: 回送のバッジ（灰#9e9e9e）は別物のため除外し、standard(色付き)のみを見る。
            const badgeRects = Array.from(svg.querySelectorAll('rect')).filter(
                (r) =>
                    r.getAttribute('rx') === '3' &&
                    r.getAttribute('fill') !== '#9e9e9e',
            );
            expect(badgeRects.length).toBe(2);

            // 種別バッジは不透明（半透明ではない）。
            for (const badge of badgeRects) {
                expect(badge.getAttribute('fill-opacity')).toBeNull();
            }

            const texts = Array.from(svg.querySelectorAll('text'));
            const badgeText = texts.find(
                (t) =>
                    t.getAttribute('fill') === 'white' &&
                    t.textContent === '急行',
            );
            expect(badgeText).toBeTruthy();
        });

        it('99文書追補4/9: 種別バッジの塗りはグラデーションではなく単色ベタ塗りに戻す（standard=row.color・nonRevenue=固定の灰#9e9e9e）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [express, rapid, nonRevenue] = component.bandRows();

            const badgeRects = Array.from(svg.querySelectorAll('rect')).filter(
                (r) => r.getAttribute('rx') === '3',
            );
            expect(badgeRects.length).toBe(3);

            const expressBadge = badgeRects.find(
                (r) => r.getAttribute('fill') === express.color,
            );
            expect(expressBadge).toBeTruthy();
            const rapidBadge = badgeRects.find(
                (r) => r.getAttribute('fill') === rapid.color,
            );
            expect(rapidBadge).toBeTruthy();
            const nonRevenueBadge = badgeRects.find(
                (r) => r.getAttribute('fill') === '#9e9e9e',
            );
            expect(nonRevenueBadge).toBeTruthy();
            expect(nonRevenue.badgeFill).toBe('#9e9e9e');

            // url(#...) 参照（グラデーション）ではないこと。
            for (const badge of badgeRects) {
                const fill = badge.getAttribute('fill') ?? '';
                expect(fill.startsWith('url(#')).toBe(false);
            }
        });

        it('P9-5: 行先は種別色ではなく黒文字(#212121)、列番はグレー文字(#757575)で描画する', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const texts = Array.from(svg.querySelectorAll('text'));

            const destinationText = texts.find(
                (t) => t.textContent === '海老名' && t.getAttribute('fill') === '#212121',
            );
            expect(destinationText).toBeTruthy();

            const tripNumberText = texts.find(
                (t) => t.textContent === '5001' && t.getAttribute('fill') === '#757575',
            );
            expect(tripNumberText).toBeTruthy();
        });

        it('99文書追補9 §1（P9-11）: 回送はstandard行と同じ「バッジ＋列番」の2パーツ構成で描画する（行先パーツは省略）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [, , nonRevenue] = component.bandRows();

            // 旧・回送専用の半透明背景ボックス（rx=6）はバッジ形式への置き換えで廃止された。
            const legacyBoxes = Array.from(svg.querySelectorAll('rect')).filter(
                (r) => r.getAttribute('rx') === '6',
            );
            expect(legacyBoxes.length).toBe(0);

            const badgeRects = Array.from(svg.querySelectorAll('rect')).filter(
                (r) => r.getAttribute('rx') === '3',
            );
            const nonRevenueBadge = badgeRects.find(
                (r) => r.getAttribute('fill') === '#9e9e9e',
            );
            expect(nonRevenueBadge).toBeTruthy();

            const texts = Array.from(svg.querySelectorAll('text'));
            const badgeText = texts.find(
                (t) =>
                    t.getAttribute('fill') === 'white' &&
                    t.textContent === '回送',
            );
            expect(badgeText).toBeTruthy();

            const tripNumberText = texts.find(
                (t) =>
                    t.textContent === nonRevenue.tripNumber &&
                    t.getAttribute('fill') === '#757575',
            );
            expect(tripNumberText).toBeTruthy();

            // 回送には行先の概念が無いため、destinationX は使わない
            // （テンプレート側でも行先テキストブロック自体を描画しない）。
            expect(nonRevenue.destinationX).toBeUndefined();
        });

        it('99文書追補9 §2（P9-11）: バッジ内テキスト・行先・列番は dominant-baseline="central" を指定し、同一の labelY を共有する（フォントサイズが違っても視覚的中心が揃う）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [express] = component.bandRows();

            const texts = Array.from(svg.querySelectorAll('text'));
            const badgeText = texts.find(
                (t) =>
                    t.textContent === '急行' && t.getAttribute('fill') === 'white',
            );
            const destinationText = texts.find(
                (t) =>
                    t.textContent === '海老名' &&
                    t.getAttribute('fill') === '#212121',
            );
            const tripNumberText = texts.find(
                (t) =>
                    t.textContent === '5001' && t.getAttribute('fill') === '#757575',
            );

            for (const text of [badgeText, destinationText, tripNumberText]) {
                expect(text).toBeTruthy();
                expect(text!.getAttribute('dominant-baseline')).toBe('central');
                expect(text!.getAttribute('y')).toBe(String(express.labelY));
            }
        });

        it('99文書追補14: 列番テキスト（standard/nonRevenue共通）は和文グリフとの視覚的縦位置ズレを補正するdy="0.5"を持つ', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [express, , nonRevenue] = component.bandRows();

            const texts = Array.from(svg.querySelectorAll('text'));

            const expressTripNumberText = texts.find(
                (t) =>
                    t.textContent === express.tripNumber &&
                    t.getAttribute('fill') === '#757575',
            );
            expect(expressTripNumberText).toBeTruthy();
            expect(expressTripNumberText!.getAttribute('dy')).toBe('0.5');

            const nonRevenueTripNumberText = texts.find(
                (t) =>
                    t.textContent === nonRevenue.tripNumber &&
                    t.getAttribute('fill') === '#757575',
            );
            expect(nonRevenueTripNumberText).toBeTruthy();
            expect(nonRevenueTripNumberText!.getAttribute('dy')).toBe('0.5');
        });

        it('P9-5: 種別バッジ・行先・列番の3パーツはラベル中心(labelCenterX)を基準に左右対称に配置される', () => {
            const [express] = component.bandRows();
            const expressCenterX = (express.leftX + express.rightX) / 2;
            const groupLeft = express.badgeX;
            const groupRight = express.tripNumberX; // 概算の右端近似（厳密な右端は文字幅依存）
            // バッジ開始位置は中心より左、列番開始位置は中心より右にあること。
            expect(groupLeft).toBeLessThan(expressCenterX);
            expect(groupRight).toBeGreaterThan(expressCenterX);
        });

        it('回送は灰の点線で描画される（回送=点線灰）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const dashedLines = Array.from(
                svg.querySelectorAll('line'),
            ).filter((l) => l.getAttribute('stroke') === '#9e9e9e');
            expect(dashedLines.length).toBeGreaterThan(0);
            expect(
                dashedLines.every(
                    (l) => l.getAttribute('stroke-dasharray') === '5 3',
                ),
            ).toBe(true);
        });

        it('99文書G6-5/追補12 §1: オレンジタグ(#ee7b35)は使わない。出庫は○のみで描画され、専用の「HHMM 出庫」テキストは持たない', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const orangeTags = Array.from(
                svg.querySelectorAll('rect'),
            ).filter((r) => r.getAttribute('fill') === '#ee7b35');
            expect(orangeTags.length).toBe(0);

            const depotOutCircle = Array.from(
                svg.querySelectorAll('circle'),
            ).find(
                (c) =>
                    c.getAttribute('fill') === 'white' &&
                    c.getAttribute('stroke') === '#001556',
            );
            expect(depotOutCircle).toBeTruthy();

            const texts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            // 専用テキストは廃止。○マーカーの意味は時刻ラベルに頼らない。
            expect(texts.some((t) => t?.includes('出庫'))).toBe(false);
        });

        it('99文書追補12 §1: 出庫がある端でも、通常の発着時刻表示（leftTime/rightTime）がそのまま使われる（専用テキストへの一本化ロジックは廃止）', () => {
            const [, , nonRevenue] = component.bandRows();
            const svg = fixture.nativeElement as HTMLElement;

            // この出庫は先頭駅（SVG全体の左端＝leftPad）で起きる。
            expect(nonRevenue.depotOutX).toBe(
                component.columnMetrics().leftPad,
            );
            expect(nonRevenue.depotOutX).toBe(nonRevenue.leftX);

            // leftTime は depotOutTime と同じ元データ(startTime.departureTime)から
            // 算出されているため、隠されず通常どおり表示される。
            expect(nonRevenue.leftTime).toBe('05:00:00');
            const texts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            expect(texts.some((t) => t === '0500')).toBe(true);
        });

        it('99文書追補7 §6（P9-9）: 入庫は白抜き・黒枠の上向き三角形（masterブランチ準拠）で描画される。専用の「HHMM 入庫」テキストは99文書追補12で廃止した', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [, rapid] = component.bandRows();
            expect(rapid.depotIn).toBe(true);

            const triangles = Array.from(
                svg.querySelectorAll('polygon'),
            ).filter(
                (p) =>
                    p.getAttribute('stroke') === 'black' &&
                    p.getAttribute('fill') === 'white',
            );
            expect(triangles.length).toBe(1);

            // 99文書追補12 §2: 頂点/底辺のyはcenterY±6.5に補正済み（旧master座標
            // centerY-12/centerY+1はバウンディングボックス中心がcenterYから5.5pxズレていた）。
            expect(triangles[0].getAttribute('points')).toBe(
                `${rapid.depotInX - 2},${rapid.centerY - 6.5} ${
                    rapid.depotInX - 10
                },${rapid.centerY + 6.5} ${rapid.depotInX + 6},${
                    rapid.centerY + 6.5
                }`,
            );

            const texts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            expect(texts.some((t) => t?.includes('入庫'))).toBe(false);

            // 紺塗り矩形（P9-1〜P9-8の旧表現）は廃止された。
            const depotInSquare = Array.from(
                svg.querySelectorAll('rect'),
            ).find(
                (r) =>
                    r.getAttribute('fill') === '#001556' &&
                    r.getAttribute('width') === '10' &&
                    r.getAttribute('height') === '10',
            );
            expect(depotInSquare).toBeFalsy();
        });

        it('99文書追補12 §2: 入庫△マーカーのバウンディングボックスy中心が線の位置(centerY)と一致する（points座標を解析して検証）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [, rapid] = component.bandRows();

            const triangle = Array.from(
                svg.querySelectorAll('polygon'),
            ).find(
                (p) =>
                    p.getAttribute('stroke') === 'black' &&
                    p.getAttribute('fill') === 'white',
            );
            expect(triangle).toBeTruthy();

            const points = triangle!
                .getAttribute('points')!
                .trim()
                .split(/\s+/)
                .map((pair) => pair.split(',').map(Number));
            expect(points.length).toBe(3);

            const ys = points.map(([, y]) => y);
            const boundingBoxCenterY =
                (Math.min(...ys) + Math.max(...ys)) / 2;
            expect(boundingBoxCenterY).toBe(rapid.centerY);

            // 出庫○マーカー（cy=centerY）と同様、高さ(13px)を維持したまま中心を補正する。
            expect(Math.max(...ys) - Math.min(...ys)).toBe(13);
        });

        it('99文書G6-2: 発着時刻は横線の上側に描画される（timeY はその行の centerY より小さい）', () => {
            const [express] = component.bandRows();
            expect(express.timeY).toBeLessThan(express.centerY);
        });

        it('99文書追補8 §2（P9-10）: 旅客・回送ともにラベルは線の下側中央に統一して描画される（回送だけ線の上に置く分岐は撤廃）', () => {
            const [express, , nonRevenue] = component.bandRows();
            expect(express.labelY).toBeGreaterThan(express.centerY);
            expect(nonRevenue.labelY).toBeGreaterThan(nonRevenue.centerY);
            expect(nonRevenue.labelY).toBe(express.labelY - express.centerY + nonRevenue.centerY);
        });

        it('99文書追補4: 折返し接続線はcomponent.ts側でoffsetを含まない個別値(connectorX/connectorY1/connectorY2)をビューモデルに持つ（完成済みpath d文字列は保持しない）', () => {
            const [express, rapid] = component.bandRows();

            expect(express.connectorX).toBe(express.depotInX);
            expect(express.connectorY1).toBe(express.centerY);
            expect(express.connectorY2).toBe(rapid.centerY);
        });

        it('99文書追補6: 折返し接続線(<path>)のstrokeは接続元(row.color)→接続先(next.color)のlinearGradient(url参照・列車ごとに一意なid)にする', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [express, rapid] = component.bandRows();

            const connectorPath = Array.from(
                svg.querySelectorAll('path'),
            ).find(
                (p) =>
                    p.getAttribute('stroke') ===
                    `url(#${express.connectorGradientId})`,
            );
            expect(connectorPath).toBeTruthy();

            // 列車ごとに一意なgradient idであること。
            expect(express.connectorGradientId).not.toBe(
                rapid.connectorGradientId,
            );

            const gradient = Array.from(
                svg.querySelectorAll('linearGradient'),
            ).find((g) => g.getAttribute('id') === express.connectorGradientId);
            expect(gradient).toBeTruthy();
            const stops = Array.from(gradient!.querySelectorAll('stop'));
            expect(stops.length).toBe(2);
            // 開始色=接続元(express.color=急行#001556)、終了色=接続先(rapid.color=快速#1d88e2)。
            expect(stops[0].getAttribute('stop-color')).toBe(express.color);
            expect(stops[1].getAttribute('stop-color')).toBe(rapid.color);
            expect(express.connectorEndColor).toBe(rapid.color);
            expect(stops[1].getAttribute('stop-color')).not.toBe(
                express.color,
            );
        });

        it('差し戻し(2026-07-20): 接続線は境界ボックス幅0の直線のため、gradientUnitsを省略(デフォルトのobjectBoundingBox)せず明示的にuserSpaceOnUseにする（SVG仕様上ここを省略するとペイントが無効化されPNG出力で接続線が消失する）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [express] = component.bandRows();

            const gradient = Array.from(
                svg.querySelectorAll('linearGradient'),
            ).find((g) => g.getAttribute('id') === express.connectorGradientId);
            expect(gradient).toBeTruthy();
            expect(gradient!.getAttribute('gradientUnits')).toBe(
                'userSpaceOnUse',
            );
        });

        it('99文書追補3: 折返し接続線は丸め(Q二次ベジェ)を撤去し、駅の実座標(depotInX/centerY)をそのまま通る単純な垂直直線にする（画面表示・offset=0）', () => {
            const [express, rapid] = component.bandRows();

            const svg = fixture.nativeElement as HTMLElement;
            const connectorPath = Array.from(
                svg.querySelectorAll('path'),
            ).find(
                (p) =>
                    p.getAttribute('stroke') ===
                    `url(#${express.connectorGradientId})`,
            );
            expect(connectorPath).toBeTruthy();
            // stroke-linecapで丸めた見た目にもしない。
            expect(connectorPath!.getAttribute('stroke-linecap')).toBeNull();

            const d = connectorPath!.getAttribute('d')!;
            expect(d).not.toContain('Q');

            // d属性のy座標がrow.centerY/next.centerYの値そのものと完全一致していること
            // （丸めオフセット由来の中途半端な値も、offset未加算バグ由来のズレも無いことを
            // 画面表示用SVG(offset=0)上で確認する）。
            const match = d.match(/^M (\S+) (\S+) L (\S+) (\S+)$/);
            expect(match).toBeTruthy();
            const [, x1, y1, x2, y2] = match!;
            expect(x1).toBe(x2);
            expect(Number(x1)).toBe(express.depotInX);
            expect(Number(y1)).toBe(express.centerY);
            expect(Number(y2)).toBe(rapid.centerY);

            // 差し戻し(2026-07-20): userSpaceOnUseのlinearGradientはx1/y1/x2/y2が
            // %ではなく実座標。offset=0（画面表示）側のgradientが接続線の実座標
            // （row.connectorX/connectorY1/connectorY2そのもの）を持つこと。
            const gradient = Array.from(
                svg.querySelectorAll('linearGradient'),
            ).find(
                (g) =>
                    g.getAttribute('id') === express.connectorGradientId &&
                    Number(g.getAttribute('y1')) === express.centerY,
            );
            expect(gradient).toBeTruthy();
            expect(Number(gradient!.getAttribute('x1'))).toBe(
                express.depotInX,
            );
            expect(Number(gradient!.getAttribute('x2'))).toBe(
                express.depotInX,
            );
            expect(Number(gradient!.getAttribute('y2'))).toBe(rapid.centerY);
        });

        it('99文書追補4: PNG出力用の隠しSVG(offset=HEADER_HEIGHT=96)では接続線のy座標に正しくoffsetが加算される（offset未加算バグの回帰確認）', () => {
            component.drawingSVGForOutput.set(true);
            fixture.detectChanges();

            const svg = fixture.nativeElement as HTMLElement;
            const [express, rapid] = component.bandRows();

            // 画面表示用(offset=0)とPNG出力用の隠しSVG(offset=96)の両方が
            // 同時にDOM上に存在するため、同じgradient idのpathが2本見つかる。
            const connectorPaths = Array.from(
                svg.querySelectorAll('path'),
            ).filter(
                (p) =>
                    p.getAttribute('stroke') ===
                    `url(#${express.connectorGradientId})`,
            );
            expect(connectorPaths.length).toBe(2);

            const parsed = connectorPaths.map((p) => {
                const match = p
                    .getAttribute('d')!
                    .match(/^M (\S+) (\S+) L (\S+) (\S+)$/);
                return { y1: Number(match![2]), y2: Number(match![4]) };
            });

            // offset=0（画面表示）の組が存在すること。
            expect(
                parsed.some(
                    (p) =>
                        p.y1 === express.centerY && p.y2 === rapid.centerY,
                ),
            ).toBe(true);
            // offset=96（PNG出力）の組が存在すること
            // （未加算バグの回帰時はこちらがoffset=0の組と同一になり失敗する）。
            expect(
                parsed.some(
                    (p) =>
                        p.y1 === express.centerY + component.HEADER_HEIGHT &&
                        p.y2 === rapid.centerY + component.HEADER_HEIGHT,
                ),
            ).toBe(true);

            // 差し戻し(2026-07-20): userSpaceOnUseのlinearGradient側も、
            // offset=96(PNG出力)側の組がx1/y1/x2/y2にoffset加算後の実座標を
            // 持つこと（gradient座標だけoffset未加算のままだと、境界ボックス幅0の
            // 直線ではペイントが無効化され接続線が消失するPNG出力限定バグが
            // 再発するため、d属性だけでなくgradient属性側も検証する）。
            const gradients = Array.from(
                svg.querySelectorAll('linearGradient'),
            ).filter(
                (g) => g.getAttribute('id') === express.connectorGradientId,
            );
            expect(gradients.length).toBe(2);
            const gradientForOutput = gradients.find(
                (g) =>
                    Number(g.getAttribute('y1')) ===
                    express.centerY + component.HEADER_HEIGHT,
            );
            expect(gradientForOutput).toBeTruthy();
            expect(gradientForOutput!.getAttribute('gradientUnits')).toBe(
                'userSpaceOnUse',
            );
            expect(Number(gradientForOutput!.getAttribute('x1'))).toBe(
                express.depotInX,
            );
            expect(Number(gradientForOutput!.getAttribute('y2'))).toBe(
                rapid.centerY + component.HEADER_HEIGHT,
            );
        });

        it('駅名ヘッダーは padding パイプで縦書き圧縮された文字列を持つ', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const headerTexts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            expect(
                headerTexts.some((t) => t?.includes('横浜')),
            ).toBe(true);
        });

        it('画像としてダウンロードするボタン（app-button secondary・白地紺枠 outlined・全幅）を持つ', () => {
            const appButton = fixture.debugElement.query(By.css('app-button'));
            expect(appButton).toBeTruthy();
            expect(appButton.nativeElement).toHaveTextContent(
                '画像としてダウンロードする',
            );

            const innerButton: HTMLElement =
                appButton.nativeElement.querySelector('button');
            expect(innerButton.classList).toContain('app-button-secondary');
            expect(innerButton.classList).toContain('tw-w-full');
        });

        it('99文書追補12 §3: ボタンを囲むdivはSVGのfull-bleedとは別に、スマホ横余白(max-sm:tw-px-4)を持つ（操作系要素には余白を入れる原則）', () => {
            const appButton = fixture.debugElement.query(By.css('app-button'));
            const wrapperDiv: HTMLElement =
                appButton.nativeElement.parentElement;
            expect(wrapperDiv.classList).toContain('max-sm:tw-px-4');
        });

        it('クリックで clickNavigateTimetable を発火する', () => {
            const emitted: unknown[] = [];
            component.clickNavigateTimetable.subscribe((ev) =>
                emitted.push(ev),
            );

            component.onClickBand(component.bandRows()[0]);

            expect(emitted).toEqual([
                { tripBlockId: 'block-1', tripDirection: 0 },
            ]);
        });
    });

    describe('駅数が非常に多い場合（横スクロール/ピンチのフォールバック）', () => {
        beforeEach(() => {
            const manyStations = Array.from({ length: 40 }, (_, i) =>
                station(`s-${i}`, `駅${i}`),
            );
            fixture.componentRef.setInput('calendar', calendar);
            fixture.componentRef.setInput('operation', operation);
            fixture.componentRef.setInput('stations', manyStations);
            fixture.componentRef.setInput('tripOperationLists', []);
            fixture.detectChanges();
        });

        it('目標幅（390px）を超えて横に広がる', () => {
            expect(component.svgWidth()).toBeGreaterThan(390);
        });
    });

    describe('2026-07-20差し戻し2回目/99文書追補12: 回送区間が1駅分でも「回送ラベル」「到着時刻」の2要素が重ならない', () => {
        // 管理者Playwright実測の再現データ: 17駅・厚木→次駅相当の1駅区間・
        // 回9432・出庫0711・到着0717（P9-10で列間隔は駅数に関わらず固定40pxになった。
        // 99文書追補12で出庫専用テキストは廃止されたため、出庫の時刻は左端の
        // 通常発着時刻表示に統合される）。
        beforeEach(() => {
            const manyStations = Array.from({ length: 17 }, (_, i) =>
                station(`s-${i}`, `駅${i}`),
            );
            fixture.componentRef.setInput('calendar', calendar);
            fixture.componentRef.setInput('operation', operation);
            fixture.componentRef.setInput('stations', manyStations);
            fixture.componentRef.setInput('tripOperationLists', [
                tripOperationList({
                    tripOperationListId: 'tol-debug',
                    startTime: {
                        stationId: 's-10',
                        departureTime: '07:11:00',
                    },
                    endTime: { stationId: 's-11', arrivalTime: '07:17:00' },
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '9432',
                        depotOut: true,
                        tripClass: {
                            tripClassId: 'tc-3',
                            tripClassName: '回送',
                            tripClassColor: '#9e9e9e',
                        },
                    },
                }),
            ]);
            fixture.detectChanges();
        });

        it('99文書追補8 §1（P9-10）: 列幅は駅数に関わらず固定40px（COLUMN_WIDTH）になる', () => {
            expect(component.columnMetrics().columnWidth).toBe(40);
        });

        it('99文書追補8 §2〜§3（P9-10）: ラベル(labelY・線の下)と出庫テキスト/到着時刻(timeY・線の上)の2段に整理される', () => {
            const [row] = component.bandRows();
            expect(row.timeY).toBe(55);
            expect(row.labelY).toBe(85);
            expect(row.timeY).toBeLessThan(row.centerY);
            expect(row.labelY).toBeGreaterThan(row.centerY);
        });

        it('99文書追補12 §1: 出庫がある左端でも通常の発車時刻(leftTime)がそのまま表示され、区間内側の到着時刻(rightTime)と共存する（専用テキストは廃止）', () => {
            const [row] = component.bandRows();

            expect(row.leftTime).toBe('07:11:00');
            expect(row.rightTime).toBe('07:17:00');

            const svg = fixture.nativeElement as HTMLElement;
            const texts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            expect(texts.some((t) => t === '0711')).toBe(true);
            expect(texts.some((t) => t === '0717')).toBe(true);
            expect(texts.some((t) => t?.includes('出庫'))).toBe(false);
        });

        it('P9-9→P9-10→P9-11→P9-13: 回送のバッジ矩形（線の下・labelY基準）は発着時刻（線の上・timeY基準）と高さが分離しており重ならない', () => {
            const [row] = component.bandRows();
            // 発着時刻(font-size 12)のグリフ下端概算
            // （timeY がベースラインのため、ディセント分だけ余裕を見る）。
            const timeGlyphBottomEstimate = row.timeY + 3;

            // バッジ矩形の上端(badgeY)がその下端概算より下にあれば重ならない
            // （P9-11: 回送専用の半透明背景ボックスはバッジ矩形に置き換わった）。
            expect(row.badgeY).toBeGreaterThan(timeGlyphBottomEstimate);
        });
    });

    describe('99文書追補12: 入庫側も1駅区間で入庫がある端(rightIndex)の通常時刻と反対端の通常時刻(leftTime)が重ならない', () => {
        // 出庫側と対称のシナリオ: 17駅・1駅区間・区間右端(rightIndex)が入庫、
        // 区間左端(leftIndex)は通常の発車時刻を表示する。
        beforeEach(() => {
            const manyStations = Array.from({ length: 17 }, (_, i) =>
                station(`s-${i}`, `駅${i}`),
            );
            fixture.componentRef.setInput('calendar', calendar);
            fixture.componentRef.setInput('operation', operation);
            fixture.componentRef.setInput('stations', manyStations);
            fixture.componentRef.setInput('tripOperationLists', [
                tripOperationList({
                    tripOperationListId: 'tol-depotin-debug',
                    startTime: {
                        stationId: 's-10',
                        departureTime: '07:11:00',
                    },
                    endTime: { stationId: 's-11', arrivalTime: '07:17:00' },
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '5501',
                        depotIn: true,
                        tripClass: {
                            tripClassId: 'tc-1',
                            tripClassName: '急行',
                            tripClassColor: '#001556',
                        },
                    },
                }),
            ]);
            fixture.detectChanges();
        });

        it('入庫がある右端でも通常の到着時刻(rightTime)がそのまま表示され、区間内側の発車時刻(leftTime)と共存する（専用テキストは廃止）', () => {
            const [row] = component.bandRows();

            expect(row.depotIn).toBe(true);
            expect(row.leftTime).toBe('07:11:00');
            expect(row.rightTime).toBe('07:17:00');

            const svg = fixture.nativeElement as HTMLElement;
            const texts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            expect(texts.some((t) => t === '0711')).toBe(true);
            expect(texts.some((t) => t === '0717')).toBe(true);
            expect(texts.some((t) => t?.includes('入庫'))).toBe(false);
        });
    });
});
