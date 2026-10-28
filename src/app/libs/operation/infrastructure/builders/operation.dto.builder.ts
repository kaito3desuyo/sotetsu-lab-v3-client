import { AllKeys } from 'src/app/core/utils/all-keys';
import { CalendarDtoBuilder } from 'src/app/libs/calendar/infrastructure/builders/calendar.dto.builder';
import { OperationDetailsDto } from '../../usecase/dtos/operation-details.dto';
import { OperationModel } from '../models/operation.model';

export const OperationDtoBuilder = {
    buildFromModel: (model: OperationModel): OperationDetailsDto => {
        const dto: AllKeys<OperationDetailsDto> = {
            operationId: model.id,
            calendarId: model.calendarId,
            operationNumber: model.operationNumber,
            createdAt: model.createdAt,
            updatedAt: model.updatedAt,
            calendar:
                model.calendar &&
                CalendarDtoBuilder.buildFromModel(model.calendar),
        };
        return dto;
    },
    buildFromModels: (models: OperationModel[]): OperationDetailsDto[] =>
        models.map((model) => OperationDtoBuilder.buildFromModel(model)),
} as const;
