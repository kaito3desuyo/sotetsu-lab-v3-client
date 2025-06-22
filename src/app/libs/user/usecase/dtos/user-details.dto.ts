import { Expose } from 'class-transformer';

export class UserDetailsDto {
    @Expose()
    userId: string;

    @Expose()
    username: string;

    @Expose()
    displayName: string;

    @Expose()
    role: string;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}
