import { Expose } from 'class-transformer';

export class RegisterUserDto {
    @Expose()
    username: string;

    @Expose()
    password: string;
}
