import { Expose } from 'class-transformer';

export class LoginDto {
    @Expose()
    username: string;

    @Expose()
    password: string;
}
