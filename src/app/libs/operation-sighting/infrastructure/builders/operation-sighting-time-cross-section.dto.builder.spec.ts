import { OperationSightingTimeCrossSectionDtoBuilder } from './operation-sighting-time-cross-section.dto.builder';

describe('OperationSightingTimeCrossSectionDtoBuilder', () => {
    it('最新の目撃と、部分的な expectedSighting（id なし）を付け替える', () => {
        const dto = OperationSightingTimeCrossSectionDtoBuilder.buildFromModel({
            latestSighting: { id: 's-1', operation: { id: 'op-1' } },
            expectedSighting: {
                operation: { id: 'op-2', operationNumber: '60K' },
                formation: { id: 'f-1' },
            },
            sightedAsOperation: { operationId: 'op-1', operationNumber: '58K' },
        });

        expect(dto.latestSighting).toEqual({
            operationSightingId: 's-1',
            operation: { operationId: 'op-1' },
        });
        expect(dto.expectedSighting).toEqual({
            operationSightingId: undefined,
            operation: { operationId: 'op-2', operationNumber: '60K' },
            formation: { formationId: 'f-1' },
        });
        expect(dto.sightedAsOperation).toEqual({
            operationId: 'op-1',
            operationNumber: '58K',
        });
    });

    it('expectedSighting が無いときも落ちない', () => {
        const dto = OperationSightingTimeCrossSectionDtoBuilder.buildFromModel({
            latestSighting: { id: 's-1' },
            expectedSighting: undefined,
        });

        expect(dto.expectedSighting).toBeUndefined();
    });
});
