export interface OperationSightingSummaryModel {
    operationSightingId: string;
    sightingTime: string;
    createdAt: string;
    operationNumber: string;
    formationNumber: string;
    invalidated: boolean;
    invalidatedBy: { userId: string; username: string } | null;
}

export interface OperationSightingRecentModel extends OperationSightingSummaryModel {
    author: {
        userId: string;
        username: string;
        displayName: string;
        role: string;
        newAccount: boolean;
        burst: boolean;
    } | null;
}
