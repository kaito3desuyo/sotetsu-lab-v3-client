import { FormationDtoBuilder } from 'src/app/libs/formation/infrastructure/builders/formation.dto.builder';
import { OperationDtoBuilder } from 'src/app/libs/operation/infrastructure/builders/operation.dto.builder';
import { InvalidateManyOperationSightingsResultDto } from '../../usecase/dtos/invalidate-many-operation-sightings-result.dto';
import { OperationSightingDetailsDto } from '../../usecase/dtos/operation-sighting-details.dto';
import { OperationSightingRecentDto } from '../../usecase/dtos/operation-sighting-recent.dto';
import { OperationSightingSummaryDto } from '../../usecase/dtos/operation-sighting-summary.dto';
import { InvalidateManyOperationSightingsResultModel } from '../models/invalidate-many-operation-sightings-result.model';
import {
    OperationSightingRecentModel,
    OperationSightingSummaryModel,
} from '../models/operation-sighting-summary.model';
import { OperationSightingModel } from '../models/operation-sighting.model';

export const OperationSightingDtoBuilder = {
    buildFromModel: ({
        id,
        operation,
        formation,
        ...rest
    }: OperationSightingModel): OperationSightingDetailsDto => ({
        ...rest,
        operationSightingId: id,
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        formation: formation && FormationDtoBuilder.buildFromModel(formation),
    }),
    buildFromModels: (
        models: OperationSightingModel[],
    ): OperationSightingDetailsDto[] =>
        models.map((model) =>
            OperationSightingDtoBuilder.buildFromModel(model),
        ),

    /** 投稿者ごと・新着・まとめての無効化の応答は client の DTO と同じ名前なので、付け替えは無く、形を写すだけ */
    buildSummaryFromModel: (
        model: OperationSightingSummaryModel,
    ): OperationSightingSummaryDto => ({
        ...model,
        invalidatedBy: model.invalidatedBy && { ...model.invalidatedBy },
    }),
    buildSummariesFromModels: (
        models: OperationSightingSummaryModel[],
    ): OperationSightingSummaryDto[] =>
        models.map((m) => OperationSightingDtoBuilder.buildSummaryFromModel(m)),
    buildRecentsFromModels: (
        models: OperationSightingRecentModel[],
    ): OperationSightingRecentDto[] =>
        models.map((m) => ({
            ...OperationSightingDtoBuilder.buildSummaryFromModel(m),
            author: m.author && { ...m.author },
        })),
    buildInvalidateManyResultFromModel: (
        model: InvalidateManyOperationSightingsResultModel,
    ): InvalidateManyOperationSightingsResultDto => ({
        invalidated: [...model.invalidated],
        skipped: model.skipped.map((s) => ({ ...s })),
        failed: model.failed && { ...model.failed },
        pending: [...(model.pending ?? [])],
    }),
} as const;
