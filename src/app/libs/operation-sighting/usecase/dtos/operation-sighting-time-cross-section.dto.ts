import { Expose, Type } from 'class-transformer';
import { OperationSightingDetailsDto } from './operation-sighting-details.dto';

export class OperationSightingTimeCrossSectionDto {
    @Expose()
    @Type(() => OperationSightingDetailsDto)
    latestSighting: OperationSightingDetailsDto;

    @Expose()
    @Type(() => OperationSightingDetailsDto)
    expectedSighting: Omit<
        Partial<OperationSightingDetailsDto>,
        'operation' | 'formation'
    > & {
        operation?: Partial<OperationSightingDetailsDto['operation']>;
        formation?: Partial<OperationSightingDetailsDto['formation']>;
    };

    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃は null */
    @Expose()
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}
