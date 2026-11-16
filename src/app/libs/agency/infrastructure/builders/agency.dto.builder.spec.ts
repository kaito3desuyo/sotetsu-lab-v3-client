import { AgencyModel } from '../models/agency.model';
import { AgencyDtoBuilder } from './agency.dto.builder';

describe('AgencyDtoBuilder', () => {
    it('id を agencyId にし、ほかの項目はそのまま写す', () => {
        const dto = AgencyDtoBuilder.buildFromModel({
            id: 'a-1',
            agencyName: '相鉄',
        } as AgencyModel);

        expect(dto).toEqual({ agencyId: 'a-1', agencyName: '相鉄' });
        expect(dto).not.toHaveProperty('id');
    });
});
