import { firstValueFrom } from 'rxjs';
import { OperationRouteDiagramStore } from './operation-route-diagram.store';

const station = (stationId: string, routeIds: string[]) =>
    ({
        stationId,
        stationName: stationId,
        routeStationLists: routeIds.map((routeId) => ({
            route: { routeId, routeName: routeId },
        })),
    }) as never;

/** 本線（海老名・二俣川・横浜）といずみ野線（二俣川・湘南台）。運用は海老名→横浜だけを走る */
const stations = [
    station('ebina', ['honsen']),
    station('futamatagawa', ['honsen', 'izumino']),
    station('yokohama', ['honsen']),
    station('shonandai', ['izumino']),
];

describe('OperationRouteDiagramStore', () => {
    beforeEach(() => {
        OperationRouteDiagramStore.setStations(stations);
        OperationRouteDiagramStore.setOperationTrips({
            trips: [
                {
                    startTime: { stationId: 'ebina' },
                    endTime: { stationId: 'yokohama' },
                },
            ],
        } as never);
    });

    it('路線を何も選んでいなければ、経由する路線の駅だけを出す（経由しない路線の駅は出さない）', async () => {
        OperationRouteDiagramStore.setSelectedRouteIds([]);

        const visible = await firstValueFrom(
            OperationRouteDiagramStore.visibleStations$,
        );

        expect(visible.map((s) => s.stationId)).toEqual([
            'ebina',
            'futamatagawa',
            'yokohama',
        ]);
    });

    it('路線を選んでいればその路線の駅を出す', async () => {
        OperationRouteDiagramStore.setSelectedRouteIds(['izumino']);

        const visible = await firstValueFrom(
            OperationRouteDiagramStore.visibleStations$,
        );

        expect(visible.map((s) => s.stationId)).toEqual([
            'futamatagawa',
            'shonandai',
        ]);
    });
});
