import { OperationSightingModel } from './operation-sighting.model';

export interface OperationSightingTimeCrossSectionModel {
    latestSighting: OperationSightingModel | null;
    expectedSighting:
        | (Omit<Partial<OperationSightingModel>, 'operation' | 'formation'> & {
              formation?: Partial<OperationSightingModel['formation']> | null;
              operation?: Partial<OperationSightingModel['operation']> | null;
          })
        | null;
    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃は null */
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}
