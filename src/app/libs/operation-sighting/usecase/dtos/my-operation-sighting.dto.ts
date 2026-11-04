import { OperationSightingSummaryDto } from './operation-sighting-summary.dto';

/** 同じ日に他の人が同じ編成を同じ運用で見たか（invalidated は無効にされた目撃） */
export type SightingCorroboration =
    'corroborated' | 'conflicting' | 'uncorroborated' | 'invalidated';

export interface MyOperationSightingDto extends OperationSightingSummaryDto {
    corroboration: SightingCorroboration;
}
