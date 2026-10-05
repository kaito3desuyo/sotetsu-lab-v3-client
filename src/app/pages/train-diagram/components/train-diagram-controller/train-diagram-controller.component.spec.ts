import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { AgencyListStateQuery } from 'src/app/global-states/agency-list.state';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { FilterChipsComponent } from 'src/app/shared/filter-chips/filter-chips.component';
import { TrainDiagramControllerComponent } from './train-diagram-controller.component';

describe('TrainDiagramControllerComponent', () => {
    let component: TrainDiagramControllerComponent;
    let fixture: ComponentFixture<TrainDiagramControllerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainDiagramControllerComponent],
            providers: [
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

    it('onRouteChange: 複数選択の値を emit する', () => {
        const spy = jest.spyOn(component.routeIdsChange, 'emit');
        component.onRouteChange(['route-1', 'route-2']);
        expect(spy).toHaveBeenCalledWith(['route-1', 'route-2']);
    });

    it('畳まない（折りたたみパネルを使わない）', () => {
        expect(
            fixture.nativeElement.querySelector('app-collapsible-panel'),
        ).toBeNull();
    });

    it('路線チップは複数選択・横スクロール 1 行', () => {
        const chips = fixture.debugElement.query(
            By.directive(FilterChipsComponent),
        ).componentInstance as FilterChipsComponent;
        expect(chips.mode()).toBe('multiple');
        expect(chips.scrollMode()).toBe(true);
    });

    it('「時刻へ跳ぶ」の選択肢が 22 個（4:00〜25:00）', async () => {
        // mat-select の options は overlay（document.body 直下）にレンダーされるため、
        // 2つ目（「時刻へ跳ぶ」）の mat-select トリガーを開いて body から options を読む。
        const trigger: HTMLElement =
            fixture.nativeElement.querySelectorAll('mat-select')[1];
        trigger.click();
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const options = document.querySelectorAll(
            '.cdk-overlay-container mat-option',
        );
        expect(options.length).toBe(22);
        expect(options[0].textContent?.trim()).toBe('4:00');
        expect(options[21].textContent?.trim()).toBe('25:00');
    });

    it('「時刻へ跳ぶ」で 18 を選ぶと jumpToHour に 18 を emit し、select の値を null に戻す', () => {
        const spy = jest.spyOn(component.jumpToHour, 'emit');
        const event = {
            value: 18,
            source: { value: 18 },
        } as any;
        component.onJump(event);
        expect(spy).toHaveBeenCalledWith(18);
        expect(event.source.value).toBeNull();
    });

    it('showNowButton=false のとき「今」ボタンは無く、true のとき有って押すと jumpToNow を emit する', () => {
        expect(
            fixture.nativeElement.querySelector('[data-now-button]'),
        ).toBeNull();

        fixture.componentRef.setInput('showNowButton', true);
        fixture.detectChanges();

        const button: HTMLButtonElement =
            fixture.nativeElement.querySelector('[data-now-button]');
        expect(button).not.toBeNull();

        const spy = jest.spyOn(component.jumpToNow, 'emit');
        button.click();
        expect(spy).toHaveBeenCalled();
    });

    it('− で zoomStep に -1、＋ で zoomStep に 1 を emit する', () => {
        const spy = jest.spyOn(component.zoomStep, 'emit');

        const zoomOut: HTMLButtonElement =
            fixture.nativeElement.querySelector('[data-zoom-out]');
        zoomOut.click();
        expect(spy).toHaveBeenCalledWith(-1);

        const zoomIn: HTMLButtonElement =
            fixture.nativeElement.querySelector('[data-zoom-in]');
        zoomIn.click();
        expect(spy).toHaveBeenCalledWith(1);
    });

    it('Task 13: ダイヤ選択欄はスマホで行いっぱい・sm 以上で 320px 固定幅', () => {
        const calendarField: HTMLElement =
            fixture.nativeElement.querySelectorAll('mat-form-field')[0];
        expect(calendarField.className).toContain('tw-basis-full');
        expect(calendarField.className).toContain('sm:tw-w-80');
        expect(calendarField.className).toContain('sm:tw-basis-auto');
        expect(calendarField.className).toContain('sm:tw-flex-none');
    });

    it('方向のトグルで directionFilterChange を emit する', () => {
        const spy = jest.spyOn(component.directionFilterChange, 'emit');
        // 上り・下り・両方の順で並ぶ最初のトグル（上り）を押す
        const upToggle: HTMLElement =
            fixture.nativeElement.querySelectorAll('mat-button-toggle')[0];
        upToggle
            .querySelector('button')
            ?.dispatchEvent(new MouseEvent('click'));
        fixture.detectChanges();
        expect(spy).toHaveBeenCalledWith('up');
    });
});
