import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TimetableStationTripCellComponent } from './timetable-station-trip-cell.component';

/**
 * 実データ相当のミニマムな trip（横浜・上りの 各停6436。同一 tripBlock に
 * 回送9436 を持つ通し運行）。値は dev DB の実例（trip_number 6436/9436）に基づく。
 * 9436 は 6436 より**前**の区間。↪ に「この先」だけを出す確認のため、6436 の後に
 * 横浜を出る回送 9437 を架空で足している（dev DB の実例ではない）。
 */
const times6436 = [
    {
        timeId: 'time-1',
        stationId: 'shonandai',
        stopSequence: 1,
        departureTime: '06:20:00',
        departureDays: 1,
        arrivalTime: null,
        arrivalDays: null,
    },
    {
        timeId: 'time-2',
        stationId: 'yokohama',
        stopSequence: 10,
        departureTime: null,
        departureDays: null,
        arrivalTime: '06:45:00',
        arrivalDays: 1,
    },
];

const trip9436 = {
    tripId: 'trip-9436',
    tripNumber: '9436',
    tripClassId: 'class-kaisou',
    tripDirection: 0,
    tripBlockId: 'block-1',
    times: [
        {
            timeId: 'time-3',
            stationId: 'kashiwadai',
            stopSequence: 1,
            departureTime: '05:50:00',
            departureDays: 1,
        },
        {
            timeId: 'time-4',
            stationId: 'shonandai',
            stopSequence: 5,
            arrivalTime: '06:10:00',
            arrivalDays: 1,
        },
    ],
    tripOperationLists: [],
};

const trip9437 = {
    tripId: 'trip-9437',
    tripNumber: '9437',
    tripClassId: 'class-kaisou',
    tripDirection: 1,
    tripBlockId: 'block-1',
    times: [
        {
            timeId: 'time-5',
            stationId: 'yokohama',
            stopSequence: 1,
            departureTime: '06:55:00',
            departureDays: 1,
        },
        {
            timeId: 'time-6',
            stationId: 'kashiwadai',
            stopSequence: 20,
            arrivalTime: '07:40:00',
            arrivalDays: 1,
        },
    ],
    tripOperationLists: [],
};

const trip6436 = {
    tripId: 'trip-6436',
    tripNumber: '6436',
    tripClassId: 'class-local',
    tripDirection: 0,
    tripBlockId: 'block-1',
    times: times6436,
    tripOperationLists: [{ operationId: 'op-1' }],
    tripBlock: {
        tripBlockId: 'block-1',
        trips: [
            trip9436,
            {
                tripId: 'trip-6436',
                tripNumber: '6436',
                tripClassId: 'class-local',
                times: times6436,
                tripOperationLists: [],
            },
            trip9437,
        ],
    },
} as never;

describe('TimetableStationTripCellComponent', () => {
    async function createFixture(overrides?: {
        operationSightingTimeCrossSections?: Record<string, unknown>;
        showCurrentFormation?: boolean;
    }) {
        await TestBed.configureTestingModule({
            imports: [TimetableStationTripCellComponent],
            providers: [provideRouter([])],
        }).compileComponents();

        const fixture = TestBed.createComponent(
            TimetableStationTripCellComponent,
        );
        fixture.componentRef.setInput('trip', trip6436);
        fixture.componentRef.setInput('calendarId', 'cal-1');
        fixture.componentRef.setInput('stationId', 'yokohama');
        fixture.componentRef.setInput('tripClasses', [
            {
                tripClassId: 'class-local',
                tripClassName: '各停',
                tripClassColor: '#888888',
            },
            {
                tripClassId: 'class-kaisou',
                tripClassName: '回送',
                tripClassColor: '#aaaaaa',
            },
        ]);
        fixture.componentRef.setInput('stations', [
            { stationId: 'yokohama', stationName: '横浜' },
            { stationId: 'shonandai', stationName: '湘南台' },
            { stationId: 'kashiwadai', stationName: 'かしわ台' },
        ]);
        fixture.componentRef.setInput('operations', [
            { operationId: 'op-1', operationNumber: '51' },
        ]);
        fixture.componentRef.setInput(
            'operationSightingTimeCrossSections',
            overrides?.operationSightingTimeCrossSections ?? {},
        );
        fixture.componentRef.setInput(
            'showCurrentFormation',
            overrides?.showCurrentFormation ?? false,
        );
        fixture.detectChanges();
        return fixture;
    }

    it('通し運行の脚注行（↪ 種別 列番 発駅 → 着駅）を「この先」の列車だけ描画する', async () => {
        const fixture = await createFixture();
        const text = (fixture.nativeElement as HTMLElement).textContent;

        expect(text).toContain('↪');
        // 矢印は mat-icon のリガチャ（arrow_forward）なので textContent に名前で出る
        expect(text).toMatch(/9437\s*横浜\s*arrow_forward\s*かしわ台/);
        // 前の区間（回送 9436 かしわ台 → 湘南台）は出さない
        expect(text).not.toContain('9436');
    });

    it('充当編成を operationNumber キーの Record から直接引いて表示する', async () => {
        const fixture = await createFixture({
            showCurrentFormation: true,
            operationSightingTimeCrossSections: {
                '51': {
                    latestSighting: {
                        sightingTime: new Date().toISOString(),
                    },
                    expectedSighting: {
                        formation: { formationNumber: '10708' },
                    },
                },
            },
        });
        const text = (fixture.nativeElement as HTMLElement).textContent;

        expect(text).toContain('10708');
        expect(text).not.toContain('不明');
    });

    // 目撃の無い編成は推測なので「?」を付ける。日数のパイプに undefined を渡すと
    // dayjs が「今」とみなし、今日の目撃に見えてしまう（Angular 22 で ?. が undefined を返す）
    it('目撃が無く推測だけの編成には「?」を付ける', async () => {
        const fixture = await createFixture({
            showCurrentFormation: true,
            operationSightingTimeCrossSections: {
                '51': {
                    latestSighting: null,
                    expectedSighting: {
                        formation: { formationNumber: '10708' },
                    },
                },
            },
        });
        const text = (fixture.nativeElement as HTMLElement).textContent;

        expect(text).toContain('10708?');
    });

    // 全線時刻表へは列車番号から飛ぶ。分はリンクにしない（ユーザー指示 2026-10-05）
    it('全線時刻表へのリンクは列車番号（本体と脚注）だけで、分はリンクにしない', async () => {
        const fixture = await createFixture();
        const el = fixture.nativeElement as HTMLElement;
        const links = Array.from(
            el.querySelectorAll<HTMLAnchorElement>(
                'a[href*="/timetable/all-line"]',
            ),
        );

        expect(links.map((a) => a.textContent?.trim())).toEqual([
            '6436',
            '9437',
        ]);
        expect(links.every((a) => a.classList.contains('tw-underline'))).toBe(
            true,
        );
    });
});
