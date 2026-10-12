import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
    Router,
} from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { CalendarListStateQuery } from 'src/app/global-states/calendar-list.state';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { CalendarSelectDialogService } from 'src/app/shared/calendar-select-dialog/services/calendar-select-dialog.service';
import { ConfirmDialogService } from 'src/app/shared/confirm-dialog/services/confirm-dialog.service';
import { TimetableAllLineService } from './services/timetable-all-line.service';
import { TimetableAllLineStore } from './stores/timetable-all-line.store';
import { TimetableAllLineComponent } from './timetable-all-line.component';

describe('TimetableAllLineComponent', () => {
    let component: TimetableAllLineComponent;
    let fixture: ComponentFixture<TimetableAllLineComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                TimetableAllLineService,
                {
                    provide: CalendarListStateQuery,
                    useValue: { selectByCalendarId: () => of(undefined) },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                {
                    provide: ConfirmDialogService,
                    useValue: { open: () => ({ afterClosed: () => EMPTY }) },
                },
                {
                    provide: CalendarSelectDialogService,
                    useValue: { open: () => ({ afterClosed: () => EMPTY }) },
                },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableAllLineComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('ロード中はチップ・テーブルを出さず、合図はプログレスバーだけ（偽の「0 / 0」を出さない）', () => {
        TimetableAllLineStore.enableLoading();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('app-timetable-all-line-table'),
        ).toBeNull();
        expect(
            fixture.nativeElement.querySelector(
                'app-timetable-all-line-route-filter',
            ),
        ).toBeNull();
        expect(
            fixture.nativeElement.querySelector('mat-progress-bar'),
        ).toBeTruthy();
        // スピナーはプログレスバーと二重の合図なので出さない（2026-09-24）
        expect(fixture.nativeElement.querySelector('app-loading')).toBeNull();

        TimetableAllLineStore.disableLoading();
        fixture.detectChanges();

        expect(
            fixture.nativeElement.querySelector('app-timetable-all-line-table'),
        ).toBeTruthy();
        expect(
            fixture.nativeElement.querySelector(
                'app-timetable-all-line-route-filter',
            ),
        ).toBeTruthy();
        expect(
            fixture.nativeElement.querySelector('mat-progress-bar'),
        ).toBeNull();
    });
});

describe('TimetableAllLineComponent の URL の向き', () => {
    const setUp = async (params: Record<string, string>) => {
        await TestBed.configureTestingModule({
            imports: [TimetableAllLineComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                        snapshot: { params },
                    },
                },
                {
                    provide: TimetableAllLineService,
                    useValue: {
                        fetchStations: jest.fn(() => of(undefined)),
                        fetchTripBlocks: jest.fn(() => of(undefined)),
                    },
                },
                {
                    provide: CalendarListStateQuery,
                    useValue: { selectByCalendarId: () => of(undefined) },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: () => {} } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                { provide: ConfirmDialogService, useValue: {} },
                { provide: CalendarSelectDialogService, useValue: {} },
            ],
        })
            .overrideComponent(TimetableAllLineComponent, {
                set: { template: '', imports: [] },
            })
            .compileComponents();

        const navigate = jest
            .spyOn(TestBed.inject(Router), 'navigate')
            .mockResolvedValue(true);
        TestBed.createComponent(TimetableAllLineComponent);
        return {
            navigate,
            service: TestBed.inject(TimetableAllLineService) as unknown as {
                fetchTripBlocks: jest.Mock;
            },
        };
    };

    it.each([
        ['無い', {}],
        ['読めない', { trip_direction: 'abc' }],
    ])('向きが%sときは上りに置き換え、取得はしない', async (_, extra) => {
        const { navigate, service } = await setUp({
            calendar_id: 'cal-1',
            ...extra,
        });

        expect(navigate).toHaveBeenCalledWith(
            [
                'timetable',
                'all-line',
                { calendar_id: 'cal-1', trip_direction: 0 },
            ],
            { replaceUrl: true },
        );
        expect(service.fetchTripBlocks).not.toHaveBeenCalled();
    });

    it('向きが読めれば、そのまま使う', async () => {
        const { navigate } = await setUp({
            calendar_id: 'cal-1',
            trip_direction: '1',
        });

        expect(navigate).not.toHaveBeenCalled();
        expect(TimetableAllLineStore.tripDirection).toBe(1);
    });
});
