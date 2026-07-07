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
    opts: {
        arrivalDays?: number;
        departureDays?: number;
        pickupType?: number;
        dropoffType?: number;
    } = {},
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

function viewModesOf(
    stations: any[],
    trips: any[],
    tripDirection: 0 | 1,
): Map<string, ETimetableAllLineStationViewMode> {
    return TimetableAllLineUtil.deriveStationViewModes(
        stations,
        trips,
        tripDirection,
    );
}

describe('TimetableAllLineUtil.deriveStationViewModes（データ駆動）', () => {
    it('着時刻と発時刻が異なる列車がある駅は DEPARTURE_AND_ARRIVAL', () => {
        const station = makeStation('大和', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('大和', '10:00:00', '10:02:00'),
        ]);
        const modes = viewModesOf([station], [trip], 0);
        expect(modes.get('大和')).toBe(
            ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL,
        );
    });

    it('複数路線に跨る分岐・接続駅は DEPARTURE_AND_ARRIVAL', () => {
        const station = makeStation('二俣川', ['本線', 'いずみ野線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('二俣川', '10:00:00', '10:00:00'),
        ]);
        const modes = viewModesOf([station], [trip], 1);
        expect(modes.get('二俣川')).toBe(
            ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL,
        );
    });

    it('到着のみで当駅発が無い終端駅は方向別 ARRIVAL（上り = INBOUND）', () => {
        const station = makeStation('横浜', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('横浜', '10:00:00', null as any),
        ]);
        const modes = viewModesOf([station], [trip], 0);
        expect(modes.get('横浜')).toBe(
            ETimetableAllLineStationViewMode.ONLY_INBOUND_ARRIVAL,
        );
    });

    it('到着のみで当駅発が無い終端駅は方向別 ARRIVAL（下り = OUTBOUND）', () => {
        const station = makeStation('海老名', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('海老名', '10:00:00', null as any),
        ]);
        const modes = viewModesOf([station], [trip], 1);
        expect(modes.get('海老名')).toBe(
            ETimetableAllLineStationViewMode.ONLY_OUTBOUND_ARRIVAL,
        );
    });

    it('単一路線・発時刻のみの通常駅は ONLY_DEPARTURE', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('かしわ台', null as any, '10:01:00'),
        ]);
        const modes = viewModesOf([station], [trip], 0);
        expect(modes.get('かしわ台')).toBe(
            ETimetableAllLineStationViewMode.ONLY_DEPARTURE,
        );
    });
});

describe('TimetableAllLineUtil.getTime', () => {
    it('ONLY_DEPARTURE / mode=departure で発時刻を整形して返す', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('かしわ台', null as any, '10:01:00'),
        ]);
        const viewModes = viewModesOf([station], [trip], 0);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'departure',
                station,
                trip,
                stations: [station],
                trips: [trip],
                viewModes,
                bordersAfter: new Map(),
            }),
        ).toBe('1001');
    });

    it('pickupType=1 dropoffType=1 かつ発時刻なしで ↓ を返す', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('かしわ台', '10:00:00', null as any, {
                pickupType: 1,
                dropoffType: 1,
            }),
        ]);
        const viewModes = viewModesOf([station], [trip], 0);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'departure',
                station,
                trip,
                stations: [station],
                trips: [trip],
                viewModes,
                bordersAfter: new Map(),
            }),
        ).toBe('↓');
    });

    it('当駅に時刻が無く前後に時刻がある場合は | を返す', () => {
        const stA = makeStation('A', ['本線']);
        const stB = makeStation('B', ['本線']);
        const stC = makeStation('C', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('A', '10:00:00', '10:01:00'),
            makeTime('C', '10:10:00', '10:11:00'),
        ]);
        const stations = [stA, stB, stC];
        const viewModes = viewModesOf(stations, [trip], 0);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'departure',
                station: stB,
                trip,
                stations,
                trips: [trip],
                viewModes,
                bordersAfter: new Map(),
            }),
        ).toBe('|');
    });

    it('mode=arrival で着時刻を整形して返す', () => {
        const station = makeStation('かしわ台', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('かしわ台', '09:30:00', null as any),
        ]);
        const viewModes = viewModesOf([station], [trip], 0);
        expect(
            TimetableAllLineUtil.getTime({
                tripDirection: 0,
                mode: 'arrival',
                station,
                trip,
                stations: [station],
                trips: [trip],
                viewModes,
                bordersAfter: new Map(),
            }),
        ).toBe('-930');
    });
});

describe('TimetableAllLineUtil.sortTrips', () => {
    it('単一ブロックはそのまま返す', () => {
        const station = makeStation('A', ['本線']);
        const trip = makeTrip('t1', 'tb1', [
            makeTime('A', '10:00:00', '10:01:00'),
        ]);
        const block = makeTripBlock('tb1', [trip]);
        expect(TimetableAllLineUtil.sortTrips([station], [block])).toEqual([
            block,
        ]);
    });

    it('早い列車ブロックを先に並べる', () => {
        const station = makeStation('A', ['本線']);
        const trip1 = makeTrip('t1', 'tb1', [
            makeTime('A', '10:00:00', '10:01:00'),
        ]);
        const trip2 = makeTrip('t2', 'tb2', [
            makeTime('A', '09:00:00', '09:01:00'),
        ]);
        const block1 = makeTripBlock('tb1', [trip1]);
        const block2 = makeTripBlock('tb2', [trip2]);
        const result = TimetableAllLineUtil.sortTrips(
            [station],
            [block1, block2],
        );
        expect(result[0].tripBlockId).toBe('tb2');
        expect(result[1].tripBlockId).toBe('tb1');
    });
});
