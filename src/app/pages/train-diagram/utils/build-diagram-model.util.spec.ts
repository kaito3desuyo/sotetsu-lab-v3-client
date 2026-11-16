import { TestBed } from '@angular/core/testing';
import { setRouteStations } from 'src/app/global-states/testing/set-route-stations';
import {
    FIXTURE_ITINERARY_LINKS,
    FIXTURE_ROUTE_ID,
    FIXTURE_ROUTES,
    FIXTURE_SELECTED_TRIP_ID,
    FIXTURE_STATIONS,
    FIXTURE_TRIP_BLOCKS_BY_DIRECTION,
    FIXTURE_TRIP_CLASSES,
} from '../testing/diagram-fixture';
import { TrainDiagramStore } from '../stores/train-diagram.store';
import { buildStationNameById } from 'src/app/shared/station-name-by-id.util';
import {
    buildDiagramModel,
    DiagramModelInput,
} from './build-diagram-model.util';
import { StationAxisObservation } from './fit-station-axis.util';

describe('buildDiagramModel', () => {
    let input: DiagramModelInput;

    beforeEach(() => {
        // 線の座標は「今の営業日」を起点にするため、時計を固定する（2026-11-10 12:00 JST）
        jest.useFakeTimers({ now: new Date('2026-11-10T03:00:00Z') });
        setRouteStations(FIXTURE_ROUTES);
        const store = TestBed.inject(TrainDiagramStore);
        store.setNetworkStations(FIXTURE_STATIONS);
        store.setSelectedRouteIds([FIXTURE_ROUTE_ID]);
        store.setTripClasses(FIXTURE_TRIP_CLASSES);
        store.setTripBlocksByDirection(FIXTURE_TRIP_BLOCKS_BY_DIRECTION);
        const cache = new Map<string, StationAxisObservation[]>();
        input = {
            tripBlocksByDirection: FIXTURE_TRIP_BLOCKS_BY_DIRECTION,
            stationAxis: store.stationAxis(),
            stationNameById: buildStationNameById(FIXTURE_ROUTES),
            axisPxPerMinute: null,
            directionFilter: 'both',
            selectedTripId: FIXTURE_SELECTED_TRIP_ID,
            now: new Date(),
            itineraryLinks: FIXTURE_ITINERARY_LINKS,
            operationSightingTimeCrossSections: {},
            isTodaySelected: false,
            calendarId: null,
            observationCacheFor: () => cache,
        };
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('fixture で Task 1 の snapshot と同じ値を出す（線 6・折り返し 2・駅 5・高さ 116）', () => {
        const model = buildDiagramModel(input);

        expect(model.diagramLines.map((line) => line.tripId).sort()).toEqual([
            'D1',
            'D2',
            'D3',
            'U1',
            'U2',
            'U4',
        ]);
        expect(model.turnbackLinks).toHaveLength(2);
        expect(model.stationRows).toHaveLength(5);
        expect(model.bodyHeight).toBe(116);
        expect(model.hasDeadhead).toBe(false);
        expect(model.hasDepotOut).toBe(true);
        expect(model.hasDepotIn).toBe(true);
        expect(model.hasTransfer).toBe(true);
        expect(model.selectedTripInfo?.tripId).toBe(FIXTURE_SELECTED_TRIP_ID);
        expect(model.tripIdsByChainOf.size).toBe(6);
    });

    it('同じ入力には同じ出力を返す', () => {
        expect(buildDiagramModel(input)).toEqual(buildDiagramModel(input));
    });

    it('列車が 0 本なら線も折り返しも出さない', () => {
        const model = buildDiagramModel({
            ...input,
            tripBlocksByDirection: {},
        });

        expect(model.diagramLines).toEqual([]);
        expect(model.turnbackLinks).toEqual([]);
        expect(model.hasDepotOut).toBe(false);
        expect(model.selectedTripInfo).toBeNull();
        expect(model.tripIdsByChainOf.size).toBe(0);
    });

    it('駅軸が無ければ空の図を返す', () => {
        const model = buildDiagramModel({ ...input, stationAxis: null });

        expect(model.stationRows).toEqual([]);
        expect(model.bodyHeight).toBe(24);
        expect(model.diagramLines).toEqual([]);
    });

    it('方向を上りだけにすると、上りの線だけが残る', () => {
        const model = buildDiagramModel({
            ...input,
            directionFilter: 'up',
            selectedTripId: 'U1',
        });

        expect(model.diagramLines.map((line) => line.tripId).sort()).toEqual([
            'U1',
            'U2',
            'U4',
        ]);
        expect(model.hasDepotOut).toBe(false);
        expect(model.selectedTripInfo?.tripId).toBe('U1');
    });
});
