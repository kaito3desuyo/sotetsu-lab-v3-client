import { Expose } from 'class-transformer';

export class LoginModel {
    @Expose()
    username: string;

    @Expose()
    password: string;
}
