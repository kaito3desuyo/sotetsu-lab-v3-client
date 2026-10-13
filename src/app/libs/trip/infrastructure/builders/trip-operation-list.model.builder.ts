import { CreateTripOperationListDto } from '../../usecase/dtos/create-trip-operation-list.dto';
import { ReplaceTripOperationListDto } from '../../usecase/dtos/replace-trip-operation-list.dto';

export const TripOperationListModelBuilder = {
    buildFromCreateDto: (dto: CreateTripOperationListDto) => ({
        operationId: dto.operationId,
        startStationId: dto.startStationId,
        endStationId: dto.endStationId,
        nextTripOperationListId: dto.nextTripOperationListId,
    }),
    /** 今の本文に合わせ、区間の id はまだ送らない（不具合。次の fix コミットで直す） */
    buildFromReplaceDto: (dto: ReplaceTripOperationListDto) => ({
        ...TripOperationListModelBuilder.buildFromCreateDto(dto),
    }),
} as const;
