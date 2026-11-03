import { OperationSightingSummaryDto } from './operation-sighting-summary.dto';

export interface OperationSightingRecentDto extends OperationSightingSummaryDto {
    /** ゲスト（投稿者の無い目撃）は null */
    author: {
        userId: string;
        username: string;
        displayName: string;
        role: string;
        newAccount: boolean;
        burst: boolean;
    } | null;
}
