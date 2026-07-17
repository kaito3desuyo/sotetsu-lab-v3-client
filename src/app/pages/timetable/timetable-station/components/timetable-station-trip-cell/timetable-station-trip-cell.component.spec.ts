import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TimetableStationTripCellComponent } from './timetable-station-trip-cell.component';

/**
 * 実データ相当のミニマムな trip（横浜・上りの 各停6436。同一 tripBlock に
 * 回送9436 を持つ通し運行）。値は dev DB の実例（trip_number 6436/9436）に基づく。
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

    it('通し運行の脚注行（↪ 〜から〜まで（種別 列番））を描画する', async () => {
        const fixture = await createFixture();
        const text = (fixture.nativeElement as HTMLElement).textContent;

        expect(text).toContain('↪');
        expect(text).toContain('かしわ台から湘南台まで（');
        expect(text).toContain('9436');
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
});
