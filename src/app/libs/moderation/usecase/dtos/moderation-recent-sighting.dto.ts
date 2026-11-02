import { ModerationSightingDto } from './moderation-sighting.dto';

export interface ModerationRecentSightingDto extends ModerationSightingDto {
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
