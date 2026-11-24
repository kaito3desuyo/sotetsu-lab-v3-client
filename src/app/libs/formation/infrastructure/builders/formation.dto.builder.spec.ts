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

    it('号車と車両の改造の記録を DTO の項目だけにして渡す', () => {
        const dto = FormationDtoBuilder.buildFromModel({
            id: 'f-1',
            vehicleFormations: [
                {
                    carNumber: 2,
                    vehicle: {
                        vehicleNumber: '7710',
                        modifications: [
                            {
                                id: 'm-1',
                                vehicleId: 'v-1',
                                modifiedOn: null,
                                kind: 'livery',
                                value: '7000',
                                description: null,
                                createdAt: 'c',
                                updatedAt: 'u',
                            },
                        ],
                    },
                },
                { carNumber: 1 },
            ],
        } as FormationModel);

        expect(dto.vehicleFormations).toEqual([
            {
                carNumber: 2,
                vehicle: {
                    vehicleNumber: '7710',
                    modifications: [
                        {
                            modifiedOn: null,
                            kind: 'livery',
                            value: '7000',
                            description: null,
                        },
                    ],
                },
            },
            { carNumber: 1, vehicle: undefined },
        ]);
    });

    it('api が省いた NULL の項目（include で取った応答）は null にそろえる', () => {
        const dto = FormationDtoBuilder.buildFromModel({
            id: 'f-1',
            vehicleFormations: [
                {
                    carNumber: 1,
                    vehicle: {
                        vehicleNumber: '9701',
                        modifications: [
                            {
                                id: 'm-1',
                                vehicleId: 'v-1',
                                kind: 'renewal',
                                createdAt: 'c',
                                updatedAt: 'u',
                            },
                        ],
                    },
                },
            ],
        } as FormationModel);

        expect(dto.vehicleFormations?.[0].vehicle?.modifications).toEqual([
            {
                modifiedOn: null,
                kind: 'renewal',
                value: null,
                description: null,
            },
        ]);
    });
});
