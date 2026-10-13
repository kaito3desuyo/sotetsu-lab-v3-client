import { RegisterUserDto } from '../../usecase/dtos/register-user.dto';
import { UserModel } from '../models/user.model';

export const UserModelBuilder = {
    buildFromRegisterUserDto: (
        dto: RegisterUserDto,
    ): Pick<UserModel, 'username' | 'password'> => ({
        username: dto.username,
        password: dto.password,
    }),
} as const;
