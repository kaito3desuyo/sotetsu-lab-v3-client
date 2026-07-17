import { provideHttpClient } from '@angular/common/http';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { EMPTY, of } from 'rxjs';

import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ServiceListStateQuery } from 'src/app/global-states/service-list.state';
import { LoadingService } from 'src/app/shared/app-shared/loading/loading.service';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import { ETimetableEditFormMode } from './special/enums/timetable-edit-form.enum';
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
        };

        await TestBed.configureTestingModule({
            imports: [TimetableEditFormComponent],
            providers: [
                provideHttpClient(),
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

    describe('G9: 保存 API の呼び出し形が add/copy/update 各モードで従前と一致する（契約非破壊の証拠）', () => {
        it('ADD モードでは createTripBlocks（CreateTripDto[]）を呼ぶ', async () => {
            TimetableEditFormStore.setMode(ETimetableEditFormMode.ADD);
            const trips = [{ tripNumber: '2301' }] as any;

            await component.onReceiveClickSubmit(trips);

            expect(timetableEditFormService.createTripBlocks).toHaveBeenCalledWith(
                trips,
            );
            expect(timetableEditFormService.replaceTripBlock).not.toHaveBeenCalled();
        });

        it('COPY モードでは createTripBlocks（CreateTripDto[]）を呼ぶ', async () => {
            TimetableEditFormStore.setMode(ETimetableEditFormMode.COPY);
            const trips = [{ tripNumber: '2301' }] as any;

            await component.onReceiveClickSubmit(trips);

            expect(timetableEditFormService.createTripBlocks).toHaveBeenCalledWith(
                trips,
            );
            expect(timetableEditFormService.replaceTripBlock).not.toHaveBeenCalled();
        });

        it('UPDATE モードでは replaceTripBlock（ReplaceTripDto[]）を呼ぶ', async () => {
            TimetableEditFormStore.setMode(ETimetableEditFormMode.UPDATE);
            const trips = [{ tripId: 'trip-1', tripNumber: '2301' }] as any;

            await component.onReceiveClickSubmit(trips);

            expect(timetableEditFormService.replaceTripBlock).toHaveBeenCalledWith(
                trips,
            );
            expect(timetableEditFormService.createTripBlocks).not.toHaveBeenCalled();
        });
    });
});
