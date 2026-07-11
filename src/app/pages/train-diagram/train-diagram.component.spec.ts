import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TrainDiagramComponent } from './train-diagram.component';
import { TrainDiagramService } from './services/train-diagram.service';
import { TrainDiagramStore } from './stores/train-diagram.store';

describe('TrainDiagramComponent', () => {
    let component: TrainDiagramComponent;
    let fixture: ComponentFixture<TrainDiagramComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramComponent],
            providers: [
                provideRouter([]),
                {
                    provide: TrainDiagramService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                        fetchNetworkStations: () => of(undefined),
                        fetchOperationSightingTimeCrossSection: () =>
                            of(undefined),
                    },
                },
                {
                    provide: TodaysCalendarListStateQuery,
                    useValue: {
                        todaysCalendarId: 'cal-today',
                        todaysCalendarIds$: of(['cal-today']),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            { routeId: 'route-1', routeName: '本線' },
                        ]),
                    },
                },
            ],
        })
            .overrideComponent(TrainDiagramComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainDiagramComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        TrainDiagramStore.setCalendarId(null);
        TrainDiagramStore.setSelectedRouteIds([]);
        TrainDiagramStore.setSelectedTripId(null);
        TrainDiagramStore.setTripBlocksByDirection({});
        TrainDiagramStore.setDirectionFilter('both');
        TrainDiagramStore.resetLoading();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('onInfoPanelClosed: 選択列車をクリアする', () => {
        TrainDiagramStore.setSelectedTripId('t1');
        component.onInfoPanelClosed();
        expect(TrainDiagramStore.selectedTripId).toBeNull();
    });

    it('onZoomLevelChange: ズーム段階をストアへ反映する', () => {
        component.onZoomLevelChange('wide');
        expect(component.zoomLevel()).toBe('wide');
    });

    it('onTripActivated: 対象 trip が無くても例外を投げない', () => {
        expect(() => component.onTripActivated('unknown')).not.toThrow();
    });

    it('filteredTripBlocksByDirection: directionFilter に応じて chart へ渡す列車を絞る', () => {
        TrainDiagramStore.setTripBlocksByDirection({
            0: [{ tripBlockId: 'b-up', trips: [] } as any],
            1: [{ tripBlockId: 'b-down', trips: [] } as any],
        });

        TrainDiagramStore.setDirectionFilter('both');
        expect(
            Object.keys(component.filteredTripBlocksByDirection()).sort(),
        ).toEqual(['0', '1']);

        TrainDiagramStore.setDirectionFilter('up');
        expect(
            Object.keys(component.filteredTripBlocksByDirection()),
        ).toEqual(['0']);

        TrainDiagramStore.setDirectionFilter('down');
        expect(
            Object.keys(component.filteredTripBlocksByDirection()),
        ).toEqual(['1']);
    });
});
