import { OperationSightingTimeCrossSectionDto } from 'src/app/libs/operation-sighting/usecase/dtos/operation-sighting-time-cross-section.dto';
import { ETripDirection } from 'src/app/libs/trip/special/enums/trip.enum';
import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { buildTrainLocationCards } from './build-train-location-cards.util';

function time(overrides: Partial<TimeDetailsDto>): TimeDetailsDto {
    return overrides as TimeDetailsDto;
}

function block(trips: TripDetailsDto[]): TripBlockDetailsDto {
    return { tripBlockId: 'tb-1', trips } as TripBlockDetailsDto;
}

const STATION_NAMES = new Map<string, string>([
    ['s1', '始点'],
    ['s2', '終点'],
]);
const NO_STATIONS = new Map<string, string>();

describe('buildTrainLocationCards', () => {
    it('times を stopSequence 順に並べ、最終駅の駅名を stationNameById から行先にする', () => {
        const trip: TripDetailsDto = {
            tripId: 't1',
            tripNumber: '1234',
            tripDirection: ETripDirection.OUTBOUND,
            tripBlockId: 'tb-1',
            // 系統サフィックス付きでもカードではベース種別名になる
            tripClass: {
                tripClassName: '急行（SO）',
                tripClassColor: '#43a047',
            } as any,
            tripOperationLists: [
                { operationId: 'op-1', operation: { operationNumber: '54' } },
            ],
            times: [
                time({ stationId: 's2', stopSequence: 2 }),
                time({ stationId: 's1', stopSequence: 1 }),
            ],
        } as unknown as TripDetailsDto;

        const cards = buildTrainLocationCards(
            [block([trip])],
            {},
            false,
            'cal-1',
            STATION_NAMES,
        );

        expect(cards.get('t1')).toEqual({
            tripId: 't1',
            tripNumber: '1234',
            tripClassName: '急行',
            tripClassColor: '#43a047',
            operationNumber: '54',
            destinationName: '終点',
            direction: 'outbound',
            formationNumber: undefined,
            detailLink: [
                '/timetable',
                'all-line',
                {
                    calendar_id: 'cal-1',
                    trip_direction: String(ETripDirection.OUTBOUND),
                    trip_block_id: 'tb-1',
                },
            ],
        });
    });

    describe('行き先は所属 trip block の最終目的地', () => {
        const BLOCK_STATION_NAMES = new Map<string, string>([
            ['sA', '横浜'],
            ['sB', '二俣川'],
            ['sC', '海老名'],
        ]);

        function tripOf(
            tripId: string,
            times: TimeDetailsDto[],
        ): TripDetailsDto {
            return {
                tripId,
                tripDirection: ETripDirection.OUTBOUND,
                times,
            } as unknown as TripDetailsDto;
        }

        it('同一 block 内で時系列最後の trip の最終停車駅を全 trip のカードに使う', () => {
            // t1: sA→sB（10:00 着で終了）/ t2: sB→sC（10:30 着で終了、時系列最後）
            const t1 = tripOf('t1', [
                time({
                    stationId: 'sA',
                    stopSequence: 1,
                    departureTime: '09:40:00',
                    departureDays: 1,
                }),
                time({
                    stationId: 'sB',
                    stopSequence: 2,
                    arrivalTime: '10:00:00',
                    arrivalDays: 1,
                }),
            ]);
            const t2 = tripOf('t2', [
                time({
                    stationId: 'sB',
                    stopSequence: 1,
                    departureTime: '10:05:00',
                    departureDays: 1,
                }),
                time({
                    stationId: 'sC',
                    stopSequence: 2,
                    arrivalTime: '10:30:00',
                    arrivalDays: 1,
                }),
            ]);

            const cards = buildTrainLocationCards(
                [block([t1, t2])],
                {},
                false,
                'cal-1',
                BLOCK_STATION_NAMES,
            );

            // t1 のカードも t2 の最終停車駅（海老名）が行き先になる
            expect(cards.get('t1')?.destinationName).toBe('海老名');
            expect(cards.get('t2')?.destinationName).toBe('海老名');
        });

        it('days(1-based) を加味して比較する（day2 の 0:10 は day1 の 23:50 より後）', () => {
            const t1 = tripOf('t1', [
                time({
                    stationId: 'sB',
                    stopSequence: 1,
                    arrivalTime: '23:50:00',
                    arrivalDays: 1,
                }),
            ]);
            const t2 = tripOf('t2', [
                time({
                    stationId: 'sC',
                    stopSequence: 1,
                    arrivalTime: '00:10:00',
                    arrivalDays: 2,
                }),
            ]);

            const cards = buildTrainLocationCards(
                [block([t2, t1])],
                {},
                false,
                'cal-1',
                BLOCK_STATION_NAMES,
            );

            expect(cards.get('t1')?.destinationName).toBe('海老名');
            expect(cards.get('t2')?.destinationName).toBe('海老名');
        });

        it('block が異なれば行き先は混ざらない', () => {
            const b1 = block([
                tripOf('t1', [
                    time({
                        stationId: 'sB',
                        stopSequence: 1,
                        arrivalTime: '10:00:00',
                    }),
                ]),
            ]);
            const b2: TripBlockDetailsDto = {
                tripBlockId: 'tb-2',
                trips: [
                    tripOf('t2', [
                        time({
                            stationId: 'sC',
                            stopSequence: 1,
                            arrivalTime: '23:00:00',
                        }),
                    ]),
                ],
            } as TripBlockDetailsDto;

            const cards = buildTrainLocationCards(
                [b1, b2],
                {},
                false,
                'cal-1',
                BLOCK_STATION_NAMES,
            );

            expect(cards.get('t1')?.destinationName).toBe('二俣川');
            expect(cards.get('t2')?.destinationName).toBe('海老名');
        });
    });

    it('最終駅が stationNameById に無ければ行先は空文字にする', () => {
        const trip: TripDetailsDto = {
            tripId: 't1',
            tripDirection: ETripDirection.OUTBOUND,
            times: [time({ stationId: 'unknown', stopSequence: 1 })],
        } as unknown as TripDetailsDto;

        const cards = buildTrainLocationCards(
            [block([trip])],
            {},
            false,
            'cal-1',
            NO_STATIONS,
        );

        expect(cards.get('t1')?.destinationName).toBe('');
    });

    it('tripDirection=INBOUND(0) は inbound（上り）と判定する', () => {
        const trip: TripDetailsDto = {
            tripId: 't1',
            tripDirection: ETripDirection.INBOUND,
            times: [],
        } as TripDetailsDto;

        const cards = buildTrainLocationCards(
            [block([trip])],
            {},
            false,
            'cal-1',
            NO_STATIONS,
        );

        expect(cards.get('t1')?.direction).toBe('inbound');
    });

    function tripWithOperationNumber(operationNumber: string): TripDetailsDto {
        return {
            tripId: 't1',
            tripDirection: ETripDirection.INBOUND,
            times: [],
            tripOperationLists: [
                { operationId: 'op-1', operation: { operationNumber } },
            ],
        } as unknown as TripDetailsDto;
    }

    it('includeFormation=true かつクロスセクション取得済みなら充当編成番号を埋める', () => {
        const trip = tripWithOperationNumber('10');
        const crossSections: Record<
            string,
            OperationSightingTimeCrossSectionDto
        > = {
            '10': {
                expectedSighting: { formation: { formationNumber: '9999' } },
            } as OperationSightingTimeCrossSectionDto,
        };

        const cards = buildTrainLocationCards(
            [block([trip])],
            crossSections,
            true,
            'cal-1',
            NO_STATIONS,
        );

        expect(cards.get('t1')?.formationNumber).toBe('9999');
    });

    it('formation.agencyId が agencyNameById で解決できれば所属会社名を埋める', () => {
        const trip = tripWithOperationNumber('10');
        const crossSections: Record<
            string,
            OperationSightingTimeCrossSectionDto
        > = {
            '10': {
                expectedSighting: {
                    formation: {
                        formationNumber: '9999',
                        agencyId: 'agency-sotetsu',
                    },
                },
            } as OperationSightingTimeCrossSectionDto,
        };

        const cards = buildTrainLocationCards(
            [block([trip])],
            crossSections,
            true,
            'cal-1',
            NO_STATIONS,
            new Map([['agency-sotetsu', '相模鉄道']]),
        );

        expect(cards.get('t1')?.formationAgencyName).toBe('相模鉄道');
    });

    it('agencyNameById で解決できない agencyId の場合、所属会社名は undefined のまま', () => {
        const trip = tripWithOperationNumber('10');
        const crossSections: Record<
            string,
            OperationSightingTimeCrossSectionDto
        > = {
            '10': {
                expectedSighting: {
                    formation: {
                        formationNumber: '9999',
                        agencyId: 'agency-unknown',
                    },
                },
            } as OperationSightingTimeCrossSectionDto,
        };

        const cards = buildTrainLocationCards(
            [block([trip])],
            crossSections,
            true,
            'cal-1',
            NO_STATIONS,
            new Map(),
        );

        expect(cards.get('t1')?.formationNumber).toBe('9999');
        expect(cards.get('t1')?.formationAgencyName).toBeUndefined();
    });

    it('includeFormation=false の場合は取得済みでも編成番号を埋めない（今日有効ダイヤ以外は非表示）', () => {
        const trip = tripWithOperationNumber('10');
        const crossSections: Record<
            string,
            OperationSightingTimeCrossSectionDto
        > = {
            '10': {
                expectedSighting: { formation: { formationNumber: '9999' } },
            } as OperationSightingTimeCrossSectionDto,
        };

        const cards = buildTrainLocationCards(
            [block([trip])],
            crossSections,
            false,
            'cal-1',
            NO_STATIONS,
        );

        expect(cards.get('t1')?.formationNumber).toBeUndefined();
    });

    it('tripId が未定義の trip は結果に含めない', () => {
        const trip: TripDetailsDto = { times: [] } as TripDetailsDto;

        const cards = buildTrainLocationCards(
            [block([trip])],
            {},
            false,
            'cal-1',
            NO_STATIONS,
        );

        expect(cards.size).toBe(0);
    });
});
