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

        it('帯のラベルに「列番 種別 行先」を含む', () => {
            const [express] = component.bandRows();
            expect(express.label).toBe('5001 急行 海老名');
        });

        it('回送のラベルは列番のみになる', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.label).toBe('回9301');
        });

        it('出庫フラグが立った行は depotOut=true になる', () => {
            const [, , nonRevenue] = component.bandRows();
            expect(nonRevenue.depotOut).toBe(true);
        });

        it('二俣川（本線+いずみ野線に跨る分岐駅）の直後には境界線を引かない', () => {
            // 二俣川の次はいずみ野（いずみ野線単独）で、二俣川自身が
            // いずみ野線にも属するため共通路線を持ち、境界にならない。
            // 星川→二俣川の間（本線のみ→本線+いずみ野線）も共通路線 route-main を持つため境界にならない。
            // 一方 いずみ野→海老名 は共通路線を持たないため境界になる。
            expect(component.boundaryXs().length).toBe(1);
        });

        it('種別塗り言語: 旅客列車は種別を問わず白地+種別色枠。塗りつぶし帯は存在しない（モック04実測裁定）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const rects = Array.from(svg.querySelectorAll('rect')).filter(
                (r) => r.getAttribute('rx') === '6',
            );

            // 優等（急行 #001556）: 白地 + 種別色枠。紺塗りではない。
            const expressRect = rects.find(
                (r) =>
                    r.getAttribute('fill') === '#ffffff' &&
                    r.getAttribute('stroke') === '#001556',
            );
            expect(expressRect).toBeTruthy();

            // 快速（#1d88e2）: 白地 + 種別色枠。
            const rapidRect = rects.find(
                (r) =>
                    r.getAttribute('fill') === '#ffffff' &&
                    r.getAttribute('stroke') === '#1d88e2',
            );
            expect(rapidRect).toBeTruthy();

            // どの角丸帯も塗りつぶし（fill=種別色）になっていないこと。
            const filledBand = rects.find(
                (r) => r.getAttribute('fill') !== '#ffffff',
            );
            expect(filledBand).toBeUndefined();
        });

        it('回送は矩形を描画せず点線を描画する（回送=点線灰）', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const dashedLines = Array.from(
                svg.querySelectorAll('line'),
            ).filter((l) => l.getAttribute('stroke') === '#9e9e9e');
            expect(dashedLines.length).toBeGreaterThan(0);
        });

        it('出庫タグ（オレンジ）が描画される', () => {
            const svg = fixture.nativeElement as HTMLElement;
            const orangeTags = Array.from(
                svg.querySelectorAll('rect'),
            ).filter((r) => r.getAttribute('fill') === '#ee7b35');
            expect(orangeTags.length).toBeGreaterThan(0);
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
});
