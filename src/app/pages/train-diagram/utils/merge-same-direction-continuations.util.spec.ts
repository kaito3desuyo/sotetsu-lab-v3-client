import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { mergeSameDirectionContinuations } from './merge-same-direction-continuations.util';

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
    tripDirection?: number;
    times: TimeDetailsDto[];
    depotIn?: boolean;
    depotOut?: boolean;
}): TripDetailsDto {
    return {
        tripId: params.tripId,
        tripNumber: params.tripId,
        tripDirection: params.tripDirection,
        depotIn: params.depotIn,
        depotOut: params.depotOut,
        times: params.times,
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

describe('mergeSameDirectionContinuations', () => {
    it('同じ運用・同じ方向で駅と時刻が続く2チェーンを1本にまとめる', () => {
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

        const merged = mergeSameDirectionContinuations([[p], [q]]);

        expect(merged).toEqual([[p, q]]);
    });

    it.each([
        ['前の列車が入庫', { depotIn: true }, {}],
        ['後の列車が出庫', {}, { depotOut: true }],
    ])(
        '%s なら、同じ運用・同じ方向・同じ駅でも1本にまとめない（入庫後に長時間たって出庫する便。9437 型）',
        (_, pFlags, qFlags) => {
            const p = trip({
                tripId: 'p',
                operationId: 'op-1',
                tripDirection: 1,
                ...pFlags,
                times: [
                    time({
                        stationId: 'Y',
                        stopSequence: 1,
                        departureTime: '09:51:00',
                    }),
                    time({
                        stationId: 'K',
                        stopSequence: 2,
                        arrivalTime: '09:57:00',
                    }),
                ],
            });
            const q = trip({
                tripId: 'q',
                operationId: 'op-1',
                tripDirection: 1,
                ...qFlags,
                times: [
                    time({
                        stationId: 'K',
                        stopSequence: 1,
                        departureTime: '22:49:00',
                    }),
                    time({
                        stationId: 'A',
                        stopSequence: 2,
                        arrivalTime: '22:55:00',
                    }),
                ],
            });

            expect(mergeSameDirectionContinuations([[p], [q]])).toEqual([
                [p],
                [q],
            ]);
        },
    );

    it('方向が違えば1本にまとめない（折り返しの可能性があるので別チェーンのまま）', () => {
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

        const merged = mergeSameDirectionContinuations([[p], [q]]);

        expect(merged).toEqual([[p], [q]]);
    });

    it('運用が違えば1本にまとめない', () => {
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
            operationId: 'op-2',
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

        const merged = mergeSameDirectionContinuations([[p], [q]]);

        expect(merged).toEqual([[p], [q]]);
    });

    it('曖昧（後続候補が2つ）なら繋がない', () => {
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
        // q1・q2 はどちらも Y 発・op-1・方向0 で p の後続候補になり得る（曖昧）。
        const q1 = trip({
            tripId: 'q1',
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
        const q2 = trip({
            tripId: 'q2',
            operationId: 'op-1',
            tripDirection: 0,
            times: [
                time({
                    stationId: 'Y',
                    stopSequence: 1,
                    departureTime: '07:20:00',
                }),
                time({
                    stationId: 'Z',
                    stopSequence: 2,
                    arrivalTime: '07:40:00',
                }),
            ],
        });

        const merged = mergeSameDirectionContinuations([[p], [q1], [q2]]);

        expect(merged).toEqual([[p], [q1], [q2]]);
    });

    it('曖昧（先行候補が2つ）なら繋がない', () => {
        // p1・p2 はどちらも Y 着・op-1・方向0 で q の先行候補になり得る（曖昧）。
        const p1 = trip({
            tripId: 'p1',
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
        const p2 = trip({
            tripId: 'p2',
            operationId: 'op-1',
            tripDirection: 0,
            times: [
                time({
                    stationId: 'W',
                    stopSequence: 1,
                    departureTime: '06:50:00',
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

        const merged = mergeSameDirectionContinuations([[p1], [p2], [q]]);

        expect(merged).toEqual([[p1], [p2], [q]]);
    });

    it('発が着より前なら繋がない', () => {
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
                    departureTime: '07:05:00', // p の着(7:10)より前
                }),
                time({
                    stationId: 'E',
                    stopSequence: 2,
                    arrivalTime: '07:30:00',
                }),
            ],
        });

        const merged = mergeSameDirectionContinuations([[p], [q]]);

        expect(merged).toEqual([[p], [q]]);
    });

    it('3チェーンが同じ運用・同じ方向で続けば1本にまとめる（多段）', () => {
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
        const r = trip({
            tripId: 'r',
            operationId: 'op-1',
            tripDirection: 0,
            times: [
                time({
                    stationId: 'E',
                    stopSequence: 1,
                    departureTime: '07:35:00',
                }),
                time({
                    stationId: 'F',
                    stopSequence: 2,
                    arrivalTime: '07:50:00',
                }),
            ],
        });

        const merged = mergeSameDirectionContinuations([[p], [q], [r]]);

        expect(merged).toEqual([[p, q, r]]);
    });

    it('運用が無いチェーンはそのまま', () => {
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

        expect(mergeSameDirectionContinuations([[p]])).toEqual([[p]]);
    });
});
