import { TripOperationListDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder';
import { TripOperationListModel } from 'src/app/libs/trip/infrastructure/models/trip-operation-list.model';
import { TripOperationListWithTimesDto } from 'src/app/libs/trip/usecase/dtos/trip-operation-list-details.dto';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationDtoBuilder } from './operation.dto.builder';

// 現在位置の取得は trip・startTime・endTime を必ず付けて返す
const buildSegment = (model: TripOperationListModel) =>
    TripOperationListDtoBuilder.buildFromModel(
        model,
    ) as TripOperationListWithTimesDto;

export const OperationCurrentPositionDtoBuilder = {
    buildFromModel: ({
        operation,
        prev,
        current,
        next,
        position,
        ...rest
    }: OperationCurrentPositionModel): OperationCurrentPositionDto => ({
        ...rest,
        operation: operation && OperationDtoBuilder.buildFromModel(operation),
        prev: prev && buildSegment(prev),
        current: current && buildSegment(current),
        next: next && buildSegment(next),
        position: position && {
            prev: position.prev && buildSegment(position.prev),
            current: position.current && buildSegment(position.current),
            next: position.next && buildSegment(position.next),
        },
    }),
    buildFromModels: (
        models: OperationCurrentPositionModel[],
    ): OperationCurrentPositionDto[] =>
        models.map((model) =>
            OperationCurrentPositionDtoBuilder.buildFromModel(model),
        ),
} as const;
