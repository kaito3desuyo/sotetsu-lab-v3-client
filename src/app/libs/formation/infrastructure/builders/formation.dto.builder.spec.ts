import { FormationDtoBuilder } from './formation.dto.builder';

describe('FormationDtoBuilder', () => {
    it('id を formationId に、入れ子の会社の id を agencyId にする', () => {
        const dto = FormationDtoBuilder.buildFromModel({
            id: 'f-1',
            formationNumber: '10701',
            agency: { id: 'a-1', agencyName: '相鉄' },
        });

        expect(dto).toEqual({
            formationId: 'f-1',
            formationNumber: '10701',
            agency: { agencyId: 'a-1', agencyName: '相鉄' },
        });
        expect(dto).not.toHaveProperty('id');
    });

    it('buildFromModels は 1 件ずつ変換する', () => {
        expect(
            FormationDtoBuilder.buildFromModels([{ id: 'f-1' }, { id: 'f-2' }]),
        ).toEqual([{ formationId: 'f-1' }, { formationId: 'f-2' }]);
    });
});
