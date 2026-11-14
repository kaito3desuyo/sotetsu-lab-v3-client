import { provideHttpClient, withXhr } from '@angular/common/http';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
    ActivatedRoute,
    convertToParamMap,
    ParamMap,
    provideRouter,
} from '@angular/router';
import {
    BehaviorSubject,
    EMPTY,
    Observable,
    of,
    Subject,
    throwError,
} from 'rxjs';

import { PageNotFound } from 'src/app/core/page-not-found/page-not-found';
import { PageMeta } from 'src/app/core/ssr/page-meta';
import { ErrorHandlerService } from 'src/app/core/services/error-handler.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { ServiceListState } from 'src/app/global-states/service-list.state';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { TimetableEditFormService } from './services/timetable-edit-form.service';
import { ETimetableEditFormMode } from './enums/timetable-edit-form.enum';
import { TimetableEditFormStore } from './stores/timetable-edit-form.store';
import { TimetableEditFormComponent } from './timetable-edit-form.component';

const CALENDAR = '00000000-0000-4000-8000-000000000001';
const BLOCK_A = '00000000-0000-4000-8000-0000000000a1';
const BLOCK_B = '00000000-0000-4000-8000-0000000000b2';
const ROUTE_TITLE = '列車を編集する';

const flush = async () => {
    for (let i = 0; i < 50; i++) await Promise.resolve();
};

const FETCHES = [
    'fetchStations',
    'fetchRoutes',
    'fetchOperations',
    'fetchTripClasses',
    'fetchCalendar',
    'fetchTargetTripBlock',
    'fetchCopySourceCandidates',
];

