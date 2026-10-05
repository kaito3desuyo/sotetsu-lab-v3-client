import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { reconnectTripOperationLists } from './operation-route-diagram-reconnect-trip-operation-lists.util';

function makeStation(stationId: string): any {
    return { stationId, stationName: stationId };
}

function makeTrip(
    tripOperationListId: string,
    startStationId: string,
    endStationId: string,
): any {
    return {
        tripOperationListId,
        startTime: {
            stationId: startStationId,
            departureTime: '10:00:00',
        },
        endTime: {
            stationId: endStationId,
            arrivalTime: '10:30:00',
        },
    };
}

describe('reconnectTripOperationLists', () => {
    const allStations: StationDetailsDto[] = [
        '海老名',
        'かしわ台',
        '相模大塚',
        '大和',
        '瀬谷',
        '二俣川',
        '西谷',
        '横浜',
    ].map(makeStation);

    it('始発/終着とも表示中の駅なら stationId を変更しない', () => {
        const visibleStations = allStations;
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '海老名', '横浜'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].startTime.stationId).toBe('海老名');
        expect(result[0].endTime.stationId).toBe('横浜');
    });

    it('終着駅が路線チップ OFF で非表示のとき、全駅順で最も近い表示中の駅へ再接続する', () => {
        // 横浜が非表示（例: いずみ野線 OFF で本線側のみ表示のケースを簡略化）
        const visibleStations = allStations.filter(
            (s) => s.stationName !== '横浜',
        );
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '海老名', '横浜'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        // 横浜の直前で表示中なのは西谷
        expect(result[0].startTime.stationId).toBe('海老名');
        expect(result[0].endTime.stationId).toBe('西谷');
    });

    it('始発駅が非表示のとき、全駅順で最も近い表示中の駅へ再接続する', () => {
        const visibleStations = allStations.filter(
            (s) => s.stationName !== '二俣川',
        );
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '二俣川', '横浜'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        // 二俣川の直前で表示中なのは瀬谷
        expect(result[0].startTime.stationId).toBe('瀬谷');
        expect(result[0].endTime.stationId).toBe('横浜');
    });

    it('全駅順に存在しない駅（データ不整合）は変更せずそのまま返す', () => {
        const visibleStations = allStations;
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '存在しない駅', '横浜'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].startTime.stationId).toBe('存在しない駅');
    });

    it('時刻・列車番号など stationId 以外のフィールドは変更しない', () => {
        const visibleStations = allStations.filter(
            (s) => s.stationName !== '横浜',
        );
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '海老名', '横浜'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].tripOperationListId).toBe('t1');
        expect(result[0].startTime.departureTime).toBe('10:00:00');
        expect(result[0].endTime.arrivalTime).toBe('10:30:00');
    });

    it('全 ON（visibleStations が allStations と一致）に戻すと再接続されない', () => {
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '海老名', '横浜'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            allStations,
        );

        expect(result[0].startTime.stationId).toBe('海老名');
        expect(result[0].endTime.stationId).toBe('横浜');
    });
});
