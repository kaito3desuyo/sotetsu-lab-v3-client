export interface ModerationTraceModel {
    ip: string;
    userAgents: string[];
    count: number;
    lastSeenAt: string;
    accountCount: number;
    shared: boolean;
    otherAccounts: {
        userId: string;
        username: string;
        role: string;
        banned: boolean;
    }[];
}
