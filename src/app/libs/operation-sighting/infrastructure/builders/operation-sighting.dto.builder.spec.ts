import { FormationModel } from 'src/app/libs/formation/infrastructure/models/formation.model';
import { OperationModel } from 'src/app/libs/operation/infrastructure/models/operation.model';
import { OperationSightingModel } from '../models/operation-sighting.model';
import { OperationSightingDtoBuilder } from './operation-sighting.dto.builder';

describe('OperationSightingDtoBuilder', () => {
    it('目撃・運用・編成の id を付け替え、取り消しと引き継ぎ元はそのまま写す', () => {
        const dto = OperationSightingDtoBuilder.buildFromModel({
            id: 's-1',
            operationId: 'op-1',
            formationId: 'f-1',
            operation: { id: 'op-1', operationNumber: '58K' } as OperationModel,
            formation: {
                id: 'f-1',
                formationNumber: '10701',
            } as FormationModel,
            invalidation: null,
            sightedAsOperation: null,
        } as OperationSightingModel);

        expect(dto).toEqual({
            operationSightingId: 's-1',
            operationId: 'op-1',
            formationId: 'f-1',
            operation: { operationId: 'op-1', operationNumber: '58K' },
            formation: { formationId: 'f-1', formationNumber: '10701' },
            invalidation: null,
            sightedAsOperation: null,
        });
    });
});
