export interface UserAccessTraceDto {
    /** IPv6 は /64 の網 */
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