describe('TimetableEditFormComponent の URL の値', () => {
    let service: Record<string, jest.Mock>;
    let params$: BehaviorSubject<ParamMap>;
    let mark: jest.Mock;
    let setTitle: jest.Mock;
    let store: InstanceType<typeof TimetableEditFormStore>;
    let fixture: ComponentFixture<TimetableEditFormComponent>;

    async function setup(mode: ETimetableEditFormMode): Promise<void> {
        service = {
            fetchStations: jest.fn(() => of(undefined)),
            fetchRoutes: jest.fn(() => of(undefined)),
            fetchOperations: jest.fn(() => of(undefined)),
            fetchTripClasses: jest.fn(() => of(undefined)),
            fetchCalendar: jest.fn((): Observable<boolean> => of(true)),
            fetchTargetTripBlock: jest.fn((): Observable<boolean> => of(true)),
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
        mark = jest.fn();
        setTitle = jest.fn();
        params$ = new BehaviorSubject<ParamMap>(convertToParamMap({}));
        TestBed.configureTestingModule({
            imports: [TimetableEditFormComponent],
            providers: [
                provideHttpClient(withXhr()),
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: params$,
                        snapshot: { data: { mode, title: ROUTE_TITLE } },
                    },
                },
                { provide: PageNotFound, useValue: { mark } },
                { provide: PageMeta, useValue: { setTitle } },
                { provide: TimetableEditFormService, useValue: service },
                {
                    provide: ServiceListState,
                    useValue: { serviceId: signal('service-1') },
                },
                {
                    provide: ErrorHandlerService,
                    useValue: { handleError: () => {} },
                },
                { provide: NotificationService, useValue: { open: jest.fn() } },
                {
                    provide: LoadingService,
                    useValue: { open: () => {}, close: () => {} },
                },
                {
                    provide: MatSnackBar,
                    useValue: { openFromComponent: jest.fn() },
                },
            ],
        }).overrideComponent(TimetableEditFormComponent, {
            set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
        });
        store = TestBed.inject(TimetableEditFormStore);
        fixture = TestBed.createComponent(TimetableEditFormComponent);
        // 作ったときに（値の無い URL で）始まる取得は数えない
        await flush();
        Object.values(service).forEach((fn) => fn.mockClear());
    }

    async function open(params: Record<string, string>): Promise<void> {
        params$.next(convertToParamMap(params));
        await flush();
        fixture.detectChanges();
    }

    const el = () => fixture.nativeElement as HTMLElement;
    const notFoundShown = () =>
        el().querySelector('app-not-found-content') !== null;
    const formShown = () =>
        el().querySelector('app-timetable-edit-form-trips') !== null;
    const fetchCount = () =>
        FETCHES.reduce((n, name) => n + service[name].mock.calls.length, 0);

    const modes = [
        ETimetableEditFormMode.ADD,
        ETimetableEditFormMode.COPY,
        ETimetableEditFormMode.UPDATE,
    ];

    describe.each(modes)('%s モード', (mode) => {
        beforeEach(() => setup(mode));

        it.each([
            ['calendar_id', 'undefined'],
            ['trip_direction', 'abc'],
            ['trip_direction', '2'],
            ['trip_block_id', 'undefined'],
        ])(
            '%s が %s なら見つからない表示にして、api を呼ばない',
            async (name, value) => {
                const valid: Record<string, string> = {
                    calendar_id: CALENDAR,
                    trip_direction: '0',
                    trip_block_id: BLOCK_A,
                };
                service.fetchStations.mockClear();
                await open({ ...valid, [name]: value });

                expect(notFoundShown()).toBe(true);
                expect(formShown()).toBe(false);
                expect(mark).toHaveBeenCalled();
                expect(fetchCount()).toBe(0);
            },
        );

        it('値が無い URL は今までどおり取得してフォームを出す', async () => {
            await open({});

            expect(notFoundShown()).toBe(false);
            expect(mark).not.toHaveBeenCalled();
            expect(service.fetchCalendar).toHaveBeenCalled();
            expect(formShown()).toBe(true);
        });

        it('ダイヤが無いと api が返したら、見つからない表示にする', async () => {
            service.fetchCalendar.mockReturnValue(of(false));
            await open({ calendar_id: CALENDAR, trip_direction: '0' });

            expect(notFoundShown()).toBe(true);
            expect(mark).toHaveBeenCalled();
            expect(formShown()).toBe(false);
            expect(service.fetchTargetTripBlock).not.toHaveBeenCalled();
            expect(service.fetchCopySourceCandidates).not.toHaveBeenCalled();
        });

        it('ダイヤの取得が 5xx なら見つからない表示にしない（失敗の表示のまま）', async () => {
            await open({ calendar_id: CALENDAR, trip_direction: '0' });
            service.fetchCalendar.mockReturnValue(
                throwError(() => new Error('500')),
            );
            await expect(fixture.componentInstance.fetchData()).rejects.toThrow(
                '500',
            );

            expect(notFoundShown()).toBe(false);
            expect(mark).not.toHaveBeenCalled();
            expect(store.hasFetchedEditForm()).toBe(true);
        });

        it('不正な値から正しい値へ戻ったら、フォームを出して題名を戻す', async () => {
            await open({ calendar_id: 'undefined', trip_direction: '0' });
            expect(notFoundShown()).toBe(true);

            await open({
                calendar_id: CALENDAR,
                trip_direction: '0',
                trip_block_id: BLOCK_A,
            });

            expect(notFoundShown()).toBe(false);
            expect(formShown()).toBe(true);
            expect(setTitle).toHaveBeenLastCalledWith(ROUTE_TITLE);
        });

        it('見つからない表示のときは下書きを消さず、復元の案内も出さない', async () => {
            await open({ calendar_id: 'undefined' });

            expect(service.clearDraft).not.toHaveBeenCalled();
            expect(service.getMatchingDraft).not.toHaveBeenCalled();
        });
    });

    describe.each([ETimetableEditFormMode.COPY, ETimetableEditFormMode.UPDATE])(
        '%s モードの列車の存在',
        (mode) => {
            beforeEach(() => setup(mode));

            it('列車が無いと api が返したら、見つからない表示にする', async () => {
                service.fetchTargetTripBlock.mockReturnValue(of(false));
                await open({
                    calendar_id: CALENDAR,
                    trip_direction: '0',
                    trip_block_id: BLOCK_A,
                });

                expect(notFoundShown()).toBe(true);
                expect(mark).toHaveBeenCalled();
                expect(formShown()).toBe(false);
                expect(
                    service.fetchCopySourceCandidates,
                ).not.toHaveBeenCalled();
            });

            it('列車の取得が 5xx なら見つからない表示にしない', async () => {
                await open({
                    calendar_id: CALENDAR,
                    trip_direction: '0',
                    trip_block_id: BLOCK_A,
                });
                service.fetchTargetTripBlock.mockReturnValue(
                    throwError(() => new Error('500')),
                );
                await expect(
                    fixture.componentInstance.fetchData(),
                ).rejects.toThrow('500');

                expect(notFoundShown()).toBe(false);
                expect(mark).not.toHaveBeenCalled();
            });

            it('trip_block_id が無いときは今までどおり（列車を取らず、見つからない表示にしない）', async () => {
                service.fetchTargetTripBlock.mockReturnValue(of(true));
                await open({ calendar_id: CALENDAR, trip_direction: '0' });

                expect(notFoundShown()).toBe(false);
                expect(mark).not.toHaveBeenCalled();
            });

            it('遅れて届いた前の URL の「列車が無い」で、今の URL を見つからない表示にしない', async () => {
                const late = new Subject<boolean>();
                service.fetchTargetTripBlock.mockReturnValueOnce(late);
                await open({
                    calendar_id: CALENDAR,
                    trip_direction: '0',
                    trip_block_id: BLOCK_A,
                });
                await open({
                    calendar_id: CALENDAR,
                    trip_direction: '0',
                    trip_block_id: BLOCK_B,
                });

                late.next(false);
                late.complete();
                await flush();
                fixture.detectChanges();

                expect(notFoundShown()).toBe(false);
                expect(mark).not.toHaveBeenCalled();
                expect(formShown()).toBe(true);
            });
        },
    );

    describe('取得の途中で URL が替わったとき', () => {
        beforeEach(() => setup(ETimetableEditFormMode.UPDATE));

        it('遅れて届いた前の URL の「ダイヤが無い」で、今の URL を見つからない表示にしない', async () => {
            const late = new Subject<boolean>();
            service.fetchCalendar.mockReturnValueOnce(late);
            await open({
                calendar_id: CALENDAR,
                trip_direction: '0',
                trip_block_id: BLOCK_A,
            });
            await open({
                calendar_id: CALENDAR,
                trip_direction: '0',
                trip_block_id: BLOCK_B,
            });

            late.next(false);
            late.complete();
            await flush();
            fixture.detectChanges();

            expect(notFoundShown()).toBe(false);
            expect(mark).not.toHaveBeenCalled();
        });

        it('不正な URL へ替わったあとに前の取得が終わっても、続きの取得も表示の切り替えもしない', async () => {
            const late = new Subject<boolean>();
            service.fetchCalendar.mockReturnValueOnce(late);
            await open({
                calendar_id: CALENDAR,
                trip_direction: '0',
                trip_block_id: BLOCK_A,
            });
            await open({ calendar_id: 'undefined' });

            late.next(true);
            late.complete();
            await flush();
            fixture.detectChanges();

            expect(notFoundShown()).toBe(true);
            expect(service.fetchTargetTripBlock).not.toHaveBeenCalled();
            expect(store.hasFetchedEditForm()).toBe(false);
        });
    });
});
