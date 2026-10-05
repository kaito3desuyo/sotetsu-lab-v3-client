import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { findTurnbacks } from './find-turnbacks.util';

function time(params: {
    stationId: string;
    stopSequence: number;
    arrivalTime?: string;
    departureTime?: string;
}): TimeDetailsDto {
    return {
        timeId: `${params.stationId}-${params.stopSequence}`,
        stationId: params.stationId,
        stopSequence: params.stopSequence,
        arrivalTime: params.arrivalTime,
        departureTime: params.departureTime,
        arrivalDays: 1,
        departureDays: 1,
    } as TimeDetailsDto;
}

function trip(params: {
    tripId: string;
    operationId?: string;
    times: TimeDetailsDto[];
    depotIn?: boolean;
    depotOut?: boolean;
    /** fix round 1: 折り返しは向きが変わることが必須。既定は 0（上り）。 */
    tripDirection?: number;
}): TripDetailsDto {
    return {
        tripId: params.tripId,
        tripNumber: params.tripId,
        times: params.times,
        depotIn: params.depotIn,
        depotOut: params.depotOut,
        tripDirection: params.tripDirection ?? 0,
        tripOperationLists: params.operationId
            ? [
                  {
                      tripOperationListId: `tol-${params.tripId}`,
                      operationId: params.operationId,
                  } as any,
              ]
            : undefined,
    } as TripDetailsDto;
}

/** テストで使う全駅（軸上=表示中）。個別テストで off-axis を試すときは別途絞った Set を渡す。 */
const ALL_STATIONS = new Set(['S', 'Y', 'E', 'Z']);

/** 単独（続きの無い）チェーンとして chainHeadOf/chainTailOf を組み立てる。 */
function soloChainMaps(trips: readonly TripDetailsDto[]): {
    chainHeadOf: Map<string, string>;
    chainTailOf: Map<string, string>;
} {
    const chainHeadOf = new Map<string, string>();
    const chainTailOf = new Map<string, string>();
    for (const t of trips) {
        if (t.tripId !== undefined) {
            chainHeadOf.set(t.tripId, t.tripId);
            chainTailOf.set(t.tripId, t.tripId);
        }
    }
    return { chainHeadOf, chainTailOf };
}

describe('findTurnbacks', () => {
    it('同じ運用・向きが変わる（上りPが横浜7:10着 → 下りQが横浜7:15発）なら1件', () => {
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            tripDirection: 0,
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            tripDirection: 1,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        const result = findTurnbacks({
            trips: [p, q],
            chainHeadOf,
            chainTailOf,
            axisStationIds: ALL_STATIONS,
        });

        expect(result).toEqual([
            { arrivingTripId: 'p', departingTripId: 'q', stationId: 'Y' },
        ]);
    });

    it('fix round 1: 向きが変わらなければ折り返しにしない（同じ運用・同じ方向の継続）', () => {
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            tripDirection: 0,
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            tripDirection: 0,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('運用が違えば0件', () => {
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-2',
            tripDirection: 1,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('終着と始発の駅が違えば0件', () => {
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            tripDirection: 1,
            times: [
                time({
                    stationId: 'Z',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('種別変更のつながり（同じ chain）は折り返しにしない', () => {
        // P → Q は種別変更で続く同じ chain（chainHeadOf/chainTailOf が両方とも P を指す）。
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const chainHeadOf = new Map([
            ['p', 'p'],
            ['q', 'p'],
        ]);
        const chainTailOf = new Map([
            ['p', 'q'],
            ['q', 'q'],
        ]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('運用の無い列車・時刻の無い列車は対象外', () => {
        const p = trip({
            tripId: 'p',
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            tripDirection: 1,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('着く側のつながりの末尾列車が入庫（depotIn）なら折り返しにしない', () => {
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            depotIn: true,
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            tripDirection: 1,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('発つ側のつながりの先頭列車が出庫（depotOut）なら折り返しにしない', () => {
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:10:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            tripDirection: 1,
            depotOut: true,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:15:00',
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });
        const { chainHeadOf, chainTailOf } = soloChainMaps([p, q]);

        expect(
            findTurnbacks({
                trips: [p, q],
                chainHeadOf,
                chainTailOf,
                axisStationIds: ALL_STATIONS,
            }),
        ).toEqual([]);
    });

    it('追加指示: 折り返す駅が軸の外（他社線内）なら作らない（他線直通の誤表示対策）', () => {
        // P（相鉄・軸上）→ Q（他社線・軸の外）が種別変更の同じ chain として続き、
        // Q の実際の終着（軸の外の駅 W）で、別の運用の折り返し相手 R が同じ駅から
        // 発つ関係になっているケース。W が軸の外なら折り返しは作らない。
        const p = trip({
            tripId: 'p',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'S',
                    stopSequence: 1,
                    departureTime: '07:00:00',
                }),
                time({
                    stationId: 'Y',
                    stopSequence: 2,
                    arrivalTime: '07:05:00',
                }),
            ],
        });
        const q = trip({
            tripId: 'q',
            operationId: 'op-1',
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:07:00',
                }),
                time({
                    stationId: 'W',
                    stopSequence: 2,
                    arrivalTime: '07:20:00',
                }),
            ],
        });
        const r = trip({
            tripId: 'r',
            operationId: 'op-1',
            tripDirection: 1,
            times: [
                time({
                    stationId: 'W',
                    stopSequence: 1,
                    departureTime: '07:25:00',
                }),
                time({
                    stationId: 'S',
                    stopSequence: 2,
                    arrivalTime: '07:40:00',
                }),
            ],
        });
        // P→Q は種別変更で続く同じ chain（先頭 p・末尾 q）。r は単独 chain。
        const chainHeadOf = new Map([
            ['p', 'p'],
            ['q', 'p'],
            ['r', 'r'],
        ]);
        const chainTailOf = new Map([
            ['p', 'q'],
            ['q', 'q'],
            ['r', 'r'],
        ]);
        // 軸（表示中）は S・Y だけ。W（他社線内）は軸の外。
        const axisStationIds = new Set(['S', 'Y']);

        expect(
            findTurnbacks({
                trips: [p, q, r],
                chainHeadOf,
                chainTailOf,
                axisStationIds,
            }),
        ).toEqual([]);
    });
});
