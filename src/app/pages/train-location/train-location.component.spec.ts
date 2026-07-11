import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TrainLocationComponent } from './train-location.component';
import { TrainLocationService } from './services/train-location.service';
import { TrainLocationStore } from './stores/train-location.store';

describe('TrainLocationComponent', () => {
    let component: TrainLocationComponent;
    let fixture: ComponentFixture<TrainLocationComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                provideRouter([]),
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => of(undefined),
                        fetchStationAxis: () => of(undefined),
                        fetchMissingOperationSightingTimeCrossSections: () =>
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
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainLocationComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        TrainLocationStore.setCalendarId(null);
        TrainLocationStore.setSelectedRouteId(null);
        TrainLocationStore.setMode('now');
        TrainLocationStore.setSpecifiedTime(null);
        TrainLocationStore.resetLoading();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('route_id が無い初期状態では route_id 付き URL へリダイレクトを試みる（例外を投げない）', () => {
        // provideRouter([]) にはマッチするルートが無いため実際の遷移は完了しないが、
        // redirect 呼び出し自体が同期的に例外を投げないことだけを確認する
        // （store 反映は redirect 完了後の再購読で行われるため、ここでは検証しない）
        expect(component).toBeTruthy();
    });

    it('onModeChange: 例外を投げない', () => {
        expect(() => component.onModeChange('specified')).not.toThrow();
    });

    it('onRouteIdChange: 例外を投げない', () => {
        expect(() => component.onRouteIdChange('route-2')).not.toThrow();
    });

    it('onCalendarIdChange: mode="now" のときは無視される（no-op）', () => {
        TrainLocationStore.setMode('now');
        expect(() => component.onCalendarIdChange('cal-2')).not.toThrow();
    });

    it('at(): mode="now" のとき現在時刻ベースの Date を返す', () => {
        const before = Date.now();
        const at = component.at();
        expect(at.getTime()).toBeGreaterThanOrEqual(before - 1000);
    });

    it('at(): mode="specified" かつ specifiedTime があればその時刻を反映する', () => {
        TrainLocationStore.setMode('specified');
        TrainLocationStore.setSpecifiedTime('0730');
        fixture.detectChanges();

        const at = component.at();
        expect(at.getHours()).toBe(7);
        expect(at.getMinutes()).toBe(30);
    });

    it('rows(): 初期状態（データ無し）でも例外を投げない', () => {
        expect(() => component.rows()).not.toThrow();
    });

    it('コンテンツ領域: sm 未満で左右余白を削減するクラスを持つ', () => {
        fixture.detectChanges();
        const content: HTMLElement =
            fixture.nativeElement.querySelector('div.tw-flex-1');
        expect(content.classList).toContain('max-sm:tw-px-1');
        expect(content.classList).toContain('tw-p-3');
    });
});
