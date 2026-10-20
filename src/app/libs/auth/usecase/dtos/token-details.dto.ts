export interface TokenDetailsDto {
    accessToken: string;

    tokenType: string;

    expiresAt: number;
}

/** ゲスト（未ログイン）は backend が 204 を返すので null */
export type TokenResult = TokenDetailsDto | null;
