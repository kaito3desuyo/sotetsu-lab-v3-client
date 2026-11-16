import { AgencyModel } from 'src/app/libs/agency/infrastructure/models/agency.model';
import { FormationModel } from '../models/formation.model';
import { FormationDtoBuilder } from './formation.dto.builder';

describe('FormationDtoBuilder', () => {
    it('id を formationId に、入れ子の会社の id を agencyId にする', () => {
        const dto = FormationDtoBuilder.buildFromModel({
            id: 'f-1',
            formationNumber: '10701',
            agency: { id: 'a-1', agencyName: '相鉄' } as AgencyModel,
        } as FormationModel);

        expect(dto).toEqual({
            formationId: 'f-1',
            formationNumber: '10701',
            agency: { agencyId: 'a-1', agencyName: '相鉄' },
        });
        expect(dto).not.toHaveProperty('id');
    });

    it('buildFromModels は 1 件ずつ変換する', () => {
        expect(
            FormationDtoBuilder.buildFromModels([
                { id: 'f-1' } as FormationModel,
                { id: 'f-2' } as FormationModel,
            ]),
        ).toEqual([{ formationId: 'f-1' }, { formationId: 'f-2' }]);
    });
});
