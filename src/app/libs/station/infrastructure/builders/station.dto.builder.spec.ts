import { StationModel } from '../models/station.model';
import { StationDtoBuilder } from './station.dto.builder';

const station = (o: Partial<StationModel>): StationModel => ({
    id: 'st-1',
    stationName: '横浜',
    stationSubname: '',
    stationType: 0,
    stationDescription: '',
    stationLatlng: '',
    stationUrl: '',
    wheelchairBoarding: false,
    createdAt: '',
    updatedAt: '',
    ...o,
});

describe('StationDtoBuilder', () => {
    it('id と、路線の駅・のりば・時刻の入れ子の id を付け替える', () => {
        const dto = StationDtoBuilder.buildFromModel(
            station({
                routeStationLists: [
                    {
                        id: 'rsl-1',
                        routeId: 'r-1',
                        route: { id: 'r-1', routeName: '本線' },
                    },
                ],
                stops: [
                    {
                        id: 'stop-1',
                        stationId: 'st-1',
                        stopName: '1番線',
                        stopDescription: '',
                        stopLatlng: '',
                        zoneId: '',
                        createdAt: '',
                        updatedAt: '',
                    },
                ],
                times: [{ id: 'time-1', stationId: 'st-1' }],
            }),
        );

        expect(dto.stationId).toBe('st-1');
        expect(dto.routeStationLists).toEqual([
            {
                routeStationListId: 'rsl-1',
                routeId: 'r-1',
                route: { routeId: 'r-1', routeName: '本線' },
            },
        ]);
        expect(dto.stops[0].stopId).toBe('stop-1');
        expect(dto.times[0].timeId).toBe('time-1');
    });

    it('入れ子が無いときは undefined のまま', () => {
        const dto = StationDtoBuilder.buildFromModel(station({}));

        expect(dto.routeStationLists).toBeUndefined();
        expect(dto.stops).toBeUndefined();
        expect(dto.times).toBeUndefined();
    });
});
