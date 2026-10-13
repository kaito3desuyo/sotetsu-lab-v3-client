import { StopDtoBuilder } from './stop.dto.builder';

describe('StopDtoBuilder', () => {
    it('id を stopId にし、ほかの項目はそのまま写す', () => {
        const dto = StopDtoBuilder.buildFromModel({
            id: 'stop-1',
            stationId: 'st-1',
            stopName: '1番線',
            stopDescription: '',
            stopLatlng: '',
            zoneId: '',
            createdAt: 'c',
            updatedAt: 'u',
        });

        expect(dto).toEqual({
            stopId: 'stop-1',
            stationId: 'st-1',
            stopName: '1番線',
            stopDescription: '',
            stopLatlng: '',
            zoneId: '',
            createdAt: 'c',
            updatedAt: 'u',
        });
        expect(dto).not.toHaveProperty('id');
    });
});
