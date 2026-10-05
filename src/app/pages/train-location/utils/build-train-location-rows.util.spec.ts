import { RouteStationDto } from 'src/app/libs/route/usecase/dtos/route-stations.dto';
import { TrainPosition } from 'src/app/shared/train-position.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import { buildTrainLocationRows } from './build-train-location-rows.util';

function station(stationId: string, stationName: string): RouteStationDto {
    return { stationId, stationName } as RouteStationDto;
}

function card(overrides: Partial<TrainLocationCard> & { tripId: string }): TrainLocationCard {
    return {
        tripNumber: '',
        tripClassName: '',
        tripClassColor: '#8a8a8a',
        destinationName: '',
        direction: 'inbound',
        detailLink: ['/timetable', 'all-line', {}],
        ...overrides,
    };
}

// 駅軸: A(index0) - B(index1) - C(index2)（stationSequence 昇順）
const STATIONS = [station('A', '駅A'), station('B', '駅B'), station('C', '駅C')];

describe('buildTrainLocationRows', () => {
    it('駅行と駅間行が交互に並ぶ（先頭・末尾は駅行）', () => {
        const rows = buildTrainLocationRows(STATIONS, [], new Map(), new Set());

        expect(rows.map((r) => r.kind)).toEqual([
            'station',
            'between',
            'station',
            'between',
            'station',
        ]);
    });

    it('停車中カードは方向により左右の駅行に振り分ける', () => {
        const cardsById = new Map([
            ['t-in', card({ tripId: 't-in', direction: 'inbound' })],
            ['t-out', card({ tripId: 't-out', direction: 'outbound' })],
        ]);
        const positions: TrainPosition[] = [
            { type: 'stopped', tripId: 't-in', stationId: 'B' },
            { type: 'stopped', tripId: 't-out', stationId: 'B' },
        ];

        const rows = buildTrainLocationRows(STATIONS, positions, cardsById, new Set());

        const stationB = rows.find((r) => r.kind === 'station' && r.stationId === 'B');
        expect(stationB?.kind).toBe('station');
        if (stationB?.kind === 'station') {
            expect(stationB.leftCards.map((c) => c.tripId)).toEqual(['t-in']);
            expect(stationB.rightCards.map((c) => c.tripId)).toEqual(['t-out']);
        }
    });

    it('同一駅に複数停車 → 集約対象の配列に全件積む（省略しない）', () => {
        const cardsById = new Map([
            ['t1', card({ tripId: 't1', direction: 'inbound' })],
            ['t2', card({ tripId: 't2', direction: 'inbound' })],
        ]);
        const positions: TrainPosition[] = [
            { type: 'stopped', tripId: 't1', stationId: 'A' },
            { type: 'stopped', tripId: 't2', stationId: 'A' },
        ];

        const rows = buildTrainLocationRows(STATIONS, positions, cardsById, new Set());

        const stationA = rows.find((r) => r.kind === 'station' && r.stationId === 'A');
        expect(stationA?.kind === 'station' && stationA.leftCards.length).toBe(2);
    });

    it('駅軸昇順に走行する trip の between progress はそのまま topProgress になる', () => {
        const cardsById = new Map([
            ['t-out', card({ tripId: 't-out', direction: 'outbound' })],
        ]);
        const positions: TrainPosition[] = [
            {
                type: 'between',
                tripId: 't-out',
                fromStationId: 'A',
                toStationId: 'B',
                progress: 0.3,
            },
        ];

        const rows = buildTrainLocationRows(STATIONS, positions, cardsById, new Set());

        const between = rows.find(
            (r) => r.kind === 'between' && r.fromStationId === 'A' && r.toStationId === 'B',
        );
        expect(between?.kind === 'between' && between.rightCards).toEqual([
            { card: cardsById.get('t-out'), topProgress: 0.3 },
        ]);
    });

    it('駅軸降順に走行する trip（上り）の between progress は 1-progress に反転する', () => {
        const cardsById = new Map([
            ['t-in', card({ tripId: 't-in', direction: 'inbound' })],
        ]);
        // 上り: B → A へ走行中（trip 自身の発駅は B、次駅は A。駅軸昇順とは逆順）
        const positions: TrainPosition[] = [
            {
                type: 'between',
                tripId: 't-in',
                fromStationId: 'B',
                toStationId: 'A',
                progress: 0.25,
            },
        ];

        const rows = buildTrainLocationRows(STATIONS, positions, cardsById, new Set());

        const between = rows.find(
            (r) => r.kind === 'between' && r.fromStationId === 'A' && r.toStationId === 'B',
        );
        expect(between?.kind === 'between' && between.leftCards).toEqual([
            { card: cardsById.get('t-in'), topProgress: 0.75 },
        ]);
    });

    describe('非隣接 between（通過駅がある優等列車）', () => {
        // 駅軸: s0..s6 の 7 駅。優等列車は停車駅間（例: index 2 → 6）が駅軸上で隣接しない
        const EXPRESS_STATIONS = [
            station('s0', '駅0'),
            station('s1', '駅1'),
            station('s2', '駅2'),
            station('s3', '駅3'),
            station('s4', '駅4'),
            station('s5', '駅5'),
            station('s6', '駅6'),
        ];

        function betweenRowsOf(rows: ReturnType<typeof buildTrainLocationRows>) {
            return rows.filter((r) => r.kind === 'between');
        }

        it('駅index 2→6, progress 0.5 は駅index 4 付近の区間に描画対象として配置される', () => {
            const cardsById = new Map([
                ['t-exp', card({ tripId: 't-exp', direction: 'outbound' })],
            ]);
            const positions: TrainPosition[] = [
                {
                    type: 'between',
                    tripId: 't-exp',
                    fromStationId: 's2',
                    toStationId: 's6',
                    progress: 0.5,
                },
            ];

            const rows = buildTrainLocationRows(
                EXPRESS_STATIONS,
                positions,
                cardsById,
                new Set(),
            );

            // 軸位置 = 2 + (6-2)*0.5 = 4.0 → 区間 s4→s5 の先頭（駅4 の位置）
            const between = betweenRowsOf(rows);
            const target = between.find(
                (r) => r.kind === 'between' && r.fromStationId === 's4',
            );
            expect(target?.kind === 'between' && target.rightCards).toEqual([
                { card: cardsById.get('t-exp'), topProgress: 0 },
            ]);
            // 他の区間には積まれない（描画から欠落しない・二重配置しない）
            const totalPlaced = between.reduce(
                (sum, r) =>
                    r.kind === 'between'
                        ? sum + r.leftCards.length + r.rightCards.length
                        : sum,
                0,
            );
            expect(totalPlaced).toBe(1);
        });

        it('駅index 2→6, progress 0.4 は区間 s3→s4 の topProgress 0.6 に配置される', () => {
            const cardsById = new Map([
                ['t-exp', card({ tripId: 't-exp', direction: 'outbound' })],
            ]);
            const positions: TrainPosition[] = [
                {
                    type: 'between',
                    tripId: 't-exp',
                    fromStationId: 's2',
                    toStationId: 's6',
                    progress: 0.4,
                },
            ];

            const rows = buildTrainLocationRows(
                EXPRESS_STATIONS,
                positions,
                cardsById,
                new Set(),
            );

            // 軸位置 = 2 + 4*0.4 = 3.6 → 区間 s3→s4, topProgress 0.6
            const target = betweenRowsOf(rows).find(
                (r) => r.kind === 'between' && r.fromStationId === 's3',
            );
            expect(target?.kind === 'between' && target.rightCards.length).toBe(1);
            const entry =
                target?.kind === 'between' ? target.rightCards[0] : undefined;
            expect(entry?.topProgress).toBeCloseTo(0.6, 10);
        });

        it('駅軸降順の非隣接 between（上り優等 6→2, progress 0.375）も正しい区間に配置される', () => {
            const cardsById = new Map([
                ['t-exp-in', card({ tripId: 't-exp-in', direction: 'inbound' })],
            ]);
            const positions: TrainPosition[] = [
                {
                    type: 'between',
                    tripId: 't-exp-in',
                    fromStationId: 's6',
                    toStationId: 's2',
                    progress: 0.375,
                },
            ];

            const rows = buildTrainLocationRows(
                EXPRESS_STATIONS,
                positions,
                cardsById,
                new Set(),
            );

            // 軸位置 = 6 + (2-6)*0.375 = 4.5 → 区間 s4→s5, topProgress 0.5
            const target = betweenRowsOf(rows).find(
                (r) => r.kind === 'between' && r.fromStationId === 's4',
            );
            expect(target?.kind === 'between' && target.leftCards.length).toBe(1);
            const entry =
                target?.kind === 'between' ? target.leftCards[0] : undefined;
            expect(entry?.topProgress).toBeCloseTo(0.5, 10);
        });

        it('駅軸に存在しない駅を参照する between は無視する（防御的）', () => {
            const cardsById = new Map([
                ['t-x', card({ tripId: 't-x', direction: 'outbound' })],
            ]);
            const positions: TrainPosition[] = [
                {
                    type: 'between',
                    tripId: 't-x',
                    fromStationId: 'not-on-axis',
                    toStationId: 's3',
                    progress: 0.5,
                },
            ];

            const rows = buildTrainLocationRows(
                EXPRESS_STATIONS,
                positions,
                cardsById,
                new Set(),
            );

            const totalPlaced = betweenRowsOf(rows).reduce(
                (sum, r) =>
                    r.kind === 'between'
                        ? sum + r.leftCards.length + r.rightCards.length
                        : sum,
                0,
            );
            expect(totalPlaced).toBe(0);
        });
    });

    it('majorStationIds に含まれる駅は isMajor=true になる', () => {
        const rows = buildTrainLocationRows(STATIONS, [], new Map(), new Set(['B']));

        const stationB = rows.find((r) => r.kind === 'station' && r.stationId === 'B');
        expect(stationB?.kind === 'station' && stationB.isMajor).toBe(true);
        const stationA = rows.find((r) => r.kind === 'station' && r.stationId === 'A');
        expect(stationA?.kind === 'station' && stationA.isMajor).toBe(false);
    });

    it('cardsById に存在しない tripId の位置は無視する（防御的）', () => {
        const positions: TrainPosition[] = [
            { type: 'stopped', tripId: 'unknown', stationId: 'A' },
        ];

        const rows = buildTrainLocationRows(STATIONS, positions, new Map(), new Set());

        const stationA = rows.find((r) => r.kind === 'station' && r.stationId === 'A');
        expect(stationA?.kind === 'station' && stationA.leftCards.length).toBe(0);
        expect(stationA?.kind === 'station' && stationA.rightCards.length).toBe(0);
    });

    it('interchangeRoutesByStationId に登録された駅は乗換路線を持つ', () => {
        const interchangeRoutesByStationId = new Map([
            ['B', [{ routeId: 'r-izumino', routeName: 'いずみ野線' }]],
        ]);

        const rows = buildTrainLocationRows(
            STATIONS,
            [],
            new Map(),
            new Set(),
            interchangeRoutesByStationId,
        );

        const stationA = rows.find((r) => r.kind === 'station' && r.stationId === 'A');
        const stationB = rows.find((r) => r.kind === 'station' && r.stationId === 'B');
        expect(stationA?.kind === 'station' && stationA.interchangeRoutes).toEqual([]);
        expect(stationB?.kind === 'station' && stationB.interchangeRoutes).toEqual([
            { routeId: 'r-izumino', routeName: 'いずみ野線' },
        ]);
    });

    it('interchangeRoutesByStationId 未指定の場合は全駅で空配列になる', () => {
        const rows = buildTrainLocationRows(STATIONS, [], new Map(), new Set());

        const stationA = rows.find((r) => r.kind === 'station' && r.stationId === 'A');
        expect(stationA?.kind === 'station' && stationA.interchangeRoutes).toEqual([]);
    });
});
