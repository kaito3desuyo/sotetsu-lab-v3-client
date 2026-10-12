import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { firstValueFrom, of } from 'rxjs';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { OperationRealTimeControllerComponent } from './operation-real-time-controller.component';

describe('OperationRealTimeControllerComponent', () => {
    let component: OperationRealTimeControllerComponent;
    let fixture: ComponentFixture<OperationRealTimeControllerComponent>;
    let calls: string[];

    beforeEach(async () => {
        calls = [];
        const fetcher = (name: string) =>
            jest.fn((params: { forceReload: boolean }) => {
                calls.push(`${name}:${params.forceReload}`);
                return of(undefined);
            });

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeControllerComponent],
            providers: [
                provideNoopAnimations(),
                {
                    provide: OperationRealTimeService,
                    useValue: {
                        fetchOperationSightingTimeCrossSections:
                            fetcher('operation'),
                        fetchFormationSightingTimeCrossSections:
                            fetcher('formation'),
                        fetchSightingHistories: fetcher('histories'),
                    },
                },
            ],
        }).compileComponents();

        OperationRealTimeStore.resetLoading();
        OperationRealTimeStore.setFinalUpdateTime(0);
        fixture = TestBed.createComponent(OperationRealTimeControllerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('再読み込みは運用・編成・履歴の順にキャッシュを使わず取り直し、最終更新時刻を進める', async () => {
        const before = Math.floor(Date.now() / 1000);

        await component.reload();

        expect(calls).toEqual([
            'operation:true',
            'formation:true',
            'histories:true',
        ]);
        expect(await firstValueFrom(OperationRealTimeStore.isLoading$)).toBe(
            false,
        );
        expect(component.finalUpdateTime()).toBeGreaterThanOrEqual(before);
    });

    it('スイッチの切り替えをストアに入れる', () => {
        component.toggleAutoReload(false);
        component.toggleVisibleSightingHistories(true);
        component.toggleVisibleCurrentPosition(true);

        expect(component.isEnableAutoReload()).toBe(false);
        expect(component.isVisibleSightingHistories()).toBe(true);
        expect(component.isVisibleCurrentPosition()).toBe(true);
    });
});
