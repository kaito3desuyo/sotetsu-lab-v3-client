import { TestBed } from '@angular/core/testing';
import { DeviceStorage } from 'src/app/core/storage/device-storage';
import { TimetableStationStore } from './timetable-station.store';

const trip6436 = {
    tripId: 'trip-6436',
    tripNumber: '6436',
    tripDirection: 0,
    tripBlockId: 'block-1',
    times: [
        {
            stationId: 'yokohama',
            stopSequence: 10,
            arrivalTime: '06:45:00',
            arrivalDays: 1,
        },
    ],
    tripOperationLists: [],
} as never;

const tripBlock1 = {
    tripBlockId: 'block-1',
    trips: [
        {
            tripId: 'trip-9436',
            tripNumber: '9436',
            times: [
                {
                    stationId: 'kashiwadai',
                    stopSequence: 1,
                    departureTime: '05:50:00',
                    departureDays: 1,
                },
            ],
        },
        trip6436,
    ],
} as never;

describe('TimetableStationStore', () => {
    it('timetableData の trip に tripBlock（他列車込み）が付与される', () => {
        const store = TestBed.inject(TimetableStationStore);
        store.setStationId('yokohama');
        store.setTrips([trip6436]);
        store.setTripBlocks([tripBlock1]);

        const data = store.timetableData();

        expect(data).toHaveLength(1);
        expect(data[0].hour).toBe('6');

        // 付与された tripBlock を直接見る。↪ に出すかどうか（この先の列車だけ）は
        // TimetableStationFindOtherTripsInSameTripBlockPipe の責務で、その spec で確かめる
        const trip = data[0].trips[0];
        const tripNumbers = trip.tripBlock.trips.map((o) => o.tripNumber);

        expect(tripNumbers).toEqual(['9436', '6436']);
    });

    it('取得の世代番号は新しい取得だけが最新になる', () => {
        const store = TestBed.inject(TimetableStationStore);

        const first = store.nextFetchSeq();
        expect(store.isLatestFetch(first)).toBe(true);

        const second = store.nextFetchSeq();
        expect(store.isLatestFetch(first)).toBe(false);
        expect(store.isLatestFetch(second)).toBe(true);
    });

    it('読み込み中は enable/disable/reset で切り替わる', () => {
        const store = TestBed.inject(TimetableStationStore);
        expect(store.isLoading()).toBe(false);

        store.enableLoading();
        store.enableLoading();
        store.disableLoading();
        expect(store.isLoading()).toBe(true);

        store.resetLoading();
        expect(store.isLoading()).toBe(false);
    });

    it('operationIds は列車の運用 ID を重複なく返す', () => {
        const store = TestBed.inject(TimetableStationStore);
        store.setTrips([
            { tripOperationLists: [{ operationId: 'op-1' }] },
            { tripOperationLists: [{ operationId: 'op-1' }] },
            { tripOperationLists: [{ operationId: 'op-2' }] },
            { tripOperationLists: [] },
        ] as never);

        expect(store.operationIds()).toEqual(['op-1', 'op-2']);
    });

    it('snapshot で取り出した中身を restoreSnapshot で戻せる（条件は今のまま）', () => {
        const store = TestBed.inject(TimetableStationStore);
        store.setCalendarId('cal-1');
        store.setCalendar({ calendarId: 'cal-1' } as never);
        store.setTrips([trip6436]);
        const snapshot = store.snapshot();

        store.setCalendarId('cal-2');
        store.setCalendar(null as never);
        store.setTrips([]);
        store.restoreSnapshot(snapshot);

        expect(store.calendarId()).toBe('cal-2');
        expect(store.snapshot()).toEqual(snapshot);
    });
});

describe('TimetableStationStore の操作帯の保存', () => {
    const getItem = jest.fn();
    const setItem = jest.fn();
    const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

    beforeEach(() => {
        getItem.mockReset();
        setItem.mockReset();
        getItem.mockResolvedValue(null);
        setItem.mockResolvedValue(undefined);
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: DeviceStorage,
                    useValue: { getItem, setItem, removeItem: jest.fn() },
                },
            ],
        });
    });

    it('初めは false で、set すると変わる', () => {
        const store = TestBed.inject(TimetableStationStore);
        expect(store.controlCollapsed()).toBe(false);

        store.setControlCollapsed(true);
        expect(store.controlCollapsed()).toBe(true);
    });

    it('端末には controlCollapsed だけを、ストア名のキーで書く', async () => {
        const store = TestBed.inject(TimetableStationStore);
        await flush();
        expect(getItem).toHaveBeenCalledWith('TimetableStationStore');

        store.setControlCollapsed(true);
        await flush();

        expect(setItem).toHaveBeenLastCalledWith({
            key: 'TimetableStationStore',
            value: { controlCollapsed: true },
        });
    });

    it('保存してある畳み状態を戻し、settingsReady を true にする', async () => {
        getItem.mockResolvedValue({ controlCollapsed: true });

        const store = TestBed.inject(TimetableStationStore);
        await flush();

        expect(store.controlCollapsed()).toBe(true);
        expect(store.settingsReady()).toBe(true);
    });
});
