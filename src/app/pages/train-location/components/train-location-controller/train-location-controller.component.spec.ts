import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TrainLocationControllerComponent } from './train-location-controller.component';

describe('TrainLocationControllerComponent', () => {
    let component: TrainLocationControllerComponent;
    let fixture: ComponentFixture<TrainLocationControllerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationControllerComponent],
            providers: [
                provideRouter([]),
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
                        ]),
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TrainLocationControllerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('onRouteChange: 値が空なら emit しない', () => {
        const spy = jest.spyOn(component.routeIdChange, 'emit');
        component.onRouteChange([]);
        expect(spy).not.toHaveBeenCalled();
    });

    it('onRouteChange: 単一選択の値を emit する', () => {
        const spy = jest.spyOn(component.routeIdChange, 'emit');
        component.onRouteChange(['route-1']);
        expect(spy).toHaveBeenCalledWith('route-1');
    });

    it('onModeChange: モードを emit する', () => {
        const spy = jest.spyOn(component.modeChange, 'emit');
        component.onModeChange('specified');
        expect(spy).toHaveBeenCalledWith('specified');
    });

    it('mode="now" のときダイヤ select は無効化される', () => {
        fixture.componentRef.setInput('mode', 'now');
        expect(component.isCalendarSelectDisabled()).toBe(true);
    });

    it('mode="specified" のときダイヤ select は有効', () => {
        fixture.componentRef.setInput('mode', 'specified');
        expect(component.isCalendarSelectDisabled()).toBe(false);
    });

    it('collapsedSummary: 未選択時は既定値の要約を返す', () => {
        expect(component.collapsedSummary()).toBe(
            '現在時刻 / 路線未選択 / ダイヤ未選択',
        );
    });

    it('collapsedSummary: 現在の選択状態（モード・路線・ダイヤ）を反映する', () => {
        fixture.componentRef.setInput('mode', 'specified');
        fixture.componentRef.setInput('selectedRouteId', 'route-1');
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        expect(component.collapsedSummary()).toBe(
            '時刻指定 / 本線 / 2026/3/14改正 土休日',
        );
    });
});
