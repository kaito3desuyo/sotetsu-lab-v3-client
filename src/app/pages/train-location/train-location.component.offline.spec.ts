import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { format } from 'date-fns';
import { Observable, Subject, firstValueFrom, of, throwError } from 'rxjs';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { getRailwayDate } from 'src/app/core/utils/railway-day';
import { RouteStationListStateQuery } from 'src/app/global-states/route-station-list.state';
import { TodaysCalendarListStateQuery } from 'src/app/global-states/todays-calendar-list.state';
import { TrainLocationService } from './services/train-location.service';
import { TrainLocationStore } from './stores/train-location.store';
import { TrainLocationComponent } from './train-location.component';

describe('TrainLocationComponent の圏外の保存', () => {
    let fixture: ComponentFixture<TrainLocationComponent>;
    let component: TrainLocationComponent;
    let tripBlocks$: Observable<undefined>;
    let stationAxis$: Observable<undefined>;
    // 前後の運用の取得の結果（failed が true なら取得に失敗している）
    let itineraryLinks$: Observable<{ failed: boolean } | undefined>;
    // 目撃の取得の結果（true: 新しく取れた / false: 取るものが無かった）
    let sightings$: Observable<boolean>;
    const save = jest.fn(() => Promise.resolve());
    const restore = jest.fn();

    const stationAxisStations = [{ stationId: 'st-1' }] as never;
    const tripClasses = [{ tripClassId: 'tc-1' }] as never;
    const tripBlocksByDirection = { 0: [{ tripBlockId: 'tb-1' }] } as never;
    const itineraryLinks = [{ operationId: 'op-1' }] as never;
    const conditions = { calendarId: 'cal-1', routeId: 'route-1' };
    const both = { refetchTripBlocks: true, refetchStationAxis: true };

    // 実タイマーは使わない（他の describe の遷移の失敗が、待っている間に漏れてくるため）
    const flush = async () => {
        for (let i = 0; i < 20; i++) await Promise.resolve();
    };

    const fillStore = () => {
        TrainLocationStore.setStationAxisStations(stationAxisStations);
        TrainLocationStore.setTripClasses(tripClasses);
        TrainLocationStore.setTripBlocksByDirection(tripBlocksByDirection);
        TrainLocationStore.setItineraryLinks(itineraryLinks);
    };

    beforeEach(async () => {
        tripBlocks$ = of(undefined);
        stationAxis$ = of(undefined);
        itineraryLinks$ = of(undefined);
        sightings$ = of(false);
        await TestBed.configureTestingModule({
            imports: [TrainLocationComponent],
            providers: [
                // 実際の Router だと、コンストラクタの補正の遷移が後から失敗して他のテストへ漏れる
                { provide: Router, useValue: { navigate: jest.fn() } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({})),
                        snapshot: { params: {} },
                    },
                },
                {
                    provide: TrainLocationService,
                    useValue: {
                        fetchTripClasses: () => of(undefined),
                        fetchTripBlocks: () => tripBlocks$,
                        fetchItineraryLinks: () => itineraryLinks$,
                        fetchStationAxis: () => stationAxis$,
                        fetchMissingOperationSightingTimeCrossSections: () =>
                            sightings$,
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
                        operatingSystemEndsByRouteId$: of({}),
                    },
                },
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        })
            .overrideComponent(TrainLocationComponent, {
                set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(TrainLocationComponent);
        component = fixture.componentInstance;
        // 条件
        TrainLocationStore.setCalendarId('cal-1');
        TrainLocationStore.setSelectedRouteId('route-1');
    });

    afterEach(() => {
        fixture.destroy();
        jest.clearAllMocks();
        restore.mockReset();
        TrainLocationStore.setCalendarId(null);
        TrainLocationStore.setSelectedRouteId(null);
        TrainLocationStore.setStationAxisStations([]);
        TrainLocationStore.setTripClasses([]);
        TrainLocationStore.setTripBlocksByDirection({});
        TrainLocationStore.setItineraryLinks([]);
        TrainLocationStore.restoreOperationSightingTimeCrossSections({});
        TrainLocationStore.setHasFetchedTrainLocation(false);
        TrainLocationStore.resetLoading();
    });

    it('全部成功したら条件と中身を保存する', async () => {
        fillStore();

        await component.fetchData(both);

        expect(save).toHaveBeenCalledWith({
            key: 'TrainLocation',
            conditions,
            data: {
                stationAxisStations,
                tripClasses,
                tripBlocksByDirection,
                itineraryLinks,
            },
        });
        expect(restore).not.toHaveBeenCalled();
    });

    it('失敗したら保存した中身を、読み込み中を解く前に戻し、失敗は今までどおり投げる', async () => {
        const failing$ = new Subject<undefined>();
        tripBlocks$ = failing$;
        let isLoadingWhenRestored: boolean | undefined;
        restore.mockImplementation(
            (params: { apply: (data: unknown, savedAt: number) => void }) => {
                isLoadingWhenRestored = component.isLoading();
                params.apply(
                    {
                        stationAxisStations,
                        tripClasses,
                        tripBlocksByDirection,
                        itineraryLinks,
                    },
                    0,
                );
                return Promise.resolve(null);
            },
        );

        const fetching = component.fetchData(both);
        await flush();
        failing$.error(new Error('offline'));
        await expect(fetching).rejects.toThrow('offline');

        expect(save).not.toHaveBeenCalled();
        expect(restore).toHaveBeenCalledWith({
            key: 'TrainLocation',
            conditions,
            apply: expect.any(Function),
        });
        expect(isLoadingWhenRestored).toBe(true);
        expect(TrainLocationStore.snapshot()).toEqual({
            stationAxisStations,
            tripClasses,
            tripBlocksByDirection,
            itineraryLinks,
        });
        expect(await firstValueFrom(TrainLocationStore.isLoading$)).toBe(false);
        expect(
            await firstValueFrom(TrainLocationStore.hasFetchedTrainLocation$),
        ).toBe(true);
    });

    it('片方が先に失敗しても、遅い方が終わるまで保存した中身を戻さない', async () => {
        const slow$ = new Subject<undefined>();
        tripBlocks$ = throwError(() => new Error('offline'));
        stationAxis$ = slow$;

        const fetching = component.fetchData(both);
        const settled = fetching.catch(() => undefined);
        await flush();
        expect(restore).not.toHaveBeenCalled();

        slow$.next(undefined);
        slow$.complete();
        await settled;

        expect(restore).toHaveBeenCalledTimes(1);
        await expect(fetching).rejects.toThrow('offline');
    });

    it('前後の運用の取得だけ失敗したら、保存も戻しもしない（路線図は出す）', async () => {
        itineraryLinks$ = of({ failed: true });

        await component.fetchData(both);

        expect(save).not.toHaveBeenCalled();
        expect(restore).not.toHaveBeenCalled();
        expect(await firstValueFrom(TrainLocationStore.isLoading$)).toBe(false);
        expect(
            await firstValueFrom(TrainLocationStore.hasFetchedTrainLocation$),
        ).toBe(true);
    });

    it('前の取得が失敗していたら、路線だけの取り直しが成功しても保存しない（ダイヤと路線の組がずれるため）', async () => {
        tripBlocks$ = throwError(() => new Error('offline'));
        await expect(component.fetchData(both)).rejects.toThrow('offline');
        restore.mockReset();

        tripBlocks$ = of(undefined);
        await component.fetchData({
            refetchTripBlocks: false,
            refetchStationAxis: true,
        });

        expect(save).not.toHaveBeenCalled();
    });

    it('成功したあとの路線だけの取り直しは、新しい条件で保存する', async () => {
        await component.fetchData(both);
        save.mockClear();
        TrainLocationStore.setSelectedRouteId('route-2');

        await component.fetchData({
            refetchTripBlocks: false,
            refetchStationAxis: true,
        });

        expect(save).toHaveBeenCalledWith(
            expect.objectContaining({
                key: 'TrainLocation',
                conditions: { calendarId: 'cal-1', routeId: 'route-2' },
            }),
        );
    });

    it('古い取得が失敗しても、保存した中身は戻さない', async () => {
        const first$ = new Subject<undefined>();
        tripBlocks$ = first$;
        const first = component.fetchData(both).catch(() => undefined);
        await flush();

        // 取り直しが始まり終わってから、先の取得の失敗が届く
        tripBlocks$ = of(undefined);
        await component.fetchData(both);
        first$.error(new Error('offline-first'));
        await first;

        expect(restore).not.toHaveBeenCalled();
    });

    it('戻す処理が壊れていても読み込みを解き、元の失敗を投げ直す', async () => {
        tripBlocks$ = throwError(() => new Error('offline'));
        restore.mockRejectedValue(new Error('restore broken'));

        await expect(component.fetchData(both)).rejects.toThrow('offline');

        expect(restore).toHaveBeenCalledTimes(1);
        expect(await firstValueFrom(TrainLocationStore.isLoading$)).toBe(false);
        expect(
            await firstValueFrom(TrainLocationStore.hasFetchedTrainLocation$),
        ).toBe(true);
    });

    describe('目撃（動いている列車の運用の目撃）', () => {
        const crossSection = {
            expectedSighting: { sightingTime: 'saved' },
        } as never;
        const sightingConditions = () => ({
            calendarId: 'cal-1',
            routeId: 'route-1',
            date: format(getRailwayDate(new Date()), 'yyyy-MM-dd'),
        });

        it('目撃が取れたら、日付つきで別の key に保存する', async () => {
            sightings$ = new Observable<boolean>((subscriber) => {
                TrainLocationStore.setOperationSightingTimeCrossSection(
                    '51',
                    crossSection,
                );
                subscriber.next(true);
                subscriber.complete();
            });

            await component.fetchOperationSightings(['51']);

            expect(save).toHaveBeenCalledWith({
                key: 'TrainLocationSightings',
                conditions: sightingConditions(),
                data: { '51': crossSection },
            });
            expect(restore).not.toHaveBeenCalled();
        });

        it('新しく取るものが無かったときは保存しない', async () => {
            sightings$ = of(false);

            await component.fetchOperationSightings(['51']);

            expect(save).not.toHaveBeenCalled();
            expect(restore).not.toHaveBeenCalled();
        });

        it('目撃が取れなかったら、保存した目撃を戻して失敗は今までどおり投げる（すでに取れていた目撃は残す）', async () => {
            TrainLocationStore.setOperationSightingTimeCrossSection('52', {
                expectedSighting: { sightingTime: 'fresh' },
            } as never);
            sightings$ = throwError(() => new Error('offline'));
            restore.mockImplementation(
                (params: {
                    apply: (data: unknown, savedAt: number) => void;
                }) => {
                    params.apply(
                        {
                            '51': crossSection,
                            '52': { expectedSighting: { sightingTime: 'old' } },
                        },
                        0,
                    );
                    return Promise.resolve(null);
                },
            );

            await expect(
                component.fetchOperationSightings(['51']),
            ).rejects.toThrow('offline');

            expect(save).not.toHaveBeenCalled();
            expect(restore).toHaveBeenCalledWith({
                key: 'TrainLocationSightings',
                conditions: sightingConditions(),
                apply: expect.any(Function),
            });
            const sightings = await firstValueFrom(
                TrainLocationStore.operationSightingTimeCrossSections$,
            );
            expect(sightings['51']).toEqual(crossSection);
            expect(sightings['52']).toEqual({
                expectedSighting: { sightingTime: 'fresh' },
            });
        });

        it('保存が戻らなかったとき（日付が違うなど）は、目撃を足さずに失敗を投げる', async () => {
            sightings$ = throwError(() => new Error('offline'));
            restore.mockResolvedValue(null);

            await expect(
                component.fetchOperationSightings(['51']),
            ).rejects.toThrow('offline');

            expect(
                await firstValueFrom(
                    TrainLocationStore.operationSightingTimeCrossSections$,
                ),
            ).toEqual({});
        });

        it('戻す処理が壊れていても、元の失敗を投げ直す', async () => {
            sightings$ = throwError(() => new Error('offline'));
            restore.mockRejectedValue(new Error('restore broken'));

            await expect(
                component.fetchOperationSightings(['51']),
            ).rejects.toThrow('offline');
        });
    });
});
