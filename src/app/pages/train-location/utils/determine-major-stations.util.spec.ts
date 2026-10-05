import { TimeDetailsDto } from 'src/app/libs/trip/usecase/dtos/time-details.dto';
import { TripBlockDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-block-details.dto';
import { TripDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-details.dto';
import { determineMajorStations } from './determine-major-stations.util';

function time(overrides: Partial<TimeDetailsDto>): TimeDetailsDto {
    return overrides as TimeDetailsDto;
}

function trip(params: {
    tripId: string;
    times: TimeDetailsDto[];
    tripClassName?: string;
}): TripDetailsDto {
    return {
        tripId: params.tripId,
        times: params.times,
        tripClass: params.tripClassName
            ? ({
                  tripClassName: params.tripClassName,
              } as TripDetailsDto['tripClass'])
            : undefined,
    } as TripDetailsDto;
}

function block(trips: TripDetailsDto[]): TripBlockDetailsDto {
    return { tripBlockId: 'b', trips } as TripBlockDetailsDto;
}

describe('determineMajorStations', () => {
    const axisStationIds = new Set(['s1', 's2', 's3']);

    it('各停以外が発着する駅を主要駅とする', () => {
        const express = trip({
            tripId: 't1',
            tripClassName: '急行',
            times: [
                time({ stationId: 's1', departureTime: '07:00:00' }),
                time({ stationId: 's2', arrivalTime: '07:10:00' }),
            ],
        });

        const result = determineMajorStations(
            [block([express])],
            axisStationIds,
        );

        expect(result.has('s1')).toBe(true);
        expect(result.has('s2')).toBe(true);
        expect(result.has('s3')).toBe(false);
    });

    it('各停のみが停車する駅は主要駅にならない', () => {
        const local = trip({
            tripId: 't1',
            tripClassName: '各停',
            times: [
                time({ stationId: 's1', departureTime: '07:00:00' }),
                time({ stationId: 's2', arrivalTime: '07:10:00' }),
            ],
        });

        const result = determineMajorStations([block([local])], axisStationIds);

        expect(result.size).toBe(0);
    });

    it('駅軸に存在しない駅は対象外', () => {
        const express = trip({
            tripId: 't1',
            tripClassName: '急行',
            times: [time({ stationId: 'other', departureTime: '07:00:00' })],
        });

        const result = determineMajorStations(
            [block([express])],
            axisStationIds,
        );

        expect(result.size).toBe(0);
    });

    it('着発時刻が両方欠落した通過駅は対象外', () => {
        const express = trip({
            tripId: 't1',
            tripClassName: '急行',
            times: [time({ stationId: 's1' })],
        });

        const result = determineMajorStations(
            [block([express])],
            axisStationIds,
        );

        expect(result.size).toBe(0);
    });

    it('tripClass が未定義の場合は各停ではない扱いにする', () => {
        const unknown = trip({
            tripId: 't1',
            times: [time({ stationId: 's1', departureTime: '07:00:00' })],
        });

        const result = determineMajorStations(
            [block([unknown])],
            axisStationIds,
        );

        expect(result.has('s1')).toBe(true);
    });

    it('着発時刻が null の通過駅は対象外（API は欠落を null で返す）', () => {
        const express = trip({
            tripId: 't1',
            tripClassName: '特急（SO）',
            times: [
                time({
                    stationId: 's1',
                    arrivalTime: null as unknown as string,
                    departureTime: null as unknown as string,
                }),
                time({ stationId: 's2', departureTime: '07:00:00' }),
            ],
        });

        const result = determineMajorStations(
            [block([express])],
            axisStationIds,
        );

        expect(result.has('s1')).toBe(false);
        expect(result.has('s2')).toBe(true);
    });

    it('系統付きの各停（各停（SO）など）は主要駅の根拠にしない', () => {
        const local = trip({
            tripId: 't1',
            tripClassName: '各停（SO→JA）',
            times: [time({ stationId: 's1', departureTime: '07:00:00' })],
        });

        const result = determineMajorStations([block([local])], axisStationIds);

        expect(result.size).toBe(0);
    });

    it('回送は主要駅の根拠にしない', () => {
        const deadhead = trip({
            tripId: 't1',
            tripClassName: '回送',
            times: [time({ stationId: 's1', departureTime: '07:00:00' })],
        });

        const result = determineMajorStations(
            [block([deadhead])],
            axisStationIds,
        );

        expect(result.size).toBe(0);
    });
});
