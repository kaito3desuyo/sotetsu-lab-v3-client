import { ServiceDtoBuilder } from './service.dto.builder';

describe('ServiceDtoBuilder', () => {
    it('id を serviceId にし、ほかの項目はそのまま写す', () => {
        const dto = ServiceDtoBuilder.buildFromModel({
            id: 's-1',
            serviceName: '相鉄',
            serviceDescription: '相鉄線',
            createdAt: 'c',
            updatedAt: 'u',
        });

        expect(dto).toEqual({
            serviceId: 's-1',
            serviceName: '相鉄',
            serviceDescription: '相鉄線',
            createdAt: 'c',
            updatedAt: 'u',
        });
        expect(dto).not.toHaveProperty('id');
    });
});
