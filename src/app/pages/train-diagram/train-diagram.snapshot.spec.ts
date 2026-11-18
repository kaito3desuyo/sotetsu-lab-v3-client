import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setRouteStations } from 'src/app/global-states/testing/set-route-stations';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { TrainDiagramService } from './services/train-diagram.service';
import { TrainDiagramStore } from './stores/train-diagram.store';
import { TrainDiagramComponent } from './train-diagram.component';
import {
    FIXTURE_ITINERARY_LINKS,
    FIXTURE_ROUTE_ID,
    FIXTURE_ROUTES,
    FIXTURE_SELECTED_TRIP_ID,
    FIXTURE_STATIONS,
    FIXTURE_TRIP_BLOCKS_BY_DIRECTION,
    FIXTURE_TRIP_CLASSES,
} from './testing/diagram-fixture';

/**
 * 割る前の TrainDiagramComponent が出す図の組み立て（線・折り返しの線・駅の行・選んだ列車の情報）を
 * snapshot で固定する。component を割ったあとも、同じ入力で同じ値が出ることを照合する。
 */
describe('TrainDiagramComponent 図の組み立ての照合', () => {
    let component: TrainDiagramComponent;
    let store: InstanceType<typeof TrainDiagramStore>;

    beforeEach(async () => {
        // 線の座標は「今の営業日」を起点にするため、時計を固定する（2026-11-10 12:00 JST）
        jest.useFakeTimers({ now: new Date('2026-11-10T03:00:00Z') });
        await TestBed.configureTestingModule({
            imports: [TrainDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: TrainDiagramService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                        fetchItineraryLinks: () => of(undefined),
                        fetchCalendar: () => of(true),
                        fetchNetworkStations: () => of(undefined),
                        fetchOperationSightingTimeCrossSection: () =>
                            of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(TrainDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
        setTodaysCalendars([]);
        setRouteStations(FIXTURE_ROUTES);

        store = TestBed.inject(TrainDiagramStore);
        component = TestBed.createComponent(
            TrainDiagramComponent,
        ).componentInstance;

        store.setNetworkStations(FIXTURE_STATIONS);
        store.setSelectedRouteIds([FIXTURE_ROUTE_ID]);
        store.setTripClasses(FIXTURE_TRIP_CLASSES);
        store.setTripBlocksByDirection(FIXTURE_TRIP_BLOCKS_BY_DIRECTION);
        store.setItineraryLinks(FIXTURE_ITINERARY_LINKS);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    function captureModel(): unknown {
        const tripIdsByChainOf: Record<string, string[]> = {};
        for (const [tripId, ids] of component.tripIdsByChainOf()) {
            tripIdsByChainOf[tripId] = [...ids].sort();
        }
        // undefined の項目と Map を落とし、JSON として固定する
        return JSON.parse(
            JSON.stringify({
                stationRows: component.stationRows(),
                bodyHeight: component.bodyHeight(),
                diagramLines: component.diagramLines(),
                turnbackLinks: component.turnbackLinks(),
                hasDeadhead: component.hasDeadhead(),
                hasDepotOut: component.hasDepotOut(),
                hasDepotIn: component.hasDepotIn(),
                hasTransfer: component.hasTransfer(),
                selectedTripInfo: component.selectedTripInfo(),
                tripIdsByChainOf,
            }),
        );
    }

    it('fixture は線・折り返し・出入庫・運番変更を含む（snapshot が空でない）', () => {
        expect(component.diagramLines().length).toBe(6);
        expect(component.turnbackLinks().length).toBe(2);
        expect(component.hasDepotOut()).toBe(true);
        expect(component.hasDepotIn()).toBe(true);
        expect(component.hasTransfer()).toBe(true);
    });

    it('両方向・列車を 1 本選んだ状態の出力を固定する', () => {
        store.setSelectedTripId(FIXTURE_SELECTED_TRIP_ID);

        expect(component.selectedTripInfo()?.tripId).toBe(
            FIXTURE_SELECTED_TRIP_ID,
        );
        expect(captureModel()).toMatchSnapshot();
    });

    it('方向の絞り込みを上りだけにした出力を固定する', () => {
        store.setDirectionFilter('up');
        store.setSelectedTripId('U1');

        expect(captureModel()).toMatchSnapshot();
    });
});
