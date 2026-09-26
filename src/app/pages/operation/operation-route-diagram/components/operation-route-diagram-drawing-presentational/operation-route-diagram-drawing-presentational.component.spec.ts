import '@testing-library/jest-dom';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { CalendarDetailsDto } from 'src/app/libs/calendar/usecase/dtos/calendar-details.dto';
import { OperationDetailsDto } from 'src/app/libs/operation/usecase/dtos/operation-details.dto';
import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';

import {
    ROUTE_DIAGRAM_MIN_COLUMN_WIDTH,
    ROUTE_DIAGRAM_SIDE_PAD,
} from '../../utils/operation-route-diagram-fit-columns.util';
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

        it('駅の列はスクロール枠の幅いっぱいに広げる', () => {
            component.availableWidth.set(1312);
            fixture.detectChanges();

            expect(component.svgWidth()).toBeCloseTo(1312);
            const [first, , , , last] = component.stationColumns();
            expect(first.x).toBe(ROUTE_DIAGRAM_SIDE_PAD);
            expect(last.x).toBeCloseTo(1312 - ROUTE_DIAGRAM_SIDE_PAD);
        });

        it('幅が足りないときは列間隔の下限で並べ、枠より広くなる', () => {
            component.availableWidth.set(200);
            fixture.detectChanges();

            expect(component.columnMetrics().columnWidth).toBe(
                ROUTE_DIAGRAM_MIN_COLUMN_WIDTH,
            );
            expect(component.svgWidth()).toBeGreaterThan(200);
        });

        it('トリップ数と同じ本数の行を 44px 間隔で組み立てる', () => {
            const rows = component.bandRows();
            expect(rows.length).toBe(3);
            expect(rows[1].centerY - rows[0].centerY).toBe(44);
        });

        it('急行・快速は standard、回送だけ nonRevenue に分類する', () => {
            const [express, rapid, nonRevenue] = component.bandRows();
            expect(express.style).toBe('standard');
            expect(rapid.style).toBe('standard');
            expect(nonRevenue.style).toBe('nonRevenue');
        });

        it('旅客は種別色、回送は灰で線とチップを塗る', () => {
            const [express, rapid, nonRevenue] = component.bandRows();
            expect(express.color).toBe('#001556');
            expect(express.chipFill).toBe('#001556');
            expect(rapid.color).toBe('#1d88e2');
            expect(nonRevenue.color).toBe('#9e9e9e');
            expect(nonRevenue.chipFill).toBe('#9e9e9e');
        });

        it('回送の列番は「回」を除いた素の数字、チップは「回送」', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.tripNumber).toBe('9301');
            expect(nonRevenue.tripClassName).toBe('回送');
        });

        it('旅客は実線、回送は灰の点線で描く', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const lines = Array.from(svg.querySelectorAll('line'));
            const express = lines.find(
                (l) => l.getAttribute('stroke') === '#001556',
            );
            const nonRevenue = lines.find(
                (l) => l.getAttribute('stroke') === '#9e9e9e',
            );
            expect(express?.getAttribute('stroke-dasharray')).toBeNull();
            expect(nonRevenue?.getAttribute('stroke-dasharray')).toBe('5 3');
        });

        it('種別チップと列番は線の上、区間の中央に置く（行先は出さない）', () => {
            component.availableWidth.set(1312);
            fixture.detectChanges();
            const [express] = component.bandRows();

            expect(express.labelY).toBeLessThan(express.centerY);
            expect(express.chipY + component.CHIP_HEIGHT).toBeLessThan(
                express.centerY,
            );
            const labelEnd =
                express.tripNumberX + express.tripNumber.length * 14 * 0.6;
            expect((express.chipX + labelEnd) / 2).toBeCloseTo(
                (express.leftX + express.rightX) / 2,
            );

            const texts = Array.from(
                (fixture.nativeElement as HTMLElement).querySelectorAll('text'),
            ).map((t) => t.textContent?.trim());
            expect(texts).toContain('急行');
            expect(texts).toContain('5001');
            // 行先の「海老名」は駅名の列にしか出ない
            expect(texts.filter((t) => t === '海老名').length).toBe(1);
        });

        it('時刻は線の高さで、端の外側に置く（左端は左へ、右端は右へ）', () => {
            const [express] = component.bandRows();
            expect(express.leftTimeX).toBeLessThan(express.leftX);
            expect(express.rightTimeX).toBeGreaterThan(express.rightX);

            const svg = fixture.nativeElement as HTMLElement;
            const left = Array.from(svg.querySelectorAll('text')).find(
                (t) => t.textContent?.trim() === '0545',
            );
            expect(left?.getAttribute('text-anchor')).toBe('end');
            expect(Number(left?.getAttribute('y'))).toBe(express.centerY);
        });

        it('端に○・△があるときは、時刻をその分だけ外へよける', () => {
            const [express, rapid, nonRevenue] = component.bandRows();
            // 回送は左端（横浜）で出庫、快速は左端（横浜）で入庫
            expect(express.leftX - express.leftTimeX).toBe(6);
            expect(nonRevenue.leftX - nonRevenue.leftTimeX).toBe(13);
            expect(rapid.leftX - rapid.leftTimeX).toBe(13);
            expect(rapid.rightTimeX - rapid.rightX).toBe(6);
        });

        it('駅 1 つぶんの区間でも、左右の時刻は線の外側に分かれて重ならない', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.rightX - nonRevenue.leftX).toBe(
                component.columnMetrics().columnWidth,
            );
            // 左の時刻は左端より左で終わり、右の時刻は右端より右から始まる
            expect(nonRevenue.leftTimeX).toBeLessThan(nonRevenue.leftX);
            expect(nonRevenue.rightTimeX).toBeGreaterThan(nonRevenue.rightX);
        });

        it('区間が短く図の外へはみ出す端のラベルは、はみ出さない所まで寄せる', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.chipX).toBeGreaterThanOrEqual(0);
        });

        it('前の列車から下りてくる縦線がラベルにかかるときは、縦線の横へずらす', () => {
            fixture.componentRef.setInput('tripOperationLists', [
                tripOperationList({
                    endTime: {
                        stationId: 's-futamatagawa',
                        arrivalTime: '06:10:00',
                    },
                }),
                // 二俣川 → 星川 の駅 1 つぶん。ラベルは区間（40px）より広い
                tripOperationList({
                    tripOperationListId: 'tol-short',
                    startTime: {
                        stationId: 's-futamatagawa',
                        departureTime: '06:20:00',
                    },
                    endTime: {
                        stationId: 's-hoshikawa',
                        arrivalTime: '06:25:00',
                    },
                    trip: {
                        ...tripOperationList().trip,
                        tripNumber: '7001',
                        tripClass: {
                            tripClassId: 'tc-4',
                            tripClassName: '各停',
                            tripClassColor: '#212121',
                        },
                    },
                }),
            ]);
            fixture.detectChanges();

            const [first, short] = component.bandRows();
            const labelWidth =
                short.tripNumberX +
                short.tripNumber.length * 14 * 0.6 -
                short.chipX;
            const labelEnd = short.chipX + labelWidth;
            expect(labelWidth).toBeGreaterThan(short.rightX - short.leftX);
            // 縦線（二俣川）をまたがない
            expect(
                labelEnd <= first.connectorX! - 6 ||
                    short.chipX >= first.connectorX! + 6,
            ).toBe(true);
            // 区間の中央（二俣川と星川の間）に近い側、つまり縦線の左へずらす
            expect(labelEnd).toBeLessThanOrEqual(first.connectorX! - 6);
        });

        it('出庫は白抜きの○、入庫は外接する箱の中心が線と駅に合う白抜きの△', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [, rapid] = component.bandRows();

            expect(
                svg.querySelector('circle[stroke="#001556"][fill="white"]'),
            ).toBeTruthy();

            const points = svg
                .querySelector('polygon')!
                .getAttribute('points')!
                .trim()
                .split(/\s+/)
                .map((pair) => pair.split(',').map(Number));
            const xs = points.map(([x]) => x);
            const ys = points.map(([, y]) => y);
            expect((Math.min(...xs) + Math.max(...xs)) / 2).toBe(
                rapid.depotInX,
            );
            expect((Math.min(...ys) + Math.max(...ys)) / 2).toBe(rapid.centerY);

            const texts = Array.from(svg.querySelectorAll('text')).map(
                (t) => t.textContent,
            );
            expect(texts.some((t) => t?.includes('出庫'))).toBe(false);
            expect(texts.some((t) => t?.includes('入庫'))).toBe(false);
        });

        it('着いた端から次の列車の線まで縦線を下ろし、入庫する列車からは下ろさない', () => {
            const [express, rapid, nonRevenue] = component.bandRows();
            expect(express.connectorX).toBe(express.depotInX);
            expect(express.connectorY1).toBe(express.centerY);
            expect(express.connectorY2).toBe(rapid.centerY);
            expect(express.connectorEndColor).toBe(rapid.color);
            expect(rapid.connectorX).toBeUndefined();
            expect(nonRevenue.connectorX).toBeUndefined();
        });

        it('縦線のグラデーションは userSpaceOnUse で実座標を持つ（幅 0 の直線でも画像出力で消えない）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const [express] = component.bandRows();
            const gradient = svg.querySelector(
                `linearGradient[id="${express.connectorGradientId}"]`,
            );
            expect(gradient?.getAttribute('gradientUnits')).toBe(
                'userSpaceOnUse',
            );
            expect(Number(gradient?.getAttribute('y1'))).toBe(express.centerY);
            const path = svg.querySelector(
                `path[stroke="url(#${express.connectorGradientId})"]`,
            );
            expect(path?.getAttribute('d')).toBe(
                `M ${express.connectorX} ${express.centerY} L ${express.connectorX} ${express.connectorY2}`,
            );
        });

        it('画像出力用の SVG では、縦線にも駅名の高さを足す', () => {
            component.drawingSVGForOutput.set(true);
            fixture.detectChanges();

            const svg = fixture.nativeElement as HTMLElement;
            const [express] = component.outputBandRows();
            const paths = Array.from(
                svg.querySelectorAll(
                    `path[stroke="url(#${express.connectorGradientId})"]`,
                ),
            ).map((p) => p.getAttribute('d'));
            expect(paths).toContain(
                `M ${express.connectorX} ${express.centerY + component.HEADER_HEIGHT} L ${express.connectorX} ${express.connectorY2! + component.HEADER_HEIGHT}`,
            );
        });

        it('画像出力の幅はカードの幅に左右されず、駅数だけで決まる（列間隔 64px）', () => {
            component.availableWidth.set(1312);
            fixture.detectChanges();
            const wide = component.outputColumnMetrics();

            component.availableWidth.set(343);
            fixture.detectChanges();
            const narrow = component.outputColumnMetrics();

            expect(wide).toEqual(narrow);
            expect(narrow.columnWidth).toBe(64);
            expect(narrow.width).toBe(ROUTE_DIAGRAM_SIDE_PAD * 2 + 64 * 4);

            component.drawingSVGForOutput.set(true);
            fixture.detectChanges();
            const outputSvg = (
                fixture.nativeElement as HTMLElement
            ).querySelector('.tw-hidden > svg');
            expect(outputSvg?.getAttribute('width')).toBe(String(narrow.width));
        });

        it('駅名は 1 文字目のベースラインを 14px 下げ、上端で欠けないようにする', () => {
            expect(component.stationYList.split(',')[0]).toBe('14');
        });

        it('画像としてダウンロードするボタンを持つ', () => {
            const appButton = fixture.debugElement.query(By.css('app-button'));
            expect(appButton.nativeElement).toHaveTextContent(
                '画像としてダウンロードする',
            );
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
});
