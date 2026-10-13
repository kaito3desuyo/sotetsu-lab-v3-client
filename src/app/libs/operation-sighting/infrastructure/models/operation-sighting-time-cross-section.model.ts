import { Expose, Type } from 'class-transformer';
import { OperationSightingModel } from './operation-sighting.model';

export class OperationSightingTimeCrossSectionModel {
    @Expose()
    @Type(() => OperationSightingModel)
    latestSighting: OperationSightingModel;

    @Expose()
    @Type(() => OperationSightingModel)
    expectedSighting: Omit<
        Partial<OperationSightingModel>,
        'operation' | 'formation'
    > & {
        formation?: Partial<OperationSightingModel['formation']>;
        operation?: Partial<OperationSightingModel['operation']>;
    };

    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃は null */
    @Expose()
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}
