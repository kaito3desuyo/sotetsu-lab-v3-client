import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActivatedRoute,
    convertToParamMap,
    provideRouter,
} from '@angular/router';
import { Observable, of, Subject, switchMap, throwError, timer } from 'rxjs';

import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { SsrResponse } from 'src/app/core/ssr/ssr-response';
import { OperationPastTimeComponent } from './operation-past-time.component';
import { OperationPastTimeService } from './services/operation-past-time.service';
import { OperationPastTimeStore } from './stores/operation-past-time.store';

describe('OperationPastTimeComponent', () => {
    let component: OperationPastTimeComponent;
    let fixture: ComponentFixture<OperationPastTimeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => of(undefined),
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('fetchData: フェッチ完了で loadingQueue が空になる', async () => {
        await component.fetchData();

        expect(TestBed.inject(OperationPastTimeStore).isLoading()).toBe(false);
    });
});

describe('OperationPastTimeComponent の取得のフラグ', () => {
    let fixture: ComponentFixture<OperationPastTimeComponent>;
    let sightings$: Subject<undefined>;

    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
    const hasFetched = () =>
        TestBed.inject(OperationPastTimeStore).hasFetchedPastTime();

    beforeEach(async () => {
        sightings$ = new Subject<undefined>();
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                reference_date: '2026-10-22',
                                days: '7',
                            }),
                        ),
                    },
                },
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => sightings$,
                    },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    });

    afterEach(() => {
        jest.restoreAllMocks();
        fixture.destroy();
    });

    it('取り終わるまでは false、取り終えたら true', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        expect(hasFetched()).toBe(false);

        sightings$.next(undefined);
        sightings$.complete();
        await flush();

        expect(hasFetched()).toBe(true);
    });

    it('失敗しても true にする', async () => {
        const original = OperationPastTimeComponent.prototype.fetchData;
        const spy = jest
            .spyOn(OperationPastTimeComponent.prototype, 'fetchData')
            .mockImplementation(function (this: OperationPastTimeComponent) {
                return original.call(this).catch(() => undefined);
            });
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        // ネイティブの await が Promise.all に then をつなぐのを待ってから失敗させる
        await flush();

        sightings$.error(new Error('offline'));
        await flush();
        spy.mockRestore();

        expect(hasFetched()).toBe(true);
    });

    it('入ったときは前の訪問の「取り終えた」を引き継がない', () => {
        TestBed.inject(OperationPastTimeStore).setHasFetchedPastTime(true);
        // 取得の始めのリセットでは false に戻らない道（取得を空にする）で確かめる
        const fetchData = jest
            .spyOn(OperationPastTimeComponent.prototype, 'fetchData')
            .mockResolvedValue(undefined);
        fixture = TestBed.createComponent(OperationPastTimeComponent);

        expect(fetchData).toHaveBeenCalled();
        expect(hasFetched()).toBe(false);
    });

    it('古い取得が後から終わっても、新しい取得が終わるまで false のまま', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        const first = sightings$;
        sightings$ = new Subject<undefined>();
        fixture.componentInstance.fetchData().catch(() => undefined);

        first.next(undefined);
        first.complete();
        await flush();

        expect(hasFetched()).toBe(false);
    });

    it('ページを離れてすぐ戻ったとき、前のインスタンスの取得が後から終わっても、新しい取得が終わるまで false のまま', async () => {
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        const previous$ = sightings$;
        fixture.destroy();
        sightings$ = new Subject<undefined>();
        fixture = TestBed.createComponent(OperationPastTimeComponent);

        previous$.next(undefined);
        previous$.complete();
        await flush();
        expect(hasFetched()).toBe(false);

        sightings$.next(undefined);
        sightings$.complete();
        await flush();
        expect(hasFetched()).toBe(true);
    });
});

describe('OperationPastTimeComponent のサーバー', () => {
    it('過ぎた日の期間は長く置き、日付ごとのタグを付ける', async () => {
        const addCacheTags = jest.fn();
        const setCachePolicy = jest.fn();
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(
                            convertToParamMap({
                                reference_date: '2026-10-01',
                                days: '2',
                            }),
                        ),
                    },
                },
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => of(undefined),
                    },
                },
                {
                    provide: SsrResponse,
                    useValue: { addCacheTags, setCachePolicy },
                },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        TestBed.createComponent(OperationPastTimeComponent);

        expect(setCachePolicy).toHaveBeenCalledWith('long');
        expect(addCacheTags).toHaveBeenCalledWith([
            'sighting-date:2026-10-01',
            'sighting-date:2026-10-02',
        ]);
    });
});

