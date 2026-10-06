import { StationDetailsDto } from 'src/app/libs/station/usecase/dtos/station-details.dto';
import { TripOperationListDetailsDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import {
    isRouteDiagramOutsideStationId,
    reconnectTripOperationLists,
    routeDiagramOutsideBetweenId,
    ROUTE_DIAGRAM_OUTSIDE_LEFT_ID,
    ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID,
    withOutsideStationColumns,
} from './operation-route-diagram-reconnect-trip-operation-lists.util';

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

    it('表示中の末尾より後の駅は、右端の「図外」の列へ付け替えて本当の駅名を持たせる', () => {
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

        expect(result[0].startTime.stationId).toBe('海老名');
        expect(result[0].startHiddenStationName).toBeUndefined();
        expect(result[0].endTime.stationId).toBe(
            ROUTE_DIAGRAM_OUTSIDE_RIGHT_ID,
        );
        expect(result[0].endHiddenStationName).toBe('横浜');
    });

    it('表示中の先頭より前の駅は、左端の「図外」の列へ付け替える', () => {
        const visibleStations = allStations.slice(2);
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '海老名', 'かしわ台'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].startTime.stationId).toBe(
            ROUTE_DIAGRAM_OUTSIDE_LEFT_ID,
        );
        expect(result[0].startHiddenStationName).toBe('海老名');
        expect(result[0].endTime.stationId).toBe(ROUTE_DIAGRAM_OUTSIDE_LEFT_ID);
        expect(result[0].endHiddenStationName).toBe('かしわ台');
    });

    it('表示中の駅の間の隠れた駅は、近い表示駅でなく、その位置の「図外」の列へ付け替える', () => {
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

        expect(result[0].startTime.stationId).toBe(
            routeDiagramOutsideBetweenId('瀬谷'),
        );
        expect(result[0].startHiddenStationName).toBe('二俣川');
        expect(result[0].endTime.stationId).toBe('横浜');
    });

    it('ひと続きに隠れた駅は、まとまりごとに同じ「図外」の列へ付け替える（区間の途中で割らない）', () => {
        const hidden = new Set(['相模大塚', '大和', '瀬谷', '二俣川']);
        const visibleStations = allStations.filter(
            (s) => !hidden.has(s.stationName),
        );
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '相模大塚', '二俣川'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].startTime.stationId).toBe(
            routeDiagramOutsideBetweenId('かしわ台'),
        );
        expect(result[0].endTime.stationId).toBe(
            routeDiagramOutsideBetweenId('かしわ台'),
        );
    });

    it('離れた 2 つのまとまりは、それぞれの位置の別の「図外」の列へ付け替える', () => {
        const hidden = new Set(['かしわ台', '二俣川']);
        const visibleStations = allStations.filter(
            (s) => !hidden.has(s.stationName),
        );
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', 'かしわ台', '二俣川'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].startTime.stationId).toBe(
            routeDiagramOutsideBetweenId('海老名'),
        );
        expect(result[0].endTime.stationId).toBe(
            routeDiagramOutsideBetweenId('瀬谷'),
        );
    });

    it('同じ隠れた駅に着いて出る列車は、同じ「図外」の列で折り返す', () => {
        const visibleStations = allStations.filter(
            (s) => s.stationName !== '二俣川',
        );
        const trips: TripOperationListDetailsDto[] = [
            makeTrip('t1', '海老名', '二俣川'),
            makeTrip('t2', '二俣川', '海老名'),
        ];

        const result = reconnectTripOperationLists(
            trips,
            allStations,
            visibleStations,
        );

        expect(result[0].endTime.stationId).toBe(
            routeDiagramOutsideBetweenId('瀬谷'),
        );
        expect(result[1].startTime.stationId).toBe(
            routeDiagramOutsideBetweenId('瀬谷'),
        );
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

    describe('withOutsideStationColumns', () => {
        it('「図外」の列を使う行路があるときだけ、その側の端に列を足す', () => {
            const visibleStations = allStations.slice(2, 6);
            const reconnected = reconnectTripOperationLists(
                [makeTrip('t1', '海老名', '大和')],
                allStations,
                visibleStations,
            );

            const result = withOutsideStationColumns(
                visibleStations,
                reconnected,
            );

            expect(result.map((s) => s.stationId)).toEqual([
                ROUTE_DIAGRAM_OUTSIDE_LEFT_ID,
                '相模大塚',
                '大和',
                '瀬谷',
                '二俣川',
            ]);
            expect(result[0].stationName).toBe('図外');
        });

        it('間の「図外」の列は、隠れたまとまりの位置（直前の表示駅の後）に足す', () => {
            const visibleStations = allStations.filter(
                (s) => s.stationName !== '二俣川',
            );
            const reconnected = reconnectTripOperationLists(
                [makeTrip('t1', '二俣川', '横浜')],
                allStations,
                visibleStations,
            );

            const result = withOutsideStationColumns(
                visibleStations,
                reconnected,
            );

            expect(result.map((s) => s.stationId)).toEqual([
                '海老名',
                'かしわ台',
                '相模大塚',
                '大和',
                '瀬谷',
                routeDiagramOutsideBetweenId('瀬谷'),
                '西谷',
                '横浜',
            ]);
            expect(result[5].stationName).toBe('図外');
            expect(isRouteDiagramOutsideStationId(result[5].stationId)).toBe(
                true,
            );
        });

        it('図の外に端が無ければ列を足さない', () => {
            const reconnected = reconnectTripOperationLists(
                [makeTrip('t1', '海老名', '横浜')],
                allStations,
                allStations,
            );

            expect(withOutsideStationColumns(allStations, reconnected)).toEqual(
                allStations,
            );
        });
    });
});
