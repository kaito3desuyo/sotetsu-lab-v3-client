import { OperationSightingDtoBuilder } from './operation-sighting.dto.builder';

describe('OperationSightingDtoBuilder', () => {
    it('目撃・運用・編成の id を付け替え、取り消しと引き継ぎ元はそのまま写す', () => {
        const dto = OperationSightingDtoBuilder.buildFromModel({
            id: 's-1',
            operationId: 'op-1',
            formationId: 'f-1',
            operation: { id: 'op-1', operationNumber: '58K' },
            formation: { id: 'f-1', formationNumber: '10701' },
            invalidation: null,
            sightedAsOperation: null,
        });

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
