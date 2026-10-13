import { TripOperationListDtoBuilder } from 'src/app/libs/trip/infrastructure/builders/trip-operation-list.dto.builder';
import { OperationCurrentPositionDto } from '../../usecase/dtos/operation-current-position.dto';
import { OperationCurrentPositionModel } from '../models/operation-current-position.model';
import { OperationDtoBuilder } from './operation.dto.builder';

const buildSegment = TripOperationListDtoBuilder.buildFromModel;

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
