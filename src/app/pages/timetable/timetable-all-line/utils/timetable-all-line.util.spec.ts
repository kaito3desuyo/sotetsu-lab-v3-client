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

/** 本番と同じ駅一覧の判定（getViewMode）で駅 → 表示モードの Map を作る。 */
function viewModesOf(
    stations: any[],
    _trips: any[],
    tripDirection: 0 | 1,
): Map<string, ETimetableAllLineStationViewMode> {
    return new Map(
        stations.map((station) => [
            station.stationId,
            TimetableAllLineUtil.getViewMode(station, tripDirection),
        ]),
    );
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

    // 相鉄と東急の境の駅。着発 2 段にする（ユーザー指示 2026-10-05）
    it.each([0, 1] as const)(
        'returns DEPARTURE_AND_ARRIVAL for 新横浜（新横浜線／東急新横浜線） in direction %i',
        (direction) => {
            const station = makeStation('新横浜', ['新横浜線', '東急新横浜線']);
            expect(TimetableAllLineUtil.getViewMode(station, direction)).toBe(
                ETimetableAllLineStationViewMode.DEPARTURE_AND_ARRIVAL,
            );
        },
    );
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
                viewModes,
                bordersAfter: new Map(),
            }),
        ).toBe('-930');
    });

    // 前の列の列車は、ページ分けの前の並びから渡す。前のページにあっても印が消えない（ユーザー指摘 2026-10-05）
    describe('着発 2 段の駅で同じ運行の前の列車がある', () => {
        const station = makeStation('新横浜', ['新横浜線', '東急新横浜線']);
        const trip = makeTrip('t2', 'tb1', [
            makeTime('新横浜', null as any, '10:05:00'),
        ]);
        const viewModes = viewModesOf([station], [trip], 1);
        const getArrival = (previousTrip?: any) =>
            TimetableAllLineUtil.getTime({
                tripDirection: 1,
                mode: 'arrival',
                station,
                trip,
                stations: [station],
                previousTrip,
                viewModes,
                bordersAfter: new Map(),
            });

        it('前の列車が同じ運行で当駅に時刻を持つなら ⬎ を返す', () => {
            const previousTrip = makeTrip('t1', 'tb1', [
                makeTime('新横浜', '10:00:00', null as any),
            ]);
            expect(getArrival(previousTrip)).toBe('⬎');
        });

        it('前の列車が別の運行なら ⬎ にしない', () => {
            const previousTrip = makeTrip('t0', 'tb0', [
                makeTime('新横浜', '10:00:00', null as any),
            ]);
            expect(getArrival(previousTrip)).toBe('‥');
        });

        it('前の列車が無ければ ⬎ にしない', () => {
            expect(getArrival(undefined)).toBe('‥');
        });
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

    /** 並べた結果をブロック ID の列にする */
    const ids = (blocks: any[]): string[] => blocks.map((b) => b.tripBlockId);

    it('支線と本線の列車は、合流駅の時刻の順に並べる（始発の早さではない）', () => {
        // 上り: 湘南台（支線）・海老名（本線）→ 二俣川で合流。表の上から 湘南台, 海老名, 二俣川
        const stations = [
            makeStation('湘南台', ['いずみ野線']),
            makeStation('海老名', ['本線']),
            makeStation('二俣川', ['本線', 'いずみ野線']),
        ];
        const branch = makeTripBlock('branch', [
            makeTrip('b', 'branch', [
                makeTime('湘南台', null as any, '05:00:00'),
                makeTime('二俣川', '05:23:00', '05:24:00'),
            ]),
        ]);
        const main = makeTripBlock('main', [
            makeTrip('m', 'main', [
                makeTime('海老名', null as any, '05:01:00'),
                makeTime('二俣川', '05:20:00', '05:21:00'),
            ]),
        ]);
        expect(
            ids(TimetableAllLineUtil.sortTrips(stations, [branch, main])),
        ).toEqual(['main', 'branch']);
    });

    it('共通駅の着が同分なら、先に出る方を前にする', () => {
        const stations = [makeStation('西谷', ['本線'])];
        const early = makeTripBlock('early', [
            makeTrip('e', 'early', [makeTime('西谷', '09:03:00', '09:03:00')]),
        ]);
        const late = makeTripBlock('late', [
            makeTrip('l', 'late', [makeTime('西谷', '09:03:00', '09:05:00')]),
        ]);
        expect(
            ids(TimetableAllLineUtil.sortTrips(stations, [late, early])),
        ).toEqual(['early', 'late']);
    });

    it('共通の駅が無い列車は始発時刻で並べ、比べられる相手との順も守る', () => {
        // 厚木→かしわ台の回送（5:15 発・かしわ台 5:22 着）は、かしわ台 5:19 の列車の後ろ・
        // 5:31 の列車の前。共通駅の無い横浜発 5:18 の列車は始発時刻どおり回送より後ろ
        const stations = [
            makeStation('厚木', ['厚木線']),
            makeStation('海老名', ['本線']),
            makeStation('かしわ台', ['本線']),
            makeStation('横浜', ['本線']),
        ];
        const block = (id: string, times: any[]) =>
            makeTripBlock(id, [makeTrip(id, id, times)]);
        const before = block('before', [
            makeTime('海老名', null as any, '05:16:00'),
            makeTime('かしわ台', null as any, '05:19:00'),
        ]);
        const deadhead = block('deadhead', [
            makeTime('厚木', null as any, '05:15:00'),
            makeTime('かしわ台', '05:22:00', null as any),
        ]);
        const after = block('after', [
            makeTime('厚木', null as any, '05:24:00'),
            makeTime('かしわ台', '05:31:00', null as any),
        ]);
        const other = block('other', [
            makeTime('横浜', null as any, '05:18:00'),
        ]);
        expect(
            ids(
                TimetableAllLineUtil.sortTrips(stations, [
                    after,
                    other,
                    deadhead,
                    before,
                ]),
            ),
        ).toEqual(['before', 'deadhead', 'other', 'after']);
    });

    it('入力の順番によらず同じ並びを返す', () => {
        const stations = [
            makeStation('A', ['本線']),
            makeStation('B', ['本線']),
            makeStation('C', ['支線']),
        ];
        const blocks = [
            ['x', 'A', '10:00:00'],
            ['y', 'B', '10:05:00'],
            ['z', 'C', '09:50:00'],
            ['w', 'A', '10:10:00'],
        ].map(([id, station, time]) =>
            makeTripBlock(id, [
                makeTrip(id, id, [makeTime(station, null as any, time)]),
            ]),
        );
        const forward = ids(TimetableAllLineUtil.sortTrips(stations, blocks));
        const backward = ids(
            TimetableAllLineUtil.sortTrips(stations, [...blocks].reverse()),
        );
        expect(backward).toEqual(forward);
    });

    it('ブロックを重複させず、ブロック内の列車の並びは変えない', () => {
        const stations = [
            makeStation('A', ['本線']),
            makeStation('B', ['本線']),
        ];
        const through = makeTripBlock('through', [
            makeTrip('t1', 'through', [makeTime('A', null as any, '10:00:00')]),
            makeTrip('t2', 'through', [makeTime('B', null as any, '10:10:00')]),
        ]);
        const single = makeTripBlock('single', [
            makeTrip('s', 'single', [makeTime('A', null as any, '09:00:00')]),
        ]);
        const result = TimetableAllLineUtil.sortTrips(stations, [
            through,
            single,
        ]);
        expect(ids(result)).toEqual(['single', 'through']);
        expect(result[1].trips.map((t: any) => t.tripId)).toEqual(['t1', 't2']);
    });
});
