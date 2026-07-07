import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { formatCurrentPositionLabel } from './format-current-position-label.util';

function station(stationId: string, stationName: string): StationDetailsDto {
    return { stationId, stationName } as StationDetailsDto;
}

function tripOperationList(overrides: {
    startStationId?: string;
    endStationId?: string;
}): TripOperationListDetailsDto {
    return {
        startTime: overrides.startStationId
            ? ({ stationId: overrides.startStationId } as any)
            : undefined,
        endTime: overrides.endStationId
            ? ({ stationId: overrides.endStationId } as any)
            : undefined,
    } as TripOperationListDetailsDto;
}

const STATIONS = [
    station('yokohama', '横浜'),
    station('nishiya', '西谷'),
    station('shin-yokohama', '新横浜'),
    station('futamatagawa', '二俣川'),
    station('tsurugamine', '鶴ヶ峰'),
];

describe('formatCurrentPositionLabel', () => {
    it('position が undefined の場合は undefined を返す', () => {
        expect(formatCurrentPositionLabel(undefined, STATIONS)).toBeUndefined();
    });

    it('走行中（prevなし・currentあり・nextなし）は "始発駅 → 終着駅" を返す', () => {
        const result = formatCurrentPositionLabel(
            {
                prev: null,
                current: tripOperationList({
                    startStationId: 'yokohama',
                    endStationId: 'nishiya',
                }),
                next: null,
            },
            STATIONS,
        );

        expect(result).toBe('横浜 → 西谷');
    });

    it('間隙時間で prev.endStation === next.startStation の場合は "駅 停車中" を返す', () => {
        const result = formatCurrentPositionLabel(
            {
                prev: tripOperationList({ endStationId: 'shin-yokohama' }),
                current: null,
                next: tripOperationList({ startStationId: 'shin-yokohama' }),
            },
            STATIONS,
        );

        expect(result).toBe('新横浜 停車中');
    });

    it('間隙時間で prev.endStation !== next.startStation の場合は "prev駅 → next駅" を返す', () => {
        const result = formatCurrentPositionLabel(
            {
                prev: tripOperationList({ endStationId: 'futamatagawa' }),
                current: null,
                next: tripOperationList({ startStationId: 'tsurugamine' }),
            },
            STATIONS,
        );

        expect(result).toBe('二俣川 → 鶴ヶ峰');
    });

    it('出庫前（prevなし・currentなし・nextあり）は "駅 発車前" を返す', () => {
        const result = formatCurrentPositionLabel(
            {
                prev: null,
                current: null,
                next: tripOperationList({ startStationId: 'yokohama' }),
            },
            STATIONS,
        );

        expect(result).toBe('横浜 発車前');
    });

    it('入庫済み（prevあり・currentなし・nextなし）は "駅 到着" を返す', () => {
        const result = formatCurrentPositionLabel(
            {
                prev: tripOperationList({ endStationId: 'nishiya' }),
                current: null,
                next: null,
            },
            STATIONS,
        );

        expect(result).toBe('西谷 到着');
    });

    it('駅名が解決できない場合は空文字で埋める', () => {
        const result = formatCurrentPositionLabel(
            {
                prev: null,
                current: tripOperationList({
                    startStationId: 'unknown',
                    endStationId: 'nishiya',
                }),
                next: null,
            },
            STATIONS,
        );

        expect(result).toBe(' → 西谷');
    });
});
