import { RouteStationsDtoBuilder } from './route-stations.dto.builder';

describe('RouteStationsDtoBuilder', () => {
    it('路線と駅の id を付け替え、駅の並び順と駅番号を残す', () => {
        const dto = RouteStationsDtoBuilder.buildFromModel({
            route: { id: 'r-1', routeName: '本線' },
            stations: [
                {
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
                    stationSequence: 1,
                    stationNumbering: 'SO01',
                },
            ],
        });

        expect(dto.route).toEqual({ routeId: 'r-1', routeName: '本線' });
        expect(dto.stations[0]).toMatchObject({
            stationId: 'st-1',
            stationSequence: 1,
            stationNumbering: 'SO01',
        });
        expect(dto.stations[0]).not.toHaveProperty('id');
    });
});
