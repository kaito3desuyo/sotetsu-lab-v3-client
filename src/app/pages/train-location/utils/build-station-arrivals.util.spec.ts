import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { TrainPosition } from 'src/app/shared/train-position.util';
import { TrainLocationCard } from '../interfaces/train-location-card.interface';
import { buildStationArrivals } from './build-station-arrivals.util';

const NULL = null as unknown as string;

function time(o: Partial<TimeDetailsDto>): TimeDetailsDto {
    return { arrivalTime: NULL, departureTime: NULL, ...o } as TimeDetailsDto;
}

function trip(
    tripId: string,
    direction: 0 | 1,
    times: TimeDetailsDto[],
    className = '各停（SO）',
): TripDetailsDto {
    return {
        tripId,
        tripNumber: `N${tripId}`,
        tripDirection: direction,
        tripClass: { tripClassName: className, tripClassColor: '#111111' },
        times,
    } as unknown as TripDetailsDto;
}

function blocks(...trips: TripDetailsDto[]): TripBlockDetailsDto[] {
    return trips.map(
        (t) =>
            ({
                tripBlockId: `b${t.tripId}`,
                trips: [t],
            }) as TripBlockDetailsDto,
    );
}

const NAMES = new Map([
    ['A', '横浜'],
    ['B', '星川'],
    ['C', '二俣川'],
    ['D', '海老名'],
    ['E', '湘南台'],
    ['F', 'いずみ野'],
]);

/** 駅 → その駅を含む路線名（E・F はいずみ野線だけ、C は本線といずみ野線） */
const ROUTE_NAMES = new Map<string, string[]>([
    ['A', ['本線']],
    ['B', ['本線']],
    ['C', ['本線', 'いずみ野線']],
    ['D', ['本線']],
    ['E', ['いずみ野線']],
    ['F', ['いずみ野線']],
]);

function run(
    tripBlocks: TripBlockDetailsDto[],
    at: Date,
    options: {
        stationId?: string;
        positions?: TrainPosition[];
        cards?: Map<string, TrainLocationCard>;
        limit?: number;
    } = {},
) {
    return buildStationArrivals({
        tripBlocks,
        stationId: options.stationId ?? 'C',
        at,
        positions: options.positions ?? [],
        cardsById: options.cards ?? new Map(),
        stationNameById: NAMES,
        routeNamesByStationId: ROUTE_NAMES,
        limit: options.limit ?? 6,
    });
}

// 2026-09-26 10:00（営業日当日）
const AT = new Date(2026, 8, 26, 10, 0, 0);

