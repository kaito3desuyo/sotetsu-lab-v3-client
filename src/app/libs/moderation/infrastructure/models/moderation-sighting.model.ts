export interface ModerationSightingModel {
    operationSightingId: string;
    sightingTime: string;
    createdAt: string;
    operationNumber: string;
    formationNumber: string;
    invalidated: boolean;
    invalidatedBy: { userId: string; username: string } | null;
}

export interface ModerationRecentSightingModel extends ModerationSightingModel {
    author: {
        userId: string;
        username: string;
        displayName: string;
        role: string;
        newAccount: boolean;
        burst: boolean;
    } | null;
}
