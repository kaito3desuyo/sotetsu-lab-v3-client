import { Expose } from 'class-transformer';

export class TokenDetailsDto {
    @Expose()
    accessToken: string;

    @Expose()
    tokenType: string;

    @Expose()
    expiresAt: number;
}
