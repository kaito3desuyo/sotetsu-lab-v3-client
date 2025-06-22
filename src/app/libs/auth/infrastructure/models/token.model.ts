import { Expose } from 'class-transformer';

export class TokenModel {
    @Expose()
    accessToken: string;

    @Expose()
    tokenType: string;

    @Expose()
    expiresAt: number;
}