describe('OperationPastTimeComponent の圏外の保存', () => {
    let fixture: ComponentFixture<OperationPastTimeComponent>;
    let fetchDataSpy: jest.SpyInstance;
    let sightings$: Observable<undefined>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const calendars = [
        { date: '2026-10-22', calendar: { calendarId: 'c-1' } },
    ] as never;
    const operations = [{ operationId: 'op-1' }] as never;
    const formations = [{ formationId: 'f-1' }] as never;
    const operationSightings = [{ operationSightingId: 's-1' }] as never;
    const conditions = {
        referenceDate: '2026-10-22',
        days: 7,
        includeInvalidated: false,
    };

    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
    // 次のタスクで失敗する取得。すぐ失敗させると「処理されない拒否」と見なされ、
    // ComponentFixture が投げ直してしまう
    const failLater = (message: string) =>
        timer(0).pipe(switchMap(() => throwError(() => new Error(message))));

    const setup = async (
        params: Record<string, string> = {
            reference_date: '2026-10-22',
            days: '7',
        },
    ) => {
        // fetchData() は失敗を投げ直す（既存の振る舞い）。コンストラクタは受け止めないので、
        // 本物の fetchData の失敗だけ受け流す
        const original = OperationPastTimeComponent.prototype.fetchData;
        fetchDataSpy = jest
            .spyOn(OperationPastTimeComponent.prototype, 'fetchData')
            .mockImplementation(function (this: OperationPastTimeComponent) {
                return original.call(this).catch(() => undefined);
            });
        await TestBed.configureTestingModule({
            imports: [OperationPastTimeComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap(params)),
                    },
                },
                {
                    provide: OperationPastTimeService,
                    useValue: {
                        fetchCalendarByDate: () => of(undefined),
                        fetchFormations: () => of(undefined),
                        fetchOperationsV3: () => of(undefined),
                        fetchOperationSightingsV3: () => sightings$,
                    },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(OperationPastTimeComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();
    };

    afterEach(() => {
        fetchDataSpy.mockRestore();
        fixture?.destroy();
        jest.clearAllMocks();
        restore.mockReset();
    });

    it('成功したら条件と中身を保存する', async () => {
        sightings$ = of(undefined);
        await setup();
        TestBed.inject(OperationPastTimeStore).setCalendars(calendars);
        TestBed.inject(OperationPastTimeStore).setOperations(operations);
        TestBed.inject(OperationPastTimeStore).setFormations(formations);
        TestBed.inject(OperationPastTimeStore).setOperationSightings(
            operationSightings,
        );

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        await flush();

        expect(save).toHaveBeenCalledWith({
            key: 'OperationPastTime',
            conditions,
            data: { calendars, operations, formations, operationSightings },
        });
        expect(restore).not.toHaveBeenCalled();
    });

    it('日付の無い URL では、成功しても保存しない', async () => {
        sightings$ = of(undefined);
        // 起点の日・日数の無い素の URL（取得は何もせず終わる）
        await setup({});

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻す', async () => {
        sightings$ = failLater('offline');
        await setup();
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = fixture.componentInstance.isLoading();
                params.apply(
                    { calendars, operations, formations, operationSightings },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        await flush();

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'OperationPastTime',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        const store = TestBed.inject(OperationPastTimeStore);
        expect(store.calendars()).toEqual(calendars);
        expect(store.operations()).toEqual(operations);
        expect(store.formations()).toEqual(formations);
        expect(store.operationSightings()).toEqual(operationSightings);
        expect(fixture.componentInstance.isLoading()).toBe(false);
        expect(store.hasFetchedPastTime()).toBe(true);
    });

    it('戻す処理が壊れていても、読み込み中は解く', async () => {
        sightings$ = failLater('offline');
        await setup();
        restore.mockRejectedValue(new Error('broken snapshot'));

        fixture = TestBed.createComponent(OperationPastTimeComponent);
        await flush();

        expect(fixture.componentInstance.isLoading()).toBe(false);
    });

    it('取得の失敗は今までどおり投げ直す', async () => {
        sightings$ = failLater('offline');
        await setup();
        restore.mockResolvedValue(null);
        fixture = TestBed.createComponent(OperationPastTimeComponent);
        // コンストラクタの取得が終わるのを待ってから、本物の取得を直接呼ぶ
        await flush();
        sightings$ = failLater('offline-again');
        fetchDataSpy.mockRestore();

        await expect(fixture.componentInstance.fetchData()).rejects.toThrow(
            'offline-again',
        );
    });

    it('古い取得が失敗しても、保存した中身は戻さない', async () => {
        const first$ = new Subject<undefined>();
        sightings$ = first$;
        await setup();
        fixture = TestBed.createComponent(OperationPastTimeComponent);

        // 取り直しを始めてから、先の取得の失敗が届く
        sightings$ = of(undefined);
        await fixture.componentInstance.fetchData();
        first$.error(new Error('offline-first'));
        await flush();

        expect(restore).not.toHaveBeenCalled();
    });
});
