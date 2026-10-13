import { LoginDto } from '../../usecase/dtos/login.dto';
import { LoginModel } from '../models/login.model';

export const LoginModelBuilder = {
    buildFromLoginDto: (dto: LoginDto): LoginModel => ({
        username: dto.username,
        password: dto.password,
    }),
} as const;
