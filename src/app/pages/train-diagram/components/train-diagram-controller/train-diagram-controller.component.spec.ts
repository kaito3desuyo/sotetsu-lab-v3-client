import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TrainDiagramControllerComponent } from './train-diagram-controller.component';

describe('TrainDiagramControllerComponent', () => {
    let component: TrainDiagramControllerComponent;
    let fixture: ComponentFixture<TrainDiagramControllerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramControllerComponent],
            providers: [
                {
                    provide: CalendarListStateQuery,
                    useValue: {
                        calendars$: of([
                            {
                                calendarId: 'calendar-1',
                                calendarName: '土休日',
                                startDate: '2026-03-14',
                            },
                        ]),
                    },
                },
                {
                    provide: RouteStationListStateQuery,
                    useValue: {
                        routeStations$: of([
                            {
                                routeId: 'route-1',
                                routeName: '本線',
                                agencyId: 'agency-1',
                            },
                            {
                                routeId: 'route-2',
                                routeName: 'いずみ野線',
                                agencyId: 'agency-1',
                            },
                        ]),
                    },
                },
                {
                    provide: AgencyListStateQuery,
                    useValue: {
                        agencies$: of([
                            { agencyId: 'agency-1', agencyName: '相鉄' },
                        ]),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainDiagramControllerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('routeOptions: 会社名を group に設定する', () => {
        expect(component.routeOptions()).toEqual([
            { value: 'route-1', label: '本線', group: '相鉄' },
            { value: 'route-2', label: 'いずみ野線', group: '相鉄' },
        ]);
    });

    it('onRouteChange: 値が空なら空配列を emit する', () => {
        const spy = jest.spyOn(component.routeIdsChange, 'emit');
        component.onRouteChange([]);
        expect(spy).toHaveBeenCalledWith([]);
    });

    it('onRouteChange: 複数選択の値を emit する', () => {
        const spy = jest.spyOn(component.routeIdsChange, 'emit');
        component.onRouteChange(['route-1', 'route-2']);
        expect(spy).toHaveBeenCalledWith(['route-1', 'route-2']);
    });

    it('onDirectionFilterChange: 選択した方向を emit する', () => {
        const spy = jest.spyOn(component.directionFilterChange, 'emit');
        component.onDirectionFilterChange('up');
        expect(spy).toHaveBeenCalledWith('up');
    });

    it('collapsedSummary: 未選択時は既定値の要約を返す', () => {
        expect(component.collapsedSummary()).toBe(
            'ダイヤ未選択 / 全路線 / 7:00〜8:00 / 上り・下り / 標準',
        );
    });

    it('collapsedSummary: 現在の選択状態（ダイヤ・路線・時間帯・方向・ズーム）を反映する', () => {
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.componentRef.setInput('selectedRouteIds', [
            'route-1',
            'route-2',
        ]);
        fixture.componentRef.setInput('windowStartHour', 9);
        fixture.componentRef.setInput('directionFilter', 'up');
        fixture.componentRef.setInput('zoomLevel', 'wide');
        expect(component.collapsedSummary()).toBe(
            '2026/3/14改正 土休日 / 本線・いずみ野線 / 9:00〜10:00 / 上り / 拡大',
        );
    });
});
