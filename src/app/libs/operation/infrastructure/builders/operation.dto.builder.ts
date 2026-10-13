import { CalendarDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar.dto.builder';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export const OperationDtoBuilder = {
    buildFromModel: ({
        id,
        calendar,
        ...rest
    }: OperationModel): OperationDetailsDto => ({
        ...rest,
        operationId: id,
        calendar: calendar && CalendarDtoBuilder.buildFromModel(calendar),
    }),
    buildFromModels: (models: OperationModel[]): OperationDetailsDto[] =>
        models.map((model) => OperationDtoBuilder.buildFromModel(model)),
} as const;
