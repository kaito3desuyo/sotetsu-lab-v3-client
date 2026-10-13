import { RouteDtoBuilder } from './route.dto.builder';

describe('RouteDtoBuilder', () => {
    it('id を routeId にし、入れ子の路線の駅の id も付け替える', () => {
        const dto = RouteDtoBuilder.buildFromModel({
            id: 'r-1',
            routeName: '本線',
            routeStationLists: [{ id: 'rsl-1' }],
        });

        expect(dto.routeId).toBe('r-1');
        expect(dto.routeName).toBe('本線');
        expect(dto).not.toHaveProperty('id');
        expect(dto.routeStationLists[0].routeStationListId).toBe('rsl-1');
    });
});
