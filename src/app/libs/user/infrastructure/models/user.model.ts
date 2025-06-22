import { Expose } from 'class-transformer';

export class UserModel {
    @Expose()
    userId: string;

    @Expose()
    username: string;

    @Expose()
    password: string;

    @Expose()
    displayName: string;

    @Expose()
    role: string;

    @Expose()
    createdAt: string;

    @Expose()
    updatedAt: string;
}
