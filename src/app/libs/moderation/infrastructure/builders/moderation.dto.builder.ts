import { ModerationBulkInvalidateResultDto } from '../../usecase/dtos/moderation-bulk-invalidate-result.dto';
import { ModerationRecentSightingDto } from '../../usecase/dtos/moderation-recent-sighting.dto';
import { ModerationSightingDto } from '../../usecase/dtos/moderation-sighting.dto';
import { ModerationTraceDto } from '../../usecase/dtos/moderation-trace.dto';
import { ModerationUserSummaryDto } from '../../usecase/dtos/moderation-user-summary.dto';
import { ModerationBulkInvalidateResultModel } from '../models/moderation-bulk-invalidate-result.model';
import {
    ModerationRecentSightingModel,
    ModerationSightingModel,
} from '../models/moderation-sighting.model';
import { ModerationTraceModel } from '../models/moderation-trace.model';
import { ModerationUserSummaryModel } from '../models/moderation-user-summary.model';

/** api の応答は client の DTO と同じ名前なので、付け替えは無く、形を写すだけ */
export const ModerationDtoBuilder = {
    buildUserSummary: (
        model: ModerationUserSummaryModel,
    ): ModerationUserSummaryDto => ({ ...model }),

    buildSighting: (model: ModerationSightingModel): ModerationSightingDto => ({
        ...model,
        invalidatedBy: model.invalidatedBy && { ...model.invalidatedBy },
    }),

    buildSightings: (
        models: ModerationSightingModel[],
    ): ModerationSightingDto[] =>
        models.map((m) => ModerationDtoBuilder.buildSighting(m)),

    buildRecentSightings: (
        models: ModerationRecentSightingModel[],
    ): ModerationRecentSightingDto[] =>
        models.map((m) => ({
            ...ModerationDtoBuilder.buildSighting(m),
            author: m.author && { ...m.author },
        })),

    buildTraces: (models: ModerationTraceModel[]): ModerationTraceDto[] =>
        models.map((m) => ({
            ...m,
            userAgents: [...m.userAgents],
            otherAccounts: m.otherAccounts.map((a) => ({ ...a })),
        })),

    buildBulkInvalidateResult: (
        model: ModerationBulkInvalidateResultModel,
    ): ModerationBulkInvalidateResultDto => ({
        invalidated: [...model.invalidated],
        skipped: model.skipped.map((s) => ({ ...s })),
        failed: model.failed && { ...model.failed },
        pending: [...(model.pending ?? [])],
    }),
} as const;
