import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { setRouteStations } from 'src/app/global-states/testing/set-route-stations';
import { setTodaysCalendars } from 'src/app/global-states/testing/set-todays-calendars';
import { TrainDiagramService } from './services/train-diagram.service';
import { TrainDiagramStore } from './stores/train-diagram.store';
import { TrainDiagramComponent } from './train-diagram.component';
import * as buildDiagramModelUtil from './utils/build-diagram-model.util';
import {
    FIXTURE_ITINERARY_LINKS,
    FIXTURE_ROUTE_ID,
    FIXTURE_ROUTES,
    FIXTURE_SELECTED_TRIP_ID,
    FIXTURE_STATIONS,
    FIXTURE_TRIP_BLOCKS_BY_DIRECTION,
    FIXTURE_TRIP_CLASSES,
} from './testing/diagram-fixture';

describe('TrainDiagramComponent 図の組み立ての再計算の範囲', () => {
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

    afterEach(() => {
        jest.restoreAllMocks();
    });

    function readAll(): void {
        component.diagramLines();
        component.stationRows();
        component.tripIdsByChainOf();
        component.effectiveAxisPxPerMinute();
        component.selectedTripInfo();
    }

    it('縦の縮尺だけ変えたとき、前段は作り直さず後段だけやり直す', () => {
        readAll();
        const prelude = jest.spyOn(
            buildDiagramModelUtil,
            'buildDiagramPrelude',
        );
        const layout = jest.spyOn(buildDiagramModelUtil, 'buildDiagramLayout');

        store.setAxisPxPerMinute(12);
        readAll();

        expect(prelude).not.toHaveBeenCalled();
        expect(layout).toHaveBeenCalledTimes(1);
    });

    it('列車を選び直したとき、前段も後段も作り直さない', () => {
        store.setSelectedTripId('D1');
        readAll();
        const base = jest.spyOn(buildDiagramModelUtil, 'buildDiagramBase');
        const prelude = jest.spyOn(
            buildDiagramModelUtil,
            'buildDiagramPrelude',
        );
        const layout = jest.spyOn(buildDiagramModelUtil, 'buildDiagramLayout');

        store.setSelectedTripId('D2');
        readAll();

        expect(component.selectedTripInfo()?.tripId).toBe('D2');
        expect(base).not.toHaveBeenCalled();
        expect(prelude).not.toHaveBeenCalled();
        expect(layout).not.toHaveBeenCalled();
    });

    it('方向を切り替えたとき、土台（全列車のつながり）は作り直さない', () => {
        readAll();
        const base = jest.spyOn(buildDiagramModelUtil, 'buildDiagramBase');
        const prelude = jest.spyOn(
            buildDiagramModelUtil,
            'buildDiagramPrelude',
        );

        store.setDirectionFilter('up');
        readAll();

        expect(base).not.toHaveBeenCalled();
        expect(prelude).toHaveBeenCalledTimes(1);
    });
});
