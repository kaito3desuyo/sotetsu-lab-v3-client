import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EMPTY, firstValueFrom, of, Subject, throwError } from 'rxjs';
import { NotificationService } from 'src/app/core/services/notification.service';
import { SocketService } from 'src/app/core/services/socket.service';
import { OperationPostCardService } from 'src/app/shared/operation-post-card/operation-post-card.service';
import { OperationRealTimeService } from './services/operation-real-time.service';
import { OperationRealTimeComponent } from './operation-real-time.component';
import { OperationRealTimeStore } from './stores/operation-real-time.store';

describe('OperationRealTimeComponent', () => {
    let component: OperationRealTimeComponent;
    let fixture: ComponentFixture<OperationRealTimeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                OperationRealTimeService,
                {
                    provide: SocketService,
                    useValue: { on: () => EMPTY },
                },
                {
                    provide: NotificationService,
                    useValue: { open: () => {} },
                },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: EMPTY },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationRealTimeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

describe('OperationRealTimeComponent の取得の失敗', () => {
    let fixture: ComponentFixture<OperationRealTimeComponent>;
    let service: Record<string, jest.Mock>;
    let notification: { open: jest.Mock };
    let socket$: Subject<void>;
    let submit$: Subject<void>;

    const isLoading = () => firstValueFrom(OperationRealTimeStore.isLoading$);
    const finalUpdateTime = () =>
        firstValueFrom(OperationRealTimeStore.finalUpdateTime$);
    const fail = () => throwError(() => new Error('offline'));

    beforeEach(async () => {
        jest.useFakeTimers();
        const ok = () => jest.fn(() => of(undefined));
        service = {
            fetchOperationGroups: ok(),
            fetchRoutes: ok(),
            fetchStations: ok(),
            fetchTripClasses: ok(),
            fetchCalendar: ok(),
            fetchOperations: ok(),
            fetchItineraryLinks: ok(),
            fetchFormations: ok(),
            fetchCurrentPositions: ok(),
            fetchOperationSightingTimeCrossSections: ok(),
            fetchFormationSightingTimeCrossSections: ok(),
            fetchSightingHistories: ok(),
            fetchCurrentPositionThatShouldUpdate: ok(),
        };
        notification = { open: jest.fn() };
        socket$ = new Subject<void>();
        submit$ = new Subject<void>();

        await TestBed.configureTestingModule({
            imports: [OperationRealTimeComponent],
            providers: [
                provideRouter([]),
                { provide: OperationRealTimeService, useValue: service },
                { provide: SocketService, useValue: { on: () => socket$ } },
                { provide: NotificationService, useValue: notification },
                {
                    provide: OperationPostCardService,
                    useValue: { submitEvent$: submit$ },
                },
            ],
        })
            .overrideComponent(OperationRealTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        OperationRealTimeStore.resetLoading();
        OperationRealTimeStore.setIsEnableAutoReload(true);
        fixture = TestBed.createComponent(OperationRealTimeComponent);
        fixture.detectChanges();
        // 開いたときの fetchData() を終わらせる
        await jest.advanceTimersByTimeAsync(0);
        OperationRealTimeStore.setFinalUpdateTime(0);
        notification.open.mockClear();
    });

    afterEach(() => {
        fixture.destroy();
        jest.useRealTimers();
    });

    it('1 秒ごとの現在位置の取得が続けて失敗しても、読み込み中が残らず、通知も出ない', async () => {
        service['fetchCurrentPositionThatShouldUpdate'].mockImplementation(
            fail,
        );

        await jest.advanceTimersByTimeAsync(3000);

        expect(
            service['fetchCurrentPositionThatShouldUpdate'],
        ).toHaveBeenCalledTimes(3);
        expect(await isLoading()).toBe(false);
        expect(notification.open).not.toHaveBeenCalled();
    });

    it('投稿後の取り直しが失敗したら、読み込み中が残らず失敗を知らせ、最終更新時刻は進めない', async () => {
        service['fetchFormationSightingTimeCrossSections'].mockImplementation(
            fail,
        );

        submit$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(await finalUpdateTime()).toBe(0);
    });

    it('他人の投稿後の取り直しが失敗したら、読み込み中が残らず失敗を知らせ、更新できたとは言わない', async () => {
        service['fetchSightingHistories'].mockImplementation(fail);

        socket$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データの取得に失敗しました',
            'OK',
        );
        expect(notification.open).not.toHaveBeenCalledWith(
            'データが更新されました',
            'OK',
        );
        expect(await finalUpdateTime()).toBe(0);
    });

    it('他人の投稿後の取り直しが成功したら、更新できたと知らせ、最終更新時刻を進める', async () => {
        socket$.next();
        await jest.advanceTimersByTimeAsync(0);

        expect(await isLoading()).toBe(false);
        expect(notification.open).toHaveBeenCalledWith(
            'データが更新されました',
            'OK',
        );
        expect(await finalUpdateTime()).toBeGreaterThan(0);
    });
});
