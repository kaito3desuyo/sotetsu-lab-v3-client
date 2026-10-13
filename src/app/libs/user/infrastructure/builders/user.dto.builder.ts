import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserModel } from '../models/user.model';

export const UserDtoBuilder = {
    /** 応答に password が混ざっても DTO に入れないよう、項目を並べて写す */
    buildFromModel: (model: UserModel): UserDetailsDto => ({
        userId: model.userId,
        username: model.username,
        displayName: model.displayName,
        role: model.role,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
    }),
    buildFromModels: (models: UserModel[]): UserDetailsDto[] =>
        models.map((model) => UserDtoBuilder.buildFromModel(model)),
} as const;