describe('buildStationArrivals', () => {
    it('停車する列車は着時刻（無ければ発時刻）で、あと何分を出す', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 3,
                arrivalTime: '10:04:00',
                departureTime: '10:05:00',
            }),
            time({ stationId: 'D', stopSequence: 4, arrivalTime: '10:20:00' }),
        ]);

        const result = run(blocks(t), AT);

        expect(result.outbound).toHaveLength(1);
        expect(result.outbound[0].minutesUntil).toBe(4);
        expect(result.outbound[0].isPassing).toBe(false);
        expect(result.outbound[0].isTerminal).toBe(false);
        expect(result.inbound).toHaveLength(0);
    });

    it('通過する列車は前後の停車駅の時刻を停車順の比で按分し isPassing にする', () => {
        const t = trip(
            '1',
            1,
            [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '10:00:00',
                }),
                time({ stationId: 'B', stopSequence: 2 }),
                time({ stationId: 'C', stopSequence: 3 }),
                time({
                    stationId: 'D',
                    stopSequence: 4,
                    arrivalTime: '10:30:00',
                }),
            ],
            '特急（SO）',
        );

        const [row] = run(blocks(t), AT).outbound;

        expect(row.isPassing).toBe(true);
        // 10:00 + 30 分 × (3-1)/(4-1) = 10:20
        expect(row.minutesUntil).toBe(20);
    });

    it('選んだ駅が終点なら isTerminal', () => {
        const t = trip('1', 0, [
            time({
                stationId: 'D',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({ stationId: 'C', stopSequence: 2, arrivalTime: '10:10:00' }),
        ]);

        const [row] = run(blocks(t), AT).inbound;

        expect(row.isTerminal).toBe(true);
    });

    it('同じ運用で種別・列番が変わる駅では当駅止まりにせず変更後の種別・列番を持たせ、次の列番の行は出さない', () => {
        const local = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:04:00' }),
        ]);
        const rapid = trip(
            '2',
            1,
            [
                time({
                    stationId: 'C',
                    stopSequence: 1,
                    departureTime: '10:06:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '10:20:00',
                }),
            ],
            '快速（SO）',
        );
        const sameBlock = [
            { tripBlockId: 'b', trips: [local, rapid] } as TripBlockDetailsDto,
        ];

        const rows = run(sameBlock, AT).outbound;

        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            tripId: '1',
            isTerminal: false,
            continuation: {
                tripNumber: 'N2',
                tripClassName: '快速',
                tripClassColor: '#111111',
            },
            minutesUntil: 4,
        });
    });

    it('種別が変わる駅より手前の駅を選んでいるときは、変更前の情報だけ（continuation なし）', () => {
        const local = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 2,
                arrivalTime: '10:04:00',
                departureTime: '10:05:00',
            }),
            time({ stationId: 'D', stopSequence: 3, arrivalTime: '10:20:00' }),
        ]);
        const rapid = trip(
            '2',
            1,
            [
                time({
                    stationId: 'D',
                    stopSequence: 1,
                    departureTime: '10:22:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '10:40:00',
                }),
            ],
            '快速（SO）',
        );
        const sameBlock = [
            { tripBlockId: 'b', trips: [local, rapid] } as TripBlockDetailsDto,
        ];

        const [row] = run(sameBlock, AT, { stationId: 'C' }).outbound;

        expect(row).toMatchObject({
            tripId: '1',
            tripNumber: 'N1',
            tripClassName: '各停',
        });
        expect(row.continuation).toBeUndefined();
    });

    it('種別変更の駅に着いたあとも、次の列番で発つまでは停車中', () => {
        const local = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:40:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '09:58:00' }),
        ]);
        const rapid = trip(
            '2',
            1,
            [
                time({
                    stationId: 'C',
                    stopSequence: 1,
                    departureTime: '10:02:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '10:20:00',
                }),
            ],
            '快速（SO）',
        );
        const sameBlock = [
            { tripBlockId: 'b', trips: [local, rapid] } as TripBlockDetailsDto,
        ];

        const [row] = run(sameBlock, AT).outbound;

        expect(row).toMatchObject({
            tripId: '1',
            isStopped: true,
            whereText: 'いま 二俣川に停車中',
        });
    });

    it('列番だけ変わって種別が同じでも変更後の列番を持たせる（当駅止まりでもない）', () => {
        const a = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:04:00' }),
        ]);
        const b = trip(
            '2',
            1,
            [
                time({
                    stationId: 'C',
                    stopSequence: 1,
                    departureTime: '10:05:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '10:20:00',
                }),
            ],
            '各停（SO→TY）',
        );
        const sameBlock = [
            { tripBlockId: 'b', trips: [a, b] } as TripBlockDetailsDto,
        ];

        const [row] = run(sameBlock, AT).outbound;

        expect(row.isTerminal).toBe(false);
        expect(row.continuation).toMatchObject({
            tripNumber: 'N2',
            tripClassName: '各停',
        });
    });

    it('会社で呼び方が違う種別（各停 → 各駅停車）もそのまま変更後の種別として持たせる', () => {
        const a = trip(
            '1',
            1,
            [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '09:50:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 3,
                    arrivalTime: '10:04:00',
                }),
            ],
            '各停（SO→JA）',
        );
        const b = trip(
            '2',
            1,
            [
                time({
                    stationId: 'C',
                    stopSequence: 1,
                    departureTime: '10:05:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '10:20:00',
                }),
            ],
            '各駅停車（JA）',
        );
        const sameBlock = [
            { tripBlockId: 'b', trips: [a, b] } as TripBlockDetailsDto,
        ];

        const [row] = run(sameBlock, AT).outbound;

        expect(row.isTerminal).toBe(false);
        expect(row.continuation).toMatchObject({
            tripNumber: 'N2',
            tripClassName: '各駅停車',
        });
    });

    it('選んだ駅が始発の列車は isOrigin（途中の駅・終点では false）', () => {
        const fromHere = trip('1', 1, [
            time({
                stationId: 'C',
                stopSequence: 1,
                departureTime: '10:05:00',
            }),
            time({ stationId: 'D', stopSequence: 2, arrivalTime: '10:20:00' }),
        ]);
        const through = trip('2', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 2,
                arrivalTime: '10:06:00',
                departureTime: '10:07:00',
            }),
            time({ stationId: 'D', stopSequence: 3, arrivalTime: '10:20:00' }),
        ]);

        const rows = run(blocks(fromHere, through), AT).outbound;

        expect(rows.find((r) => r.tripId === '1')?.isOrigin).toBe(true);
        expect(rows.find((r) => r.tripId === '2')?.isOrigin).toBe(false);
    });

    it('着時刻と発時刻が両方あって違えば departureTime を持たせる（片方だけ・同じなら持たせない）', () => {
        const stops = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 2,
                arrivalTime: '10:04:00',
                departureTime: '10:06:00',
            }),
            time({ stationId: 'D', stopSequence: 3, arrivalTime: '10:20:00' }),
        ]);
        const sameTime = trip('2', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:55:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 2,
                arrivalTime: '10:08:00',
                departureTime: '10:08:00',
            }),
            time({ stationId: 'D', stopSequence: 3, arrivalTime: '10:20:00' }),
        ]);
        const origin = trip('3', 1, [
            time({
                stationId: 'C',
                stopSequence: 1,
                departureTime: '10:10:00',
            }),
            time({ stationId: 'D', stopSequence: 2, arrivalTime: '10:25:00' }),
        ]);

        const rows = run(blocks(stops, sameTime, origin), AT).outbound;
        const byId = (id: string) => rows.find((r) => r.tripId === id);

        expect(byId('1')?.departureTime).toEqual(
            new Date(2026, 8, 26, 10, 6, 0),
        );
        expect(byId('2')?.departureTime).toBeUndefined();
        expect(byId('3')?.departureTime).toBeUndefined();
    });

    it('種別が変わる駅では、発時刻は次の列番の発時刻', () => {
        const local = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:04:00' }),
        ]);
        const rapid = trip(
            '2',
            1,
            [
                time({
                    stationId: 'C',
                    stopSequence: 1,
                    departureTime: '10:07:00',
                }),
                time({
                    stationId: 'D',
                    stopSequence: 2,
                    arrivalTime: '10:20:00',
                }),
            ],
            '快速（SO）',
        );

        const [row] = run(
            [
                {
                    tripBlockId: 'b',
                    trips: [local, rapid],
                } as TripBlockDetailsDto,
            ],
            AT,
        ).outbound;

        expect(row.departureTime).toEqual(new Date(2026, 8, 26, 10, 7, 0));
    });

    it('いま停車中（着 <= at < 発）の列車は isStopped で 0 分', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:40:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 3,
                arrivalTime: '09:59:00',
                departureTime: '10:01:00',
            }),
            time({ stationId: 'D', stopSequence: 4, arrivalTime: '10:20:00' }),
        ]);

        const [row] = run(blocks(t), AT).outbound;

        expect(row.isStopped).toBe(true);
        expect(row.minutesUntil).toBe(0);
    });

    it('もう出た列車は出さない', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:40:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 3,
                arrivalTime: '09:55:00',
                departureTime: '09:56:00',
            }),
        ]);

        expect(run(blocks(t), AT).outbound).toHaveLength(0);
    });

    it('24 時を越える列車（days = 2）は翌日の時刻として扱う', () => {
        const late = new Date(2026, 8, 27, 0, 10, 0); // 営業日 9/26 の 24:10
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureDays: 2,
                departureTime: '00:05:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 3,
                arrivalDays: 2,
                arrivalTime: '00:25:00',
            }),
        ]);

        const [row] = run(blocks(t), late).outbound;

        expect(row.minutesUntil).toBe(15);
    });

    it('時刻の早い順に方向ごと limit 本まで', () => {
        const make = (id: string, hhmm: string) =>
            trip(id, 1, [
                time({
                    stationId: 'A',
                    stopSequence: 1,
                    departureTime: '09:59:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 3,
                    arrivalTime: `${hhmm}:00`,
                }),
                time({
                    stationId: 'D',
                    stopSequence: 4,
                    arrivalTime: '11:30:00',
                }),
            ]);

        const result = run(
            blocks(make('3', '10:30'), make('1', '10:10'), make('2', '10:20')),
            AT,
            { limit: 2 },
        );

        expect(result.outbound.map((r) => r.tripId)).toEqual(['1', '2']);
    });

    it('いまどこか: 在線中は位置、まだ出ていない列車は始発駅と発時刻', () => {
        const running = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:55:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:10:00' }),
        ]);
        const waiting = trip('2', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '10:02:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:20:00' }),
        ]);
        const positions: TrainPosition[] = [
            {
                type: 'between',
                tripId: '1',
                fromStationId: 'A',
                toStationId: 'B',
                progress: 0.5,
            },
        ];

        const result = run(blocks(running, waiting), AT, { positions });

        expect(result.outbound[0].whereText).toBe('いま 横浜→星川');
        expect(result.outbound[1].whereText).toBe('横浜 10:02 発');
    });

    it('いまどこか: 図の外（他線）を走っている列車は「いま ○○線内」', () => {
        // 湘南台 09:50 発 → いずみ野 09:55 着 09:56 発 → 二俣川 10:10 着。10:00 はいずみ野→二俣川の間
        const t = trip('1', 0, [
            time({
                stationId: 'E',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'F',
                stopSequence: 2,
                arrivalTime: '09:55:00',
                departureTime: '09:56:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:10:00' }),
        ]);

        const [row] = run(blocks(t), AT, { positions: [] }).inbound;

        expect(row.whereText).toBe('いま いずみ野線内');
    });

    it('いまどこか: 図の外の駅に停車中でも「いま ○○線内」', () => {
        const t = trip('1', 0, [
            time({
                stationId: 'E',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'F',
                stopSequence: 2,
                arrivalTime: '09:58:00',
                departureTime: '10:02:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:10:00' }),
        ]);

        const [row] = run(blocks(t), AT, { positions: [] }).inbound;

        expect(row.whereText).toBe('いま いずみ野線内');
    });

    it('いまどこか: 路線が分からない他線区間は「いま 他線内」', () => {
        const t = trip('1', 0, [
            time({
                stationId: 'X',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'Y',
                stopSequence: 2,
                arrivalTime: '10:05:00',
                departureTime: '10:06:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:10:00' }),
        ]);

        const [row] = run(blocks(t), AT, { positions: [] }).inbound;

        expect(row.whereText).toBe('いま 他線内');
    });

    it('いまどこか: 停車中の位置は「に停車中」', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:50:00',
            }),
            time({
                stationId: 'B',
                stopSequence: 2,
                arrivalTime: '09:59:00',
                departureTime: '10:01:00',
            }),
            time({ stationId: 'C', stopSequence: 3, arrivalTime: '10:08:00' }),
        ]);
        const positions: TrainPosition[] = [
            { type: 'stopped', tripId: '1', stationId: 'B' },
        ];

        const [row] = run(blocks(t), AT, { positions }).outbound;

        expect(row.whereText).toBe('いま 星川に停車中');
    });

    it('いまどこか: 折返しの位置は「で折返し」', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'B',
                stopSequence: 1,
                departureTime: '10:01:00',
            }),
            time({ stationId: 'C', stopSequence: 2, arrivalTime: '10:08:00' }),
        ]);
        const positions: TrainPosition[] = [
            { type: 'stopped', tripId: '1', stationId: 'B', turnaround: true },
        ];

        const [row] = run(blocks(t), AT, { positions }).outbound;

        expect(row.whereText).toBe('いま 星川で折返し');
    });

    it('行先・運用・種別はカードから引き、無ければ trip から組み立てる', () => {
        const t = trip(
            '1',
            0,
            [
                time({
                    stationId: 'D',
                    stopSequence: 1,
                    departureTime: '09:55:00',
                }),
                time({
                    stationId: 'C',
                    stopSequence: 2,
                    arrivalTime: '10:05:00',
                }),
                time({
                    stationId: 'A',
                    stopSequence: 4,
                    arrivalTime: '10:30:00',
                }),
            ],
            '快速（SO）',
        );
        const card: TrainLocationCard = {
            tripId: '1',
            tripNumber: '2026',
            tripClassName: '快速',
            tripClassColor: '#3f51b5',
            operationNumber: '62',
            operationId: 'op-62',
            formationNumber: '20104',
            formationAgencyName: '相鉄',
            destinationName: '横浜',
            direction: 'inbound',
            detailLink: ['/timetable', 'all-line', {}],
        };

        const withCard = run(blocks(t), AT, { cards: new Map([['1', card]]) })
            .inbound[0];
        const withoutCard = run(blocks(t), AT).inbound[0];

        expect(withCard).toMatchObject({
            operationId: 'op-62',
            tripNumber: '2026',
            tripClassName: '快速',
            destinationName: '横浜',
            operationNumber: '62',
            formationNumber: '20104',
            formationAgencyName: '相鉄',
        });
        expect(withoutCard).toMatchObject({
            tripNumber: 'N1',
            tripClassName: '快速',
            destinationName: '横浜',
        });
        expect(withoutCard.formationNumber).toBeUndefined();
    });

    it('選んだ駅に停車中なら positions に無くても「いま ○○に停車中」', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '09:40:00',
            }),
            time({
                stationId: 'C',
                stopSequence: 3,
                arrivalTime: '09:59:00',
                departureTime: '10:01:00',
            }),
        ]);

        const [row] = run(blocks(t), AT, { positions: [] }).outbound;

        expect(row.isStopped).toBe(true);
        expect(row.whereText).toBe('いま 二俣川に停車中');
    });

    it('選んだ駅を通らない列車・該当 0 本は空配列', () => {
        const t = trip('1', 1, [
            time({
                stationId: 'A',
                stopSequence: 1,
                departureTime: '10:10:00',
            }),
            time({ stationId: 'B', stopSequence: 2, arrivalTime: '10:20:00' }),
        ]);

        expect(run(blocks(t), AT)).toEqual({ inbound: [], outbound: [] });
    });
});
