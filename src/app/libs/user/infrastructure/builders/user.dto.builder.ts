import { MySummaryDto } from '../../usecase/dtos/my-summary.dto';
import { UserAccessTraceDto } from '../../usecase/dtos/user-access-trace.dto';
import { UserDetailsDto } from '../../usecase/dtos/user-details.dto';
import { UserSummaryDto } from '../../usecase/dtos/user-summary.dto';
import { MySummaryModel } from '../models/my-summary.model';
import { UserAccessTraceModel } from '../models/user-access-trace.model';
import { UserSummaryModel } from '../models/user-summary.model';
import { UserModel } from '../models/user.model';

export const UserDtoBuilder = {
    /** 応答に password が混ざっても DTO に入れないよう、項目を並べて写す */
    buildFromModel: (model: UserModel): UserDetailsDto => ({
        userId: model.userId,
        username: model.username,
        displayName: model.displayName,
        role: model.role,
    }),
    buildFromModels: (models: UserModel[]): UserDetailsDto[] =>
        models.map((model) => UserDtoBuilder.buildFromModel(model)),

    /** api の応答は client の DTO と同じ名前なので、付け替えは無く、形を写すだけ */
    buildSummaryFromModel: (model: UserSummaryModel): UserSummaryDto => ({
        ...model,
    }),
    buildMySummaryFromModel: (model: MySummaryModel): MySummaryDto => ({
        ...model,
        corroboration: { ...model.corroboration },
    }),
    buildAccessTracesFromModels: (
        models: UserAccessTraceModel[],
    ): UserAccessTraceDto[] =>
        models.map((m) => ({
            ...m,
            userAgents: [...m.userAgents],
            otherAccounts: m.otherAccounts.map((a) => ({ ...a })),
        })),
} as const;
