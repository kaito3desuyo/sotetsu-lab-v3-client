import { TrainLocationStore } from './train-location.store';

describe('TrainLocationStore', () => {
    afterEach(() => {
        TrainLocationStore.setCalendarId(null);
        TrainLocationStore.setSelectedRouteId(null);
        TrainLocationStore.setSelectedStationId(null);
        TrainLocationStore.setMode('now');
        TrainLocationStore.setSpecifiedTime(null);
        TrainLocationStore.setStationAxisStations([]);
        TrainLocationStore.setTripBlocksByDirection({});
        TrainLocationStore.resetLoading();
    });

    it('setCalendarId / calendarId が同期する', () => {
        TrainLocationStore.setCalendarId('cal-1');
        expect(TrainLocationStore.calendarId).toBe('cal-1');
    });

    it('setSelectedRouteId / selectedRouteId が同期する', () => {
        TrainLocationStore.setSelectedRouteId('route-1');
        expect(TrainLocationStore.selectedRouteId).toBe('route-1');
    });

    it('setMode / mode が同期する', () => {
        TrainLocationStore.setMode('specified');
        expect(TrainLocationStore.mode).toBe('specified');
    });

    it('enableLoading/disableLoading: キューの増減で isLoading$ が切り替わる', (done) => {
        TrainLocationStore.enableLoading();
        TrainLocationStore.isLoading$.subscribe((isLoading) => {
            expect(isLoading).toBe(true);
            done();
        });
    });

    it('resetLoading: キューを空にする', (done) => {
        TrainLocationStore.enableLoading();
        TrainLocationStore.resetLoading();
        TrainLocationStore.isLoading$.subscribe((isLoading) => {
            expect(isLoading).toBe(false);
            done();
        });
    });

    it('setOperationSightingTimeCrossSection: operationNumber をキーに保持する', (done) => {
        const dto = { latestSighting: null, expectedSighting: {} } as any;
        TrainLocationStore.setOperationSightingTimeCrossSection('11', dto);

        TrainLocationStore.operationSightingTimeCrossSections$.subscribe(
            (state) => {
                expect(state['11']).toBe(dto);
                done();
            },
        );
    });

    it('setTripBlocksByDirection / tripBlocksByDirection が同期する', () => {
        const data = { 0: [], 1: [] };
        TrainLocationStore.setTripBlocksByDirection(data);
        expect(TrainLocationStore.tripBlocksByDirection).toBe(data);
    });

    it('selectedStationId を保持する', () => {
        TrainLocationStore.setSelectedStationId('s1');
        expect(TrainLocationStore.selectedStationId).toBe('s1');
        TrainLocationStore.setSelectedStationId(null);
        expect(TrainLocationStore.selectedStationId).toBeNull();
    });
});
