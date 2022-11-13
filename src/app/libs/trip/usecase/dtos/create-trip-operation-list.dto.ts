import { Exclude, Expose } from 'class-transformer';

export class CreateTripOperationListDto {
    @Exclude()
    tripOperationListId: undefined;

    @Exclude()
    tripId: undefined;

    @Expose()
    operationId: string;

    @Expose()
    startStationId: string;

    @Expose()
    endStationId: string;

    @Exclude()
    startTimeId: undefined;

    @Exclude()
    endTimeId: undefined;
}
