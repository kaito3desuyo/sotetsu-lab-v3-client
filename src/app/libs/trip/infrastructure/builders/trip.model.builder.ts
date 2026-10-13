import { CreateTripDto } from '../../usecase/dtos/create-trip.dto';
import { ReplaceTripDto } from '../../usecase/dtos/replace-trip.dto';
import { TimeModelBuilder } from './time.model.builder';
import { TripOperationListModelBuilder } from './trip-operation-list.model.builder';

/** 列車の項目（ID と入れ子を除く）。登録と更新で同じ */
const buildTripFields = (dto: CreateTripDto | ReplaceTripDto) => ({
    serviceId: dto.serviceId,
    tripNumber: dto.tripNumber,
    tripClassId: dto.tripClassId,
    tripName: dto.tripName,
    tripDirection: dto.tripDirection,
    depotIn: dto.depotIn,
    depotOut: dto.depotOut,
    calendarId: dto.calendarId,
    extraCalendarId: dto.extraCalendarId,
});

export const TripModelBuilder = {
    buildFromCreateDto: (dto: CreateTripDto) => ({
        ...buildTripFields(dto),
        times: dto.times.map((time) =>
            TimeModelBuilder.buildFromCreateDto(time),
        ),
        tripOperationLists: dto.tripOperationLists.map((o) =>
            TripOperationListModelBuilder.buildFromCreateDto(o),
        ),
    }),
    buildFromReplaceDto: (dto: ReplaceTripDto) => ({
        id: dto.tripId,
        ...buildTripFields(dto),
        times: dto.times.map((time) =>
            TimeModelBuilder.buildFromReplaceDto(time),
        ),
        tripOperationLists: dto.tripOperationLists.map((o) =>
            TripOperationListModelBuilder.buildFromReplaceDto(o),
        ),
    }),
} as const;
