import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { OperationRealTimeService } from '../../services/operation-real-time.service';
import { OperationRealTimeStore } from '../../stores/operation-real-time.store';
import { OperationRealTimeControllerComponent } from './operation-real-time-controller.component';

const deviceStorageStub = {
    provide: DeviceStorage,
    useValue: {
        getItem: () => Promise.resolve(null),
        setItem: () => Promise.resolve(),
        removeItem: () => Promise.resolve(),
    },
};

describe('OperationRealTimeControllerComponent', () => {
    let component: OperationRealTimeControllerComponent;
    let fixture: ComponentFixture<OperationRealTimeControllerComponent>;
    let calls: string[];
    let notification: { open: jest.Mock };
    let service: Record<string, jest.Mock>;
    let store: InstanceType<typeof OperationRealTimeStore>;

    beforeEach(async () => {
        calls = [];
        const fetcher = (name: string) =>
            jest.fn((params: { forceReload: boolean }) => {
                calls.push(`${name}:${params.forceReload}`);
                return of(undefined);
            });

        notification = { open: jest.fn() };
        service = {
            fetchOperationSightingTimeCrossSections: fetcher('operation'),
            fetchFormationSightingTimeCrossSections: fetcher('formation'),
            fetchSightingHistories: fetcher('histories'),
        };

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeControllerComponent],
            providers: [
                provideNoopAnimations(),
                deviceStorageStub,
                { provide: OperationRealTimeService, useValue: service },
                { provide: NotificationService, useValue: notification },
            ],
        }).compileComponents();

        store = TestBed.inject(OperationRealTimeStore);
        store.resetLoading();
        store.setFinalUpdateTime(0);
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
        expect(store.isLoading()).toBe(false);
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

    it('再読み込みが失敗したら、読み込み中が残らず失敗を知らせ、最終更新時刻は進めない', async () => {
        service['fetchFormationSightingTimeCrossSections'].mockImplementation(
            () => throwError(() => new Error('offline')),
        );

        await component.reload();

        expect(store.isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(component.finalUpdateTime()).toBe(0);
    });
});
