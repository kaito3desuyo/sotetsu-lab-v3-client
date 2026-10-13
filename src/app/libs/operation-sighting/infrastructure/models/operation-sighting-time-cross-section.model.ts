import { OperationSightingModel } from './operation-sighting.model';

export interface OperationSightingTimeCrossSectionModel {
    latestSighting: OperationSightingModel;
    expectedSighting: Omit<
        Partial<OperationSightingModel>,
        'operation' | 'formation'
    > & {
        formation?: Partial<OperationSightingModel['formation']>;
        operation?: Partial<OperationSightingModel['operation']>;
    };
    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃は null */
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}
