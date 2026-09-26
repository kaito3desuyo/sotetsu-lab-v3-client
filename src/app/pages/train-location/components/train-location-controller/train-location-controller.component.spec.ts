import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { TrainLocationControllerComponent } from './train-location-controller.component';

describe('TrainLocationControllerComponent', () => {
    let component: TrainLocationControllerComponent;
    let fixture: ComponentFixture<TrainLocationControllerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationControllerComponent],
            providers: [
                provideRouter([]),
                provideNoopAnimations(),
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

    it('畳まない（折りたたみパネルを使わない）', () => {
        expect(
            fixture.nativeElement.querySelector('app-collapsible-panel'),
        ).toBeNull();
    });

    it('路線チップは全線時刻表と同じ横スクロール 1 行（単一選択）', () => {
        const chips = fixture.debugElement.query(
            By.directive(FilterChipsComponent),
        ).componentInstance as FilterChipsComponent;
        expect(chips.scrollMode()).toBe(true);
        expect(chips.mode()).toBe('single');
    });

    it('時計の行に時計を出す', () => {
        fixture.componentRef.setInput('clockText', '12:26:00');
        fixture.detectChanges();

        expect(
            fixture.nativeElement
                .querySelector('[data-clock]')
                .textContent.trim(),
        ).toBe('12:26:00');
    });

    it('現在時刻のときはダイヤを字で示し、選択欄と時刻の入力欄は出さない', () => {
        fixture.componentRef.setInput('mode', 'now');
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(
            el.querySelector('[data-calendar-label]')?.textContent?.trim(),
        ).toBe('2026/3/14改正 土休日');
        expect(el.querySelector('mat-select')).toBeNull();
        expect(el.querySelector('input[type="time"]')).toBeNull();
    });

    it('時刻指定のときは時刻の入力欄とダイヤの選択欄を出す', () => {
        fixture.componentRef.setInput('mode', 'specified');
        fixture.componentRef.setInput('calendarId', 'calendar-1');
        fixture.detectChanges();

        const el = fixture.nativeElement as HTMLElement;
        expect(el.querySelector('input[type="time"]')).not.toBeNull();
        expect(el.querySelector('mat-select')).not.toBeNull();
        expect(el.querySelector('[data-calendar-label]')).toBeNull();
    });

    it('onTimeInputChange: 入力した時刻を emit する', () => {
        const spy = jest.spyOn(component.timeInputValueChange, 'emit');
        component.onTimeInputChange('12:34');
        expect(spy).toHaveBeenCalledWith('12:34');
    });
});
