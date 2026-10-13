import { CreateTripOperationListDto } from '../../usecase/dtos/create-trip-operation-list.dto';
import { ReplaceTripOperationListDto } from '../../usecase/dtos/replace-trip-operation-list.dto';

export const TripOperationListModelBuilder = {
    buildFromCreateDto: (dto: CreateTripOperationListDto) => ({
        operationId: dto.operationId,
        startStationId: dto.startStationId,
        endStationId: dto.endStationId,
        nextTripOperationListId: dto.nextTripOperationListId,
    }),
    /** 既存の区間は id を送る。無いと API が区間を作り直し、ほかの区間からのつながりが切れる */
    buildFromReplaceDto: (dto: ReplaceTripOperationListDto) => ({
        id: dto.id,
        ...TripOperationListModelBuilder.buildFromCreateDto(dto),
    }),
} as const;
