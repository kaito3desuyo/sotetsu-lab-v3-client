import { OperationSightingDetailsDto } from './operation-sighting-details.dto';

export interface OperationSightingTimeCrossSectionDto {
    latestSighting: OperationSightingDetailsDto | null;

    expectedSighting:
        | (Omit<
              Partial<OperationSightingDetailsDto>,
              'operation' | 'formation'
          > & {
              operation?: Partial<
                  OperationSightingDetailsDto['operation']
              > | null;
              formation?: Partial<
                  OperationSightingDetailsDto['formation']
              > | null;
          })
        | null;

    /** 引き継いだ目撃のとき、目撃されたときの運用。直接の目撃は null */
    sightedAsOperation?: {
        operationId: string;
        operationNumber: string;
    } | null;
}
