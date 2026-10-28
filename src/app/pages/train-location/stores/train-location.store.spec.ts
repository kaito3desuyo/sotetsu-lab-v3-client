import { TestBed } from '@angular/core/testing';
import { OfflineSnapshots } from 'src/app/core/offline/offline-snapshots';
import { TrainLocationStore } from './train-location.store';

describe('TrainLocationStore', () => {
    const save = jest.fn();
    const restore = jest.fn();

    beforeEach(() => {
        save.mockReset();
        save.mockResolvedValue(undefined);
        restore.mockReset();
        TestBed.configureTestingModule({
            providers: [
                { provide: OfflineSnapshots, useValue: { save, restore } },
            ],
        });
    });

    it('setCalendarId / calendarId が同期する', () => {
        const store = TestBed.inject(TrainLocationStore);
        store.setCalendarId('cal-1');
        expect(store.calendarId()).toBe('cal-1');
    });

    it('setSelectedRouteId / selectedRouteId が同期する', () => {
        const store = TestBed.inject(TrainLocationStore);
        store.setSelectedRouteId('route-1');
        expect(store.selectedRouteId()).toBe('route-1');
    });

    it('setMode / mode が同期する', () => {
        const store = TestBed.inject(TrainLocationStore);
        store.setMode('specified');
        expect(store.mode()).toBe('specified');
    });

    it('enableLoading/disableLoading: キューの増減で isLoading が切り替わる', () => {
        const store = TestBed.inject(TrainLocationStore);
        store.enableLoading();
        expect(store.isLoading()).toBe(true);

        store.disableLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('resetLoading: キューを空にする', () => {
        const store = TestBed.inject(TrainLocationStore);
        store.enableLoading();
        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('setOperationSightingTimeCrossSection: operationNumber をキーに保持する', () => {
        const store = TestBed.inject(TrainLocationStore);
        const dto = { latestSighting: null, expectedSighting: {} } as any;
        store.setOperationSightingTimeCrossSection('11', dto);

        expect(store.operationSightingTimeCrossSections()['11']).toBe(dto);
    });

    it('setTripBlocksByDirection / tripBlocksByDirection が同期する', () => {
        const store = TestBed.inject(TrainLocationStore);
        const data = { 0: [], 1: [] };
        store.setTripBlocksByDirection(data);
        expect(store.tripBlocksByDirection()).toBe(data);
    });

    it('selectedStationId を保持する', () => {
        const store = TestBed.inject(TrainLocationStore);
        store.setSelectedStationId('s1');
        expect(store.selectedStationId()).toBe('s1');
        store.setSelectedStationId(null);
        expect(store.selectedStationId()).toBeNull();
    });

    describe('取得の世代番号', () => {
        it('nextFetchSeq は進め、新しい番号だけが最新になる', () => {
            const store = TestBed.inject(TrainLocationStore);
            const first = store.nextFetchSeq();
            expect(store.isLatestFetch(first)).toBe(true);

            const second = store.nextFetchSeq();
            expect(second).toBe(first + 1);
            expect(store.isLatestFetch(first)).toBe(false);
            expect(store.isLatestFetch(second)).toBe(true);
        });
    });

    describe('圏外の保存', () => {
        const conditions = { calendarId: 'cal-1', routeId: 'r1' };

        it('main: 駅軸・種別・列車・つながりだけを、同じキーで保存する', async () => {
            const store = TestBed.inject(TrainLocationStore);
            const stationAxisStations = [{ stationId: 'st-1' }] as never;
            const tripClasses = [{ tripClassId: 'tc' }] as never;
            const tripBlocksByDirection = {
                0: [{ tripBlockId: 'b1' }],
            } as never;
            const itineraryLinks = [{ operationId: 'op' }] as never;
            store.setStationAxisStations(stationAxisStations);
            store.setTripClasses(tripClasses);
            store.setTripBlocksByDirection(tripBlocksByDirection);
            store.setItineraryLinks(itineraryLinks);
            store.setCalendarId('cal-1');
            store.setMode('specified');

            await store.saveOfflineSnapshot('main', conditions);

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
        });

        it('main: 戻すと中身だけを入れ、条件と画面の状態は今のまま', async () => {
            const store = TestBed.inject(TrainLocationStore);
            store.setCalendarId('cal-keep');
            store.setSelectedRouteId('keep');
            store.setMode('specified');
            const stationAxisStations = [{ stationId: 'st-9' }] as never;
            restore.mockImplementation(
                (params: {
                    apply: (data: unknown, savedAt: number) => void;
                }) => {
                    params.apply(
                        {
                            stationAxisStations,
                            tripClasses: [],
                            tripBlocksByDirection: {},
                            itineraryLinks: [],
                        },
                        0,
                    );
                    return Promise.resolve(null);
                },
            );

            await store.restoreOfflineSnapshot('main', conditions);

            expect(restore).toHaveBeenCalledWith({
                key: 'TrainLocation',
                conditions,
                apply: expect.any(Function),
            });
            expect(store.stationAxisStations()).toEqual(stationAxisStations);
            expect(store.calendarId()).toBe('cal-keep');
            expect(store.selectedRouteId()).toBe('keep');
            expect(store.mode()).toBe('specified');
        });

        it('sightings: 別のキーで、運用番号ごとの目撃を保存する', async () => {
            const store = TestBed.inject(TrainLocationStore);
            const dto = { expectedSighting: { sightingTime: 'x' } } as any;
            store.setOperationSightingTimeCrossSection('51', dto);

            await store.saveOfflineSnapshot('sightings', conditions);

            expect(save).toHaveBeenCalledWith({
                key: 'TrainLocationSightings',
                conditions,
                data: { '51': dto },
            });
        });

        it('sightings: 戻した目撃は、すでに取れている目撃を上書きしない', async () => {
            const store = TestBed.inject(TrainLocationStore);
            const fresh = {
                expectedSighting: { sightingTime: 'fresh' },
            } as any;
            const saved = {
                expectedSighting: { sightingTime: 'saved' },
            } as any;
            store.setOperationSightingTimeCrossSection('52', fresh);
            restore.mockImplementation(
                (params: {
                    apply: (data: unknown, savedAt: number) => void;
                }) => {
                    params.apply(
                        {
                            '51': saved,
                            '52': {
                                expectedSighting: { sightingTime: 'old' },
                            },
                        },
                        0,
                    );
                    return Promise.resolve(null);
                },
            );

            await store.restoreOfflineSnapshot('sightings', conditions);

            expect(restore).toHaveBeenCalledWith({
                key: 'TrainLocationSightings',
                conditions,
                apply: expect.any(Function),
            });
            expect(store.operationSightingTimeCrossSections()).toEqual({
                '51': saved,
                '52': fresh,
            });
        });
    });
});
