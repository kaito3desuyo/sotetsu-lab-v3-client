import { ETimetableAllLineStationViewMode } from '../enums/timetable-all-line.enum';
import { TimetableAllLineUtil } from './timetable-all-line.util';

function makeStation(stationName: string, routeNames: string[]): any {
    return {
        stationId: stationName,
        stationName,
        routeStationLists: routeNames.map((routeName) => ({
            routeStationListId: routeName,
            route: { routeId: routeName, routeName },
        })),
    };
}

function makeTime(
    stationId: string,
    arrivalTime: string,
    departureTime: string,
    opts: { arrivalDays?: number; departureDays?: number; pickupType?: number; dropoffType?: number } = {},
): any {
    return {
        timeId: stationId,
        stationId,
        arrivalTime,
        departureTime,
        arrivalDays: opts.arrivalDays ?? 0,
        departureDays: opts.departureDays ?? 0,
        pickupType: opts.pickupType,
        dropoffType: opts.dropoffType,
    };
}

function makeTrip(tripId: string, tripBlockId: string, times: any[]): any {
    return { tripId, tripBlockId, times };
}

function makeTripBlock(tripBlockId: string, trips: any[]): any {
    return { tripBlockId, trips };
}

describe('TimetableAllLineUtil.getViewMode', () => {
    describe('tripDirection 0 (inbound)', () => {
        it('returns DEPARTURE_AND_ARRIVAL for 二俣川（本線／いずみ野線）', () => {
            const station = makeStation('二俣川', ['本線', 'いずみ野線']);
            expect(TimetableAllLineUtil.getViewMode(station, 0)).toBe(
                ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL,
            );
        });

        it('returns ONLY_INBOUND_ARRIVAL for 横浜（本線）', () => {
            const station = makeStation('横浜', ['本線']);
            expect(TimetableAllLineUtil.getViewMode(station, 0)).toBe(
                ETimetableAllLineStationViewMode.ONLY_INBOUND_ARRIVAL,
            );
        });

        it('returns ONLY_DEPARTURE for a regular station', () => {
            const station = makeStation('かしわ台', ['本線']);
            expect(TimetableAllLineUtil.getViewMode(station, 0)).toBe(
                ETimetableAllLineStationViewMode.ONLY_DEPARTURE,
            );
        });
    });

    describe('tripDirection 1 (outbound)', () => {
        it('returns DEPARTURE_AND_ARRIVAL for 二俣川（本線／いずみ野線）', () => {
            const station = makeStation('二俣川', ['本線', 'いずみ野線']);
            expect(TimetableAllLineUtil.getViewMode(station, 1)).toBe(
                ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL,
            );
        });

        it('returns ONLY_OUTBOUND_ARRIVAL for 海老名（本線）', () => {
            const station = makeStation('海老名', ['本線']);
            expect(TimetableAllLineUtil.getViewMode(station, 1)).toBe(
                ETimetableAllLineStationViewMode.ONLY_OUTBOUND_ARRIVAL,
            );
        });

        it('returns ONLY_DEPARTURE for a regular station', () => {
            const station = makeStation('かしわ台', ['本線']);
            expect(TimetableAllLineUtil.getViewMode(station, 1)).toBe(
                ETimetableAllLineStationViewMode.ONLY_DEPARTURE,
            );
        });
    });
});

describe('TimetableAllLineUtil.getBorderSetting', () => {
    it('returns true for 横浜（本線）tripDirection 0', () => {
        const station = makeStation('横浜', ['本線']);
        expect(TimetableAllLineUtil.getBorderSetting(station, 0)).toBe(true);
    });

    it('returns false for a regular station tripDirection 0', () => {
        const station = makeStation('かしわ台', ['本線']);
        expect(TimetableAllLineUtil.getBorderSetting(station, 0)).toBe(false);
    });

    it('returns true for 海老名（本線）tripDirection 1', () => {
        const station = makeStation('海老名', ['本線']);
        expect(TimetableAllLineUtil.getBorderSetting(station, 1)).toBe(true);
    });

    it('returns false for a regular station tripDirection 1', () => {
        const station = makeStation('かしわ台', ['本線']);
        expect(TimetableAllLineUtil.getBorderSetting(station, 1)).toBe(false);
    });
});

describe('TimetableAllLineUtil.getTime', () => {
    it('returns formatted departure time (ONLY_DEPARTURE / mode=departure)', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [makeTime('かしわ台', '10:00:00', '10:01:00')]);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'departure',
                station,
                trip,
                stations: [station],
                trips: [trip],
            }),
        ).toBe('1001');
    });

    it('returns ↓ when pickupType=1 dropoffType=1 and no departure time', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('かしわ台', '10:00:00', null as any, { pickupType: 1, dropoffType: 1 }),
        ]);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'departure',
                station,
                trip,
                stations: [station],
                trips: [trip],
            }),
        ).toBe('↓');
    });

    it('returns | when station has no time but times exist before and after', () => {
        const stA = makeStation('A', ['本線']);
        const stB = makeStation('B', ['本線']);
        const stC = makeStation('C', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('A', '10:00:00', '10:01:00'),
            makeTime('C', '10:10:00', '10:11:00'),
        ]);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'departure',
                station: stB,
                trip,
                stations: [stA, stB, stC],
                trips: [trip],
            }),
        ).toBe('|');
    });

    it('returns formatted arrival time (ONLY_DEPARTURE / mode=arrival)', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [makeTime('かしわ台', '09:30:00', '09:31:00')]);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'arrival',
                station,
                trip,
                stations: [station],
                trips: [trip],
            }),
        ).toBe('-930');
    });
});

describe('TimetableAllLineUtil.sortTrips', () => {
    it('returns single block unchanged', () => {
        const station = makeStation('A', ['本線']);
        const trip = makeTrip('t1', 'tb1', [makeTime('A', '10:00:00', '10:01:00')]);
        const block = makeTripBlock('tb1', [trip]);
        expect(TimetableAllLineUtil.sortTrips([station], [block])).toEqual([block]);
    });

    it('puts earlier trip block before later one', () => {
        const station = makeStation('A', ['本線']);
        const trip1 = makeTrip('t1', 'tb1', [makeTime('A', '10:00:00', '10:01:00')]);
        const trip2 = makeTrip('t2', 'tb2', [makeTime('A', '09:00:00', '09:01:00')]);
        const block1 = makeTripBlock('tb1', [trip1]);
        const block2 = makeTripBlock('tb2', [trip2]);
        const result = TimetableAllLineUtil.sortTrips([station], [block1, block2]);
        expect(result[0].tripBlockId).toBe('tb2');
        expect(result[1].tripBlockId).toBe('tb1');
    });
});
