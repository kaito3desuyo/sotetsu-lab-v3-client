import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { EMPTY, firstValueFrom, Observable, of, throwError } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { TimetableEditFormDraftRestoreSnackBarComponent } from './components/timetable-edit-form-draft-restore-snack-bar/timetable-edit-form-draft-restore-snack-bar.component';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import {
    ETimetableEditFormMode,
    ETimetableEditFormStopType,
} from './special/enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from './stores/timetable-edit-form.store';
import { TimetableEditFormComponent } from './timetable-edit-form.component';

describe('TimetableEditFormComponent', () => {
    let component: TimetableEditFormComponent;
    let fixture: ComponentFixture<TimetableEditFormComponent>;
    let timetableEditFormService: Record<string, jest.Mock>;

    beforeEach(async () => {
        timetableEditFormService = {
            fetchStations: jest.fn(() => of(undefined)),
            fetchRoutes: jest.fn(() => of(undefined)),
            fetchOperations: jest.fn(() => of(undefined)),
            fetchTripClasses: jest.fn(() => of(undefined)),
            fetchCalendar: jest.fn(() => of(undefined)),
            fetchTargetTripBlock: jest.fn(() => of(undefined)),
            fetchCopySourceCandidates: jest.fn(() => of(undefined)),
            selectCopySource: jest.fn(() => of(undefined)),
            createTripBlocks: jest.fn(() => of(undefined)),
            replaceTripBlock: jest.fn(() => of(undefined)),
            receiveSubmittedEvent: jest.fn(() => EMPTY),
            emitSubmittedEvent: jest.fn(),
            saveDraft: jest.fn(),
            clearDraft: jest.fn(),
            getMatchingDraft: jest.fn(() => null),
            selectRoutesTraversedBy: jest.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [TimetableEditFormComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            new Map([
                                ['calendar_id', 'calendar-1'],
                                ['trip_direction', '0'],
                            ]),
                        ),
                        snapshot: {
                            data: { mode: ETimetableEditFormMode.ADD },
                        },
                    },
                },
                {
                    provide: TimetableEditFormService,
                    useValue: timetableEditFormService,
                },
                {
                    provide: ServiceListStateQuery,
                    useValue: { serviceId$: of('service-1') },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                {
                    provide: NotificationService,
                    useValue: { open: jest.fn() },
                },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
            ],
        })
            .overrideComponent(TimetableEditFormComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TimetableEditFormComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('B8-5: mode を route data から読み取り、フェッチ一式を呼び出す', () => {
        expect(timetableEditFormService.fetchStations).toHaveBeenCalled();
        expect(timetableEditFormService.fetchRoutes).toHaveBeenCalled();
        expect(timetableEditFormService.fetchCalendar).toHaveBeenCalled();
        expect(component.mode()).toBe(ETimetableEditFormMode.ADD);
    });

    it('G9 defect 2: ADD モードでもコピー元候補を取得する（初期値取り込みブロックのため）', () => {
        expect(
            timetableEditFormService.fetchCopySourceCandidates,
        ).toHaveBeenCalled();
        expect(
            timetableEditFormService.fetchTargetTripBlock,
        ).not.toHaveBeenCalled();
    });

    it('駅・路線・運用・種別・ダイヤの取得を同時に購読する（順番待ちしない）', () => {
        const subscribed: string[] = [];
        const names = [
            'fetchStations',
            'fetchRoutes',
            'fetchOperations',
            'fetchTripClasses',
            'fetchCalendar',
        ];
        for (const name of names) {
            timetableEditFormService[name].mockImplementation(
                () =>
                    new Observable<void>(() => {
                        subscribed.push(name);
                    }),
            );
        }

        TestBed.createComponent(TimetableEditFormComponent);

        expect(subscribed).toEqual(names);
    });

    it('取得に失敗しても読み込み中を解く', async () => {
        TimetableEditFormStore.resetLoading();
        timetableEditFormService.fetchStations.mockReturnValue(
            throwError(() => new Error('network')),
        );

        await expect(component.fetchData()).rejects.toThrow('network');
        expect(await firstValueFrom(TimetableEditFormStore.isLoading$)).toBe(
            false,
        );
    });

    describe('下書きの復元の案内', () => {
        let snackBarRef: { onAction: jest.Mock; dismiss: jest.Mock };
        let openFromComponent: jest.SpyInstance;

        beforeEach(() => {
            timetableEditFormService.getMatchingDraft.mockReturnValue({
                trips: [{ tripNumber: '2301' }],
            });
            snackBarRef = {
                onAction: jest.fn(() => EMPTY),
                dismiss: jest.fn(),
            };
            openFromComponent = jest
                .spyOn(TestBed.inject(MatSnackBar), 'openFromComponent')
                .mockReturnValue(snackBarRef as any);
        });

        it('自動では消さない（閉じるか復元するまで残す）', async () => {
            await component.fetchData();

            expect(openFromComponent).toHaveBeenCalledWith(
                TimetableEditFormDraftRestoreSnackBarComponent,
            );
        });

        it('「復元する」で下書きを戻し、通る駅（‖ 以外）の路線を絞り込みに足す', async () => {
            const trips = [
                {
                    tripNumber: '3030',
                    times: [
                        {
                            stationId: '横浜',
                            stopType: ETimetableEditFormStopType.STOP,
                        },
                        {
                            stationId: '西谷',
                            stopType: ETimetableEditFormStopType.PASS,
                        },
                        {
                            stationId: '厚木',
                            stopType:
                                ETimetableEditFormStopType.NOT_GOING_THROUGH,
                        },
                    ],
                },
            ];
            timetableEditFormService.getMatchingDraft.mockReturnValue({
                trips,
            });
            snackBarRef.onAction.mockReturnValue(of(undefined));

            await component.fetchData();

            expect(
                timetableEditFormService.selectRoutesTraversedBy,
            ).toHaveBeenCalledWith([['横浜', '西谷']]);
            expect(component.restoreTrips()).toEqual(trips);
        });

        it('ページを離れたら閉じる', async () => {
            await component.fetchData();
            fixture.destroy();

            expect(snackBarRef.dismiss).toHaveBeenCalled();
        });

        it('保存に成功したら閉じる（下書きは消えるため）', async () => {
            await component.fetchData();
            await component.onReceiveClickSubmit([
                { tripNumber: '2301' },
            ] as any);

            expect(snackBarRef.dismiss).toHaveBeenCalled();
        });
    });

    describe('G9: 保存 API の呼び出し形が add/copy/update 各モードで従前と一致する（契約非破壊の証拠）', () => {
        it('ADD モードでは createTripBlocks（CreateTripDto[]）を呼ぶ', async () => {
            TimetableEditFormStore.setMode(ETimetableEditFormMode.ADD);
            const trips = [{ tripNumber: '2301' }] as any;

            await component.onReceiveClickSubmit(trips);

            expect(
                timetableEditFormService.createTripBlocks,
            ).toHaveBeenCalledWith(trips);
            expect(
                timetableEditFormService.replaceTripBlock,
            ).not.toHaveBeenCalled();
        });

        it('COPY モードでは createTripBlocks（CreateTripDto[]）を呼ぶ', async () => {
            TimetableEditFormStore.setMode(ETimetableEditFormMode.COPY);
            const trips = [{ tripNumber: '2301' }] as any;

            await component.onReceiveClickSubmit(trips);

            expect(
                timetableEditFormService.createTripBlocks,
            ).toHaveBeenCalledWith(trips);
            expect(
                timetableEditFormService.replaceTripBlock,
            ).not.toHaveBeenCalled();
        });

        it('UPDATE モードでは replaceTripBlock（ReplaceTripDto[]）を呼ぶ', async () => {
            TimetableEditFormStore.setMode(ETimetableEditFormMode.UPDATE);
            const trips = [{ tripId: 'trip-1', tripNumber: '2301' }] as any;

            await component.onReceiveClickSubmit(trips);

            expect(
                timetableEditFormService.replaceTripBlock,
            ).toHaveBeenCalledWith(trips);
            expect(
                timetableEditFormService.createTripBlocks,
            ).not.toHaveBeenCalled();
        });
    });
});
