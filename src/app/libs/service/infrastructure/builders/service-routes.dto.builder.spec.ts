import { ServiceRoutesDtoBuilder } from './service-routes.dto.builder';

describe('ServiceRoutesDtoBuilder', () => {
    it('運行系統と路線の id を付け替え、系統の中の順と端の駅を残す', () => {
        const dto = ServiceRoutesDtoBuilder.buildFromModel({
            service: {
                id: 's-1',
                serviceName: '相鉄',
                serviceDescription: '',
                createdAt: '',
                updatedAt: '',
            },
            routes: [
                {
                    id: 'r-1',
                    routeName: '本線',
                    sequence: 1,
                    startRouteStationListId: 'rsl-a',
                    endRouteStationListId: 'rsl-b',
                },
            ],
        });

        expect(dto.service.serviceId).toBe('s-1');
        expect(dto.routes[0]).toMatchObject({
            routeId: 'r-1',
            sequence: 1,
            startRouteStationListId: 'rsl-a',
            endRouteStationListId: 'rsl-b',
        });
    });
});
